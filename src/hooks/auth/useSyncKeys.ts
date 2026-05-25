"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  generateKeyPair,
  exportPublicKey,
} from "@/services/encryption/ecdh";
import {
  saveKeyPair,
  hasKeyPair,
  getKeyPair,
  deleteKeyPair,
  saveLocalShare1,
  getLocalShare1,
  saveLocalMasterSecretHash,
} from "@/services/encryption/keystore";
import { updatePublicKey } from "@/actions/auth/update-public-key";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { getUserWithBackup } from "@/actions/auth/get-user-with-backup";
import { hasEncryptedData } from "@/actions/documents/check-user-encrypted-data";
import { clearDbUserCache } from "@/hooks/auth/useDbUser";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { generateShares, reconstructSecret } from "@/services/encryption/sss";
import { hashMasterSecret } from "@/services/encryption/integrity";
import {
  generateMasterSecret,
  importKeyPairFromMasterSecret,
} from "@/services/encryption/master-secret";
import {
  encodeRecoveryCode,
  hashRecoveryCode,
} from "@/services/encryption/recovery-code";
import { saveServerShare } from "@/actions/auth/save-server-share";
import { saveRecoveryHash } from "@/actions/auth/save-recovery-hash";
import { saveMasterSecretHash } from "@/actions/auth/save-master-secret-hash";
import {
  decryptPrivateKey,
} from "@/services/encryption/key-backup";
import { saveEncryptedPrivateKey } from "@/actions/auth/save-encrypted-private-key";

const SYNCED_KEY = "hp_keys_synced";

export interface RecoveryState {
  needsRecoveryCode: boolean;
  recoveryCode: string | null;
  step: "idle" | "show_recovery_code" | "needs_input" | "recovering";
}

