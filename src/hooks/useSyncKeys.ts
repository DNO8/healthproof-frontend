"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  generateKeyPair,
  exportPublicKey,
  importPrivateKey,
} from "@/services/encryption/ecdh";
import {
  saveKeyPair,
  hasKeyPair,
  getKeyPair,
  deleteKeyPair,
} from "@/services/encryption/keystore";
import { updatePublicKey } from "@/actions/update-public-key";
import { getUserPublicKey } from "@/actions/get-user-public-key";
import { getUserWithBackup } from "@/actions/get-user-with-backup";
import { hasEncryptedData } from "@/actions/check-user-encrypted-data";
import { clearDbUserCache } from "@/hooks/useDbUser";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { saveKeyShare } from "@/actions/save-key-share";
import {
  generateShares,
  reconstructSecret,
  shareToBase64,
  shareFromBase64,
  deriveShareFromSeed,
} from "@/services/encryption/shamir";
import {
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/services/encryption/key-backup";
import { saveEncryptedPrivateKey } from "@/actions/save-encrypted-private-key";

const SYNCED_KEY = "hp_keys_synced";

function jwkToUint8Array(jwk: JsonWebKey): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(jwk));
}

function uint8ArrayToJwk(bytes: Uint8Array): JsonWebKey {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(bytes)) as JsonWebKey;
}

export function useSyncKeys() {
  const { ready, authenticated, user } = usePrivy();
  const calledRef = useRef(false);
  const setConflict = useKeyConflictStore((s) => s.setConflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);

  const userId = user?.id;
  const walletAddress = user?.wallet?.address;

  useEffect(() => {
    if (!ready || !authenticated || !userId || !walletAddress) return;
    if (calledRef.current) return;

    calledRef.current = true;

    const alreadySynced = sessionStorage.getItem(SYNCED_KEY);
    if (alreadySynced === userId) return;

    (async () => {
      try {
        const localExists = await hasKeyPair(userId);
        const dbPk = await getUserPublicKey(userId);

        // ── Case 1: IndexedDB has keys ──────────────────────────
        if (localExists) {
          const kp = await getKeyPair(userId);
          if (!kp) { calledRef.current = false; return; }

          let localPk: string;
          try {
            localPk = await exportPublicKey(kp.publicKey);
          } catch {
            await deleteKeyPair(userId);
            const newKp = await generateKeyPair(true);
            await saveKeyPair(userId, newKp);
            localPk = await exportPublicKey(newKp.publicKey);

            const newPrivJwk = await crypto.subtle.exportKey("jwk", newKp.privateKey);
            const shares = generateShares(jwkToUint8Array(newPrivJwk as JsonWebKey), 2, 2);
            const share1 = shareToBase64(shares[0]);

            await saveKeyShare({ userId, share: share1 });
            const pubRes = await updatePublicKey({ id: userId, public_key: localPk });
            if (pubRes.success) {
              sessionStorage.setItem(SYNCED_KEY, userId);
              clearDbUserCache();
            } else { calledRef.current = false; }
            return;
          }

          if (dbPk === localPk) {
            sessionStorage.setItem(SYNCED_KEY, userId);
            return;
          }

          if (dbPk && dbPk !== localPk) {
            const userWithBackup = await getUserWithBackup(userId);
            const wallet = userWithBackup?.wallet_address;
            if (wallet) {
              const hasData = await hasEncryptedData(wallet);
              if (hasData) { setConflict("key_mismatch"); return; }
            }
          }

          const privateKeyJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
          const shares = generateShares(jwkToUint8Array(privateKeyJwk as JsonWebKey), 2, 2);
          const share1 = shareToBase64(shares[0]);

          await saveKeyShare({ userId, share: share1 });
          const pubRes = await updatePublicKey({ id: userId, public_key: localPk });
          if (pubRes.success) {
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
          } else { calledRef.current = false; }
          return;
        }

        // ── Case 2: IndexedDB empty ──────────────────────────
        const userWithBackup = await getUserWithBackup(userId);
        const wallet = userWithBackup?.wallet_address;

        // 2a: Shamir auto-recovery (zero friction)
        if (userWithBackup?.key_share && walletAddress) {
          try {
            const response = await fetch("/api/recovery-share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId }),
            });

            if (response.ok) {
              const { share: share1Base64 } = await response.json();
              const share1 = shareFromBase64(share1Base64);
              const share2 = await deriveShareFromSeed(
                `${walletAddress.toLowerCase()}|${userId}`,
                share1.length - 1,
              );
              const secret = reconstructSecret([share1, share2]);
              const privateKeyJwk = uint8ArrayToJwk(secret);
              const privateKey = await importPrivateKey(privateKeyJwk);
              const publicKeyJwk = JSON.parse(userWithBackup.public_key ?? "{}") as JsonWebKey;
              const publicKey = await crypto.subtle.importKey(
                "jwk", publicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, false, [],
              );
              await saveKeyPair(userId, { privateKey, publicKey });
              sessionStorage.setItem(SYNCED_KEY, userId);
              clearConflict();
              return;
            }
          } catch (e) {
            console.error("[useSyncKeys] Shamir recovery failed:", e);
          }
        }

        // 2b: Legacy backup recovery (encrypted_private_key)
        if (userWithBackup?.encrypted_private_key && userWithBackup?.public_key) {
          const legacyPassword = walletAddress
            ? `${walletAddress.toLowerCase()}|${userId}`
            : `${userId}|${userId}`;
          const privateKeyJwk = await decryptPrivateKey(
            userWithBackup.encrypted_private_key,
            legacyPassword,
          );
          if (privateKeyJwk) {
            const privateKey = await importPrivateKey(JSON.parse(privateKeyJwk));
            const publicKeyJwk = JSON.parse(userWithBackup.public_key) as JsonWebKey;
            const publicKey = await crypto.subtle.importKey(
              "jwk", publicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, false, [],
            );
            await saveKeyPair(userId, { privateKey, publicKey });
            // Migrate to Shamir backup
            const newPrivJwk = await crypto.subtle.exportKey("jwk", privateKey);
            const shares = generateShares(jwkToUint8Array(newPrivJwk as JsonWebKey), 2, 2);
            await saveKeyShare({ userId, share: shareToBase64(shares[0]) });
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearConflict();
            return;
          }
        }

        // 2c: No backup, check for encrypted data
        if (wallet) {
          const hasData = await hasEncryptedData(wallet);
          if (hasData) { setConflict("missing_local_keys"); return; }
        }

        // ── Case 3: No keys anywhere — generate new ──────────────
        const keyPair = await generateKeyPair(true);
        await saveKeyPair(userId, keyPair);
        const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
        const shares = generateShares(jwkToUint8Array(privateKeyJwk as JsonWebKey), 2, 2);
        const share1 = shareToBase64(shares[0]);

        await saveKeyShare({ userId, share: share1 });
        const pubRes = await updatePublicKey({ id: userId, public_key: publicKeyJwk });
        if (pubRes.success) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          clearDbUserCache();
        } else { calledRef.current = false; }
      } catch (err) {
        console.error("[useSyncKeys] Error syncing keys:", err);
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, userId, walletAddress, setConflict, clearConflict]);

  return {};
}
