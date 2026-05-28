"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
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
import { generateShares, reconstructSecret, hexToBytes } from "@/services/encryption/sss";
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
  deriveCrossDevicePassword,
  deriveAllBackupPasswords,
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/services/encryption/key-backup";
import { saveEncryptedPrivateKey } from "@/actions/auth/save-encrypted-private-key";

const SYNCED_KEY = "hp_keys_synced";

export interface RecoveryState {
  needsRecoveryCode: boolean;
  needsRegeneration: boolean;
  recoveryCode: string | null;
  step: "idle" | "show_recovery_code" | "needs_input" | "recovering";
}

export function useSyncKeys() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const t = useTranslations("keyRecovery");
  const ranForRef = useRef<{ userId: string; wallet: string } | null>(null);
  const serverShareAttemptedRef = useRef(false);
  const setConflict = useKeyConflictStore((s) => s.setConflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);
  const setIsRecovering = useKeyConflictStore((s) => s.setIsRecovering);

  // Robust gating: refs survive re-renders but NOT remounts.
  // Use sessionStorage as backup so we don't loop if PrivyTokenSync remounts.
  const alreadyProcessed = (uid: string) => {
    try {
      return sessionStorage.getItem(SYNCED_KEY) === uid;
    } catch {
      return false;
    }
  };

  // Helper: inject Privy token into server action payloads (required for withAuth)
  const withPrivyToken = async <T extends Record<string, unknown>>(data: T): Promise<T & { _privyToken?: string }> => {
    try {
      const token = await getAccessToken();
      return { ...data, ...(token ? { _privyToken: token } : {}) };
    } catch {
      return data;
    }
  };

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    needsRecoveryCode: false,
    needsRegeneration: false,
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
    const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
    const recoveryHash = await hashRecoveryCode(recoveryCode);

    // Save share1 locally
    await saveKeyPair(uid, keyPair, {
      share1,
      masterSecretHash: masterHash,
      schemeVersion: 2,
    });

    // Send share2 to server (KMS envelope encryption)
    await saveServerShare(await withPrivyToken({ userId: uid, share2 }));

    // Save hashes to DB
    await saveRecoveryHash(await withPrivyToken({ userId: uid, recoveryCodeHash: recoveryHash }));
    await saveMasterSecretHash(await withPrivyToken({ userId: uid, masterSecretHash: masterHash }));

    // Save public key
    await updatePublicKey(await withPrivyToken({ id: uid, public_key: publicKeyJwk }));

    // Backup encrypted private key for silent cross-device recovery
    try {
      const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const backupPassword = await deriveCrossDevicePassword(uid);
      const encrypted = await encryptPrivateKey(JSON.stringify(privJwk), backupPassword);
      await saveEncryptedPrivateKey(await withPrivyToken({ id: uid, encrypted_private_key: encrypted }));
    } catch (e) {
      console.warn("[useSyncKeys] onboard encrypted backup failed:", e);
    }

    sessionStorage.setItem(SYNCED_KEY, uid);
    clearDbUserCache();
    clearConflict();

    // Show recovery code to the user immediately
    setRecoveryState({
      needsRecoveryCode: true,
      needsRegeneration: false,
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
    if (serverShareAttemptedRef.current) {
      console.log("[useSyncKeys] fetchServerShare: already attempted this session, skipping");
      return null;
    }
    // Also check a sessionStorage flag so we don't re-fetch across remounts
    const flagKey = "hp_server_share_attempted";
    try {
      if (sessionStorage.getItem(flagKey) === "1") {
        console.log("[useSyncKeys] fetchServerShare: sessionStorage flag set, skipping");
        return null;
      }
      sessionStorage.setItem(flagKey, "1");
    } catch {
      /* ignore storage errors */
    }
    serverShareAttemptedRef.current = true;
    try {
      const token = await getAccessToken();
      if (!token) {
        console.error("[useSyncKeys] fetchServerShare: no Privy token available");
        return null;
      }
      console.log("[useSyncKeys] fetchServerShare: token length", token.length);
      const res = await fetch("/api/server-share/fetch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          console.warn("[useSyncKeys] fetchServerShare: no server share stored for this user (409)");
        } else {
          console.error("[useSyncKeys] fetchServerShare failed:", res.status, res.statusText);
        }
        return null;
      }
      const { share } = await res.json();
      return share as string;
    } catch (e) {
      console.error("[useSyncKeys] fetchServerShare failed:", e);
      return null;
    }
  };

  useEffect(() => {
    if (!ready || !authenticated || !userId || !walletAddress) return;

    // sessionStorage gate: survives remounts / StrictMode double-mount
    if (alreadyProcessed(userId)) {
      return;
    }

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
            // Lazy migration: create encrypted_private_key backup if missing
            if (!userWithBackup?.encrypted_private_key) {
              try {
                let privJwkStr: string;
                try {
                  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey!);
                  privJwkStr = JSON.stringify(privJwk);
                } catch (exportErr) {
                  // Key is non-extractable → reconstruct master secret from SSS shares
                  const localShare1 = await getLocalShare1(userId);
                  if (!localShare1) throw new Error("No local share1 for reconstruction");
                  const share2 = await fetchServerShare();
                  if (!share2) {
                    if (!userWithBackup?.server_share_ciphertext) {
                      console.warn("[useSyncKeys] No server share stored for user; cross-device backup unavailable");
                      throw new Error("CROSS_DEVICE_BACKUP_UNAVAILABLE");
                    }
                    throw new Error("No server share2 for reconstruction");
                  }
                  const reconstructed = reconstructSecret([localShare1, share2]);
                  const hash = await hashMasterSecret(reconstructed);
                  if (hash !== userWithBackup?.master_secret_hash) {
                    throw new Error("Master secret hash mismatch during reconstruction");
                  }
                  privJwkStr = new TextDecoder().decode(reconstructed);
                }
                const backupPassword = await deriveCrossDevicePassword(userId);
                const encrypted = await encryptPrivateKey(privJwkStr, backupPassword);
                await saveEncryptedPrivateKey(await withPrivyToken({ id: userId, encrypted_private_key: encrypted }));
                console.log("[useSyncKeys] Lazy migration: encrypted_private_key backup created");
              } catch (e) {
                if (e instanceof Error && e.message === "CROSS_DEVICE_BACKUP_UNAVAILABLE") {
                  console.log("[useSyncKeys] Skipping backup — user has no server share; keys still work locally");
                } else {
                  console.warn("[useSyncKeys] Lazy migration backup failed:", e);
                }
              }
            }
            // If the user has no server share at all, they may want to regenerate
            // for cross-device support — but ONLY if they have no encrypted data.
            if (!userWithBackup?.server_share_ciphertext && walletAddress) {
              try {
                const hasData = await hasEncryptedData(walletAddress);
                if (!hasData) {
                  console.warn("[useSyncKeys] No server share and no encrypted data — safe to regenerate");
                  setRecoveryState({
                    needsRecoveryCode: false,
                    needsRegeneration: true,
                    recoveryCode: null,
                    step: "idle",
                  });
                  return;
                }
              } catch {
                /* ignore check failure */
              }
            }
            sessionStorage.setItem(SYNCED_KEY, userId);
            return;
          }

          // DB key differs → try auto-recovery from backup, then set up recovery
          if (dbPk && dbPk !== localPk) {
            const userWithBackupMismatch = await getUserWithBackup(userId);

            // Step 1: Try silent auto-recovery from encrypted_private_key backup
            if (userWithBackupMismatch?.encrypted_private_key && userWithBackupMismatch?.public_key) {
              const passwords = await deriveAllBackupPasswords(userId, walletAddress);
              let decrypted: string | null = null;
              for (const pw of passwords) {
                decrypted = await decryptPrivateKey(userWithBackupMismatch.encrypted_private_key, pw);
                if (decrypted) break;
              }

              if (decrypted) {
                try {
                  const privJwk = JSON.parse(decrypted) as JsonWebKey;
                  const pubJwk = JSON.parse(userWithBackupMismatch.public_key) as JsonWebKey;
                  const privateKey = await crypto.subtle.importKey(
                    "jwk",
                    privJwk,
                    { name: "ECDH", namedCurve: "P-256" },
                    false,
                    ["deriveKey", "deriveBits"]
                  );
                  const publicKey = await crypto.subtle.importKey(
                    "jwk",
                    pubJwk,
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    []
                  );
                  // Reconstruct SSS shares for this device so recovery code remains valid
                  const encoder = new TextEncoder();
                  const masterSecret = encoder.encode(JSON.stringify(privJwk));
                  const shares = generateShares(masterSecret, 2, 3);
                  const [share1, share2] = shares;
                  const masterHash = await hashMasterSecret(masterSecret);
                  await saveKeyPair(userId, { privateKey, publicKey }, {
                    share1,
                    masterSecretHash: masterHash,
                    schemeVersion: 2,
                  });
                  await saveServerShare(await withPrivyToken({ userId, share2 }));
                  await saveMasterSecretHash(await withPrivyToken({ userId, masterSecretHash: masterHash }));
                  sessionStorage.setItem(SYNCED_KEY, userId);
                  clearConflict();
                  try {
                    const { sileo } = await import("sileo");
                    sileo.success({
                      title: t("recoverySuccess"),
                      description: t("recoverySuccessDesc"),
                      duration: 5000,
                    });
                  } catch { /* sileo not available in tests */ }
                  return;
                } catch (e) {
                  console.warn("[useSyncKeys] Auto-recovery from key_mismatch failed:", e);
                }
              }
            }

            // Auto-recovery failed → delete incorrect local keys and offer recovery/regenerate
            await deleteKeyPair(userId);

            if (!userWithBackupMismatch?.server_share_ciphertext) {
              setRecoveryState({
                needsRecoveryCode: false,
                needsRegeneration: true,
                recoveryCode: null,
                step: "idle",
              });
            } else {
              setRecoveryState({
                needsRecoveryCode: true,
                needsRegeneration: false,
                recoveryCode: null,
                step: "needs_input",
              });
            }
            setConflict("key_mismatch");
            return;
          }

          // No DB key → save local to DB
          const pubRes = await updatePublicKey(await withPrivyToken({
            id: userId,
            public_key: localPk,
          }));
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
          setIsRecovering(true);
          // Step 1: Try silent auto-recovery from encrypted_private_key backup
          if (userWithBackup?.encrypted_private_key && userWithBackup?.public_key) {
            const passwords = await deriveAllBackupPasswords(userId, walletAddress);
            let decrypted: string | null = null;
            for (const pw of passwords) {
              decrypted = await decryptPrivateKey(userWithBackup.encrypted_private_key, pw);
              if (decrypted) break;
            }
            if (decrypted) {
              try {
                const privJwk = JSON.parse(decrypted) as JsonWebKey;
                const pubJwk = JSON.parse(userWithBackup.public_key) as JsonWebKey;
                const privateKey = await crypto.subtle.importKey(
                  "jwk",
                  privJwk,
                  { name: "ECDH", namedCurve: "P-256" },
                  false,
                  ["deriveKey", "deriveBits"]
                );
                const publicKey = await crypto.subtle.importKey(
                  "jwk",
                  pubJwk,
                  { name: "ECDH", namedCurve: "P-256" },
                  true,
                  []
                );
                // Reconstruct SSS shares for this device so recovery code remains valid
                const encoder = new TextEncoder();
                const masterSecret = encoder.encode(JSON.stringify(privJwk));
                const shares = generateShares(masterSecret, 2, 3);
                const [share1, share2] = shares;
                const masterHash = await hashMasterSecret(masterSecret);
                await saveKeyPair(userId, { privateKey, publicKey }, {
                  share1,
                  masterSecretHash: masterHash,
                  schemeVersion: 2,
                });
                await saveServerShare(await withPrivyToken({ userId, share2 }));
                await saveMasterSecretHash(await withPrivyToken({ userId, masterSecretHash: masterHash }));
                sessionStorage.setItem(SYNCED_KEY, userId);
                clearConflict();
                console.log("[useSyncKeys] Auto-recovered from encrypted_private_key backup");
                try {
                  const { sileo } = await import("sileo");
                  sileo.success({
                    title: t("recoverySuccess"),
                    description: t("recoverySuccessDesc"),
                    duration: 5000,
                  });
                } catch {
                  /* sileo not available in tests */
                }
                return;
              } catch (e) {
                console.warn("[useSyncKeys] Auto-recovery from encrypted_private_key failed:", e);
              }
            }
          }

          // Step 2: Try normal SSS recovery with local share1 + server share2
          const localShare1 = await getLocalShare1(userId);
          if (localShare1) {
            serverShareAttemptedRef.current = false;
            try { sessionStorage.removeItem("hp_server_share_attempted"); } catch { /* ignore */ }
            const share2 = await fetchServerShare();
            if (!share2) {
              console.error("[useSyncKeys] Server share2 unavailable");
              if (!userWithBackup?.server_share_ciphertext) {
                setRecoveryState({
                  needsRecoveryCode: false,
                  needsRegeneration: true,
                  recoveryCode: null,
                  step: "idle",
                });
                return;
              }
              setRecoveryState({
                needsRecoveryCode: true,
                needsRegeneration: false,
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
                needsRegeneration: false,
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

          // Step 3: No local share1 → need recovery code or regeneration
          if (!userWithBackup?.server_share_ciphertext) {
            setRecoveryState({
              needsRecoveryCode: false,
              needsRegeneration: true,
              recoveryCode: null,
              step: "idle",
            });
            return;
          }
          setRecoveryState({
            needsRecoveryCode: true,
            needsRegeneration: false,
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
            const passwords = await deriveAllBackupPasswords(userId, walletAddress);
            let decrypted: string | null = null;
            for (const pw of passwords) {
              decrypted = await decryptPrivateKey(
                userWithBackup.encrypted_private_key,
                pw
              );
              if (decrypted) break;
            }
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
            const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
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

            await saveServerShare(await withPrivyToken({ userId, share2 }));
            await saveRecoveryHash(await withPrivyToken({ userId, recoveryCodeHash: recoveryHash }));
            await saveMasterSecretHash(await withPrivyToken({ userId, masterSecretHash: masterHash }));
            await updatePublicKey(await withPrivyToken({ id: userId, public_key: JSON.stringify(legacyPubJwk) }));

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

        // ── Case F: No keys anywhere ──
        // If user already exists in DB (has scheme or public key), they must
        // recover or explicitly choose to regenerate. NEVER auto-create new keys
        // for an existing account — that would overwrite their encryption data.
        if (schemeVersion || dbPk) {
          if (schemeVersion === 2 && userWithBackup?.server_share_ciphertext) {
            setRecoveryState({
              needsRecoveryCode: true,
              needsRegeneration: false,
              recoveryCode: null,
              step: "needs_input",
            });
          } else {
            setRecoveryState({
              needsRecoveryCode: false,
              needsRegeneration: true,
              recoveryCode: null,
              step: "idle",
            });
          }
          return;
        }

        // Only for brand-new users with no DB record whatsoever
        await onboardNewUser(userId);
      } catch (err) {
        console.error("[useSyncKeys] Error syncing keys:", err);
        setIsRecovering(false);
        ranForRef.current = null;
      }
    })();
  }, [ready, authenticated, userId, walletAddress, setConflict, clearConflict, setIsRecovering]);

  // ── Manual recovery with recovery code ──
  const recoverWithCode = async (code: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      setRecoveryState((s) => ({ ...s, step: "recovering" }));

      const userWithBackup = await getUserWithBackup(userId);
      if (!userWithBackup?.master_secret_hash) return false;

      serverShareAttemptedRef.current = false;
      try { sessionStorage.removeItem("hp_server_share_attempted"); } catch { /* ignore */ }
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
        needsRegeneration: false,
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

  // ── Regenerate keys for users who lost everything ──
  const regenerateKeys = async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      console.warn("[useSyncKeys] Regenerating keys for", userId);
      // Clear gates so the next sync can run fresh
      ranForRef.current = null;
      serverShareAttemptedRef.current = false;
      try {
        sessionStorage.removeItem("hp_server_share_attempted");
      } catch { /* ignore */ }
      const { masterSecret, publicKeyJwk, keyPair } = await generateMasterSecret();
      const shares = generateShares(masterSecret, 2, 3);
      const [share1, share2, share3] = shares;

      const masterHash = await hashMasterSecret(masterSecret);
      const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
      const recoveryHash = await hashRecoveryCode(recoveryCode);

      await saveKeyPair(userId, keyPair, {
        share1,
        masterSecretHash: masterHash,
        schemeVersion: 2,
      });

      await saveServerShare(await withPrivyToken({ userId, share2 }));
      await saveRecoveryHash(await withPrivyToken({ userId, recoveryCodeHash: recoveryHash }));
      await saveMasterSecretHash(await withPrivyToken({ userId, masterSecretHash: masterHash }));
      await updatePublicKey(await withPrivyToken({ id: userId, public_key: publicKeyJwk }));

      sessionStorage.setItem(SYNCED_KEY, userId);
      clearConflict();
      clearDbUserCache();

      // Show the new recovery code
      setRecoveryState({
        needsRecoveryCode: true,
        needsRegeneration: false,
        recoveryCode,
        step: "show_recovery_code",
      });
      return true;
    } catch (e) {
      console.error("[useSyncKeys] regenerateKeys failed:", e);
      return false;
    }
  };

  // ── Dismiss recovery code modal ──
  const dismissRecoveryCode = () => {
    setRecoveryState({
      needsRecoveryCode: false,
      needsRegeneration: false,
      recoveryCode: null,
      step: "idle",
    });
  };

  return { recoveryState, recoverWithCode, dismissRecoveryCode, regenerateKeys };
}