export function useSyncKeys() {
  const { ready, authenticated, user } = usePrivy();
  const ranForRef = useRef<{ userId: string; wallet: string } | null>(null);
  const setConflict = useKeyConflictStore((s) => s.setConflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    needsRecoveryCode: false,
    recoveryCode: null,
    step: "idle",
  });

  const userId = user?.id;
  const walletAddress = user?.wallet?.address;

  // ── Helper: onboard a brand-new user with SSS(2,3) + KMS ──
  const onboardNewUser = async (uid: string) => {
    const { masterSecret, publicKeyJwk, keyPair } = await generateMasterSecret();

    // SSS(2,3) over the master secret (serialized JWK bytes)
    const shares = generateShares(masterSecret, 2, 3);
    const [share1, share2, share3] = shares;

    // Compute hashes
    const masterHash = await hashMasterSecret(masterSecret);
    const recoveryCode = encodeRecoveryCode(
      new Uint8Array(share3.split("").map((c) => c.charCodeAt(0)))
    );
    const recoveryHash = await hashRecoveryCode(recoveryCode);

    // Save share1 locally
    await saveKeyPair(uid, keyPair, {
      share1,
      masterSecretHash: masterHash,
      schemeVersion: 2,
    });

    // Send share2 to server (KMS envelope encryption) — optional
    try {
      await saveServerShare({ userId: uid, share2 });
    } catch (e) {
      console.warn("[useSyncKeys] Server share backup failed (KMS likely not configured):", e);
    }

    // Save hashes to DB
    await saveRecoveryHash({ userId: uid, recoveryCodeHash: recoveryHash });
    await saveMasterSecretHash({ userId: uid, masterSecretHash: masterHash });

    // Save public key
    await updatePublicKey({ id: uid, public_key: publicKeyJwk });

    sessionStorage.setItem(SYNCED_KEY, uid);
    clearDbUserCache();
    clearConflict();

    // Show recovery code once during onboarding
    setRecoveryState({
      needsRecoveryCode: true,
      recoveryCode,
      step: "show_recovery_code",
    });
  };

  // ── Helper: reconstruct from two shares ──
  const reconstructFromShares = async (
    shareA: string,
    shareB: string,
    expectedHash: string
  ): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string } | null> => {
    try {
      const reconstructed = reconstructSecret([shareA, shareB]);
      const reconstructedHash = await hashMasterSecret(reconstructed);
      if (reconstructedHash !== expectedHash) {
        console.error("[useSyncKeys] Master secret hash mismatch");
        return null;
      }
      return await importKeyPairFromMasterSecret(reconstructed);
    } catch (e) {
      console.error("[useSyncKeys] Reconstruction failed:", e);
      return null;
    }
  };

  // ── Helper: fetch server share2 ──
  const fetchServerShare = async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/server-share/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // userId inferred from session
      });
      if (!res.ok) return null;
      const { share } = await res.json();
      return share as string;
    } catch (e) {
      console.error("[useSyncKeys] fetchServerShare failed:", e);
      return null;
    }
  };

  useEffect(() => {
    if (!ready || !authenticated || !userId || !walletAddress) return;

    const alreadyRan = ranForRef.current;
    if (
      alreadyRan &&
      alreadyRan.userId === userId &&
      alreadyRan.wallet === walletAddress
    ) {
      return;
    }

    ranForRef.current = { userId, wallet: walletAddress };

    (async () => {
      try {
        const localExists = await hasKeyPair(userId);
        const dbPk = await getUserPublicKey(userId);
        const alreadySynced = sessionStorage.getItem(SYNCED_KEY);

        // If sessionStorage says synced but DB has no public_key, force re-sync
        if (alreadySynced === userId && dbPk) return;

        const userWithBackup = await getUserWithBackup(userId);
        const schemeVersion = userWithBackup?.scheme_version ?? 0;
        const wallet = userWithBackup?.wallet_address;

        // ── Case A: New user (no keys anywhere) ──
        if (!localExists && !dbPk && !schemeVersion) {
          await onboardNewUser(userId);
          return;
        }

        // ── Case B: IndexedDB has keys ──
        if (localExists) {
          const kp = await getKeyPair(userId);
          if (!kp) {
            ranForRef.current = null;
            return;
          }

          let localPk: string;
          try {
            localPk = await exportPublicKey(kp.publicKey!);
          } catch {
            // Local keypair corrupted → delete and re-onboard or recover
            await deleteKeyPair(userId);
            ranForRef.current = null;
            return;
          }

          if (dbPk === localPk) {
            sessionStorage.setItem(SYNCED_KEY, userId);
            return;
          }

          // DB key differs → check for data conflicts
          if (dbPk && dbPk !== localPk) {
            if (wallet) {
              const hasData = await hasEncryptedData(wallet);
              if (hasData) {
                setConflict("key_mismatch");
                return;
              }
            }
            // No data conflict → overwrite DB with local (re-onboard effectively)
            await onboardNewUser(userId);
            return;
          }

          // No DB key → save local to DB
          const pubRes = await updatePublicKey({
            id: userId,
            public_key: localPk,
          });
          if (pubRes.success) {
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
          } else {
            ranForRef.current = null;
          }
          return;
        }

        // ── Case C: IndexedDB empty, user on scheme v2 ──
        if (schemeVersion === 2) {
          // Try normal recovery: local share1 missing, need share2 from server
          // But if share1 is also gone, we need recovery code (share3)
          const localShare1 = await getLocalShare1(userId);

          if (localShare1) {
            const share2 = await fetchServerShare();
            if (!share2) {
              console.error("[useSyncKeys] Server share2 unavailable");
              setRecoveryState({
                needsRecoveryCode: true,
                recoveryCode: null,
                step: "needs_input",
              });
              return;
            }

            const result = await reconstructFromShares(
              localShare1,
              share2,
              userWithBackup?.master_secret_hash ?? ""
            );

            if (!result) {
              setRecoveryState({
                needsRecoveryCode: true,
                recoveryCode: null,
                step: "needs_input",
              });
              return;
            }

            await saveKeyPair(userId, result.keyPair, {
              share1: localShare1,
              masterSecretHash: userWithBackup?.master_secret_hash ?? undefined,
              schemeVersion: 2,
            });
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearConflict();
            return;
          }

          // No local share1 → need recovery code
          setRecoveryState({
            needsRecoveryCode: true,
            recoveryCode: null,
            step: "needs_input",
          });
          return;
        }

        // ── Case D: Legacy migration (scheme v1 or encrypted_private_key) ──
        if (schemeVersion === 1 || userWithBackup?.encrypted_private_key) {
          // Attempt legacy recovery first
          let legacyPrivJwk: JsonWebKey | null = null;
          let legacyPubJwk: JsonWebKey | null = null;

          if (userWithBackup?.encrypted_private_key && userWithBackup?.public_key) {
            const legacyPassword = walletAddress
              ? `${walletAddress.toLowerCase()}|${userId}`
              : `${userId}|${userId}`;
            const decrypted = await decryptPrivateKey(
              userWithBackup.encrypted_private_key,
              legacyPassword
            );
            if (decrypted) {
              legacyPrivJwk = JSON.parse(decrypted) as JsonWebKey;
              legacyPubJwk = JSON.parse(userWithBackup.public_key) as JsonWebKey;
            }
          }

          if (legacyPrivJwk && legacyPubJwk) {
            // Convert legacy private key JWK bytes into a "master secret" for SSS
            const encoder = new TextEncoder();
            const masterSecret = encoder.encode(JSON.stringify(legacyPrivJwk));
            const shares = generateShares(masterSecret, 2, 3);
            const [share1, share2, share3] = shares;

            const masterHash = await hashMasterSecret(masterSecret);
            const recoveryCode = encodeRecoveryCode(
              new Uint8Array(share3.split("").map((c) => c.charCodeAt(0)))
            );
            const recoveryHash = await hashRecoveryCode(recoveryCode);

            // Import keypair from legacy JWK
            const privateKey = await crypto.subtle.importKey(
              "jwk",
              legacyPrivJwk,
              { name: "ECDH", namedCurve: "P-256" },
              false,
              ["deriveKey", "deriveBits"]
            );
            const publicKey = await crypto.subtle.importKey(
              "jwk",
              legacyPubJwk,
              { name: "ECDH", namedCurve: "P-256" },
              true,
              []
            );

            await saveKeyPair(userId, { privateKey, publicKey }, {
              share1,
              masterSecretHash: masterHash,
              schemeVersion: 2,
            });

            try {
              await saveServerShare({ userId, share2 });
            } catch (e) {
              console.warn("[useSyncKeys] Legacy migration: server share backup failed (KMS not configured):", e);
            }
            await saveRecoveryHash({ userId, recoveryCodeHash: recoveryHash });
            await saveMasterSecretHash({ userId, masterSecretHash: masterHash });
            await updatePublicKey({ id: userId, public_key: JSON.stringify(legacyPubJwk) });

            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
            clearConflict();
            return;
          }

          // Legacy recovery failed → treat as missing keys
        }

        // ── Case E: No keys anywhere but data exists ──
        if (wallet) {
          const hasData = await hasEncryptedData(wallet);
          if (hasData) {
            setConflict("missing_local_keys");
            return;
          }
        }

        // ── Case F: No keys anywhere, no data → generate new ──
        await onboardNewUser(userId);
      } catch (err) {
        console.error("[useSyncKeys] Error syncing keys:", err);
        ranForRef.current = null;
      }
    })();
  }, [ready, authenticated, userId, walletAddress, setConflict, clearConflict]);

  // ── Manual recovery with recovery code ──
  const recoverWithCode = async (code: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      setRecoveryState((s) => ({ ...s, step: "recovering" }));

      const userWithBackup = await getUserWithBackup(userId);
      if (!userWithBackup?.master_secret_hash) return false;

      const share2 = await fetchServerShare();
      if (!share2) return false;

      // Decode recovery code to share3 bytes, then to hex string
      const { decodeRecoveryCode } = await import("@/services/encryption/recovery-code");
      const share3Bytes = decodeRecoveryCode(code);
      const share3 = Array.from(share3Bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await reconstructFromShares(
        share2,
        share3,
        userWithBackup.master_secret_hash
      );
      if (!result) return false;

      // Generate new share1 for this device
      const { generateShares } = await import("@/services/encryption/sss");
      const encoder = new TextEncoder();
      const masterSecret = encoder.encode(JSON.stringify(
        await crypto.subtle.exportKey("jwk", result.keyPair.privateKey)
      ));
      const newShares = generateShares(masterSecret, 2, 3);
      const newShare1 = newShares[0];

      await saveKeyPair(userId, result.keyPair, {
        share1: newShare1,
        masterSecretHash: userWithBackup.master_secret_hash,
        schemeVersion: 2,
      });

      sessionStorage.setItem(SYNCED_KEY, userId);
      clearConflict();
      setRecoveryState({
        needsRecoveryCode: false,
        recoveryCode: null,
        step: "idle",
      });
      return true;
    } catch (e) {
      console.error("[useSyncKeys] recoverWithCode failed:", e);
      setRecoveryState((s) => ({ ...s, step: "needs_input" }));
      return false;
    }
  };

  // ── Dismiss recovery code modal ──
  const dismissRecoveryCode = () => {
    setRecoveryState({
      needsRecoveryCode: false,
      recoveryCode: null,
      step: "idle",
    });
  };

  return { recoveryState, recoverWithCode, dismissRecoveryCode };
}
