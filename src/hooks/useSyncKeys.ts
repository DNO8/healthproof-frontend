"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { sileo } from "sileo";
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
import { saveEncryptedPrivateKey } from "@/actions/save-encrypted-private-key";
import { BACKUP_METHOD, createRecoveryPassword, getBackupMethod } from "@/services/encryption/backup-types";
import {
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/services/encryption/key-backup";

const SYNCED_KEY = "hp_keys_synced";
const RECOVERY_ATTEMPTED_KEY = "hp_recovery_attempted";

/**
 * Hook to sync user's ECDH keys between IndexedDB and Supabase.
 * For new users: generates keys and creates automatic backup.
 * For existing users: attempts recovery from backup if keys missing.
 */
export function useSyncKeys() {
  const { ready, authenticated, user } = usePrivy();
  const calledRef = useRef(false);
  const setConflict = useKeyConflictStore((s) => s.setConflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const userId = user?.id;
  const userEmail = user?.email?.address;
  const walletAddress = user?.wallet?.address;

  useEffect(() => {
    console.log("[useSyncKeys] Effect triggered:", { ready, authenticated, userId, called: calledRef.current });
    
    if (!ready || !authenticated || !userId) {
      console.log("[useSyncKeys] Early return - not ready:", { ready, authenticated, userId });
      return;
    }
    if (calledRef.current) {
      console.log("[useSyncKeys] Early return - already called");
      return;
    }

    calledRef.current = true;

    const alreadySynced = sessionStorage.getItem(SYNCED_KEY);
    if (alreadySynced === userId) {
      console.log("[useSyncKeys] Already synced for this user, skipping");
      return;
    }

    (async () => {
      try {
        console.log("[useSyncKeys] Starting key sync check...");
        const localExists = await hasKeyPair(userId);
        const dbPk = await getUserPublicKey(userId);
        console.log("[useSyncKeys] Initial check:", { localExists, dbPkExists: !!dbPk, userId });

        // ── Case 1: IndexedDB has keys ──────────────────────────
        if (localExists) {
          console.log("[useSyncKeys] Case 1: IndexedDB has keys");
          const kp = await getKeyPair(userId);
          if (!kp) {
            console.log("[useSyncKeys] Case 1: No keypair found despite localExists=true");
            calledRef.current = false;
            return;
          }
          let localPk = await exportPublicKey(kp.publicKey);

          if (dbPk === localPk) {
            console.log("[useSyncKeys] Case 1: Keys match - all good");
            sessionStorage.setItem(SYNCED_KEY, userId);
            return;
          }

          if (dbPk && dbPk !== localPk) {
            console.log("[useSyncKeys] Case 1: Key mismatch detected");
            const userWithBackup = await getUserWithBackup(userId);
            const wallet = userWithBackup?.wallet_address;
            console.log("[useSyncKeys] Case 1: Looking up wallet:", { wallet, userId });
            if (wallet) {
              const hasData = await hasEncryptedData(wallet);
              console.log("[useSyncKeys] Case 1: hasEncryptedData result:", hasData);
              if (hasData) {
                console.log("[useSyncKeys] Case 1: CONFLICT DETECTED - key_mismatch");
                setConflict("key_mismatch");
                return;
              }
            } else {
              console.log("[useSyncKeys] Case 1: No wallet found for user");
            }
          }

          // DB is missing or no encrypted data depends on it — safe to update
          console.log("[useSyncKeys] Case 1: Updating DB with local public key and backup...");
          
          // Try to export private key for backup
          let encryptedPrivateKey: string;
          try {
            const privateKeyJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
            const backupPassword = createRecoveryPassword(
              userEmail ?? walletAddress ?? userId,
              userId,
            );
            encryptedPrivateKey = await encryptPrivateKey(
              JSON.stringify(privateKeyJwk),
              backupPassword,
            );
          } catch {
            // Keys are not extractable (old keys), need to regenerate
            console.log("[useSyncKeys] Case 1: Local keys not extractable, regenerating...");
            await deleteKeyPair(userId);
            
            const keyPair = await generateKeyPair(true);
            await saveKeyPair(userId, keyPair);
            const newPrivateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
            const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
            localPk = publicKeyJwk;
            
            const backupPassword = createRecoveryPassword(
              userEmail ?? walletAddress ?? userId,
              userId,
            );
            encryptedPrivateKey = await encryptPrivateKey(
              JSON.stringify(newPrivateKeyJwk),
              backupPassword,
            );
            console.log("[useSyncKeys] Case 1: New keys generated");
          }
          
          const [pubResult, privResult] = await Promise.all([
            updatePublicKey({ id: userId, public_key: localPk }),
            saveEncryptedPrivateKey({
              id: userId,
              encrypted_private_key: encryptedPrivateKey,
            }),
          ]);
          
          console.log("[useSyncKeys] Case 1: Update results:", { 
            pubSuccess: pubResult.success, 
            privError: privResult.error 
          });
          
          if (pubResult.success && !privResult.error) {
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
            console.log("[useSyncKeys] Case 1: DB updated successfully with backup");
          } else {
            calledRef.current = false;
            console.log("[useSyncKeys] Case 1: DB update failed");
          }
          return;
        }

        // ── Case 2: IndexedDB is empty ──────────────────────────
        console.log("[useSyncKeys] Case 2: DB has key but IndexedDB empty");
        const userWithBackup = await getUserWithBackup(userId);
        const wallet = userWithBackup?.wallet_address;
        console.log("[useSyncKeys] Case 2: User data:", {
          wallet,
          hasEncryptedPrivateKey: !!userWithBackup?.encrypted_private_key,
          userId,
        });

        // First: attempt recovery if backup exists (regardless of encrypted data)
        if (userWithBackup?.encrypted_private_key) {
          console.log("[useSyncKeys] Case 2: Has backup, attempting recovery");
          const recoveryAttempted = sessionStorage.getItem(
            `${RECOVERY_ATTEMPTED_KEY}_${userId}`,
          );

          // Try wallet-based auto-recovery first (works for both OAuth and email users)
          if (!recoveryAttempted && walletAddress) {
            const walletPassword = createRecoveryPassword(walletAddress, userId);
            const privateKeyJwk = await decryptPrivateKey(
              userWithBackup.encrypted_private_key,
              walletPassword,
            );

            if (privateKeyJwk) {
              console.log("[useSyncKeys] Case 2: Wallet-based auto-recovery successful");
              const privateKey = await importPrivateKey(
                JSON.parse(privateKeyJwk),
              );
              const publicKey = await crypto.subtle.importKey(
                "jwk",
                JSON.parse(userWithBackup.public_key ?? "{}"),
                { name: "ECDH", namedCurve: "P-256" },
                false,
                [],
              );

              await saveKeyPair(userId, { privateKey, publicKey });
              sessionStorage.setItem(SYNCED_KEY, userId);
              clearConflict();
              return;
            }
            console.log("[useSyncKeys] Case 2: Wallet-based recovery failed, trying email...");
          }

          // Try email-based auto-recovery as fallback
          if (!recoveryAttempted && userEmail) {
            const autoPassword = createRecoveryPassword(userEmail, userId);
            const privateKeyJwk = await decryptPrivateKey(
              userWithBackup.encrypted_private_key,
              autoPassword,
            );

            if (privateKeyJwk) {
              console.log("[useSyncKeys] Case 2: Email-based auto-recovery successful");
              const privateKey = await importPrivateKey(
                JSON.parse(privateKeyJwk),
              );
              const publicKey = await crypto.subtle.importKey(
                "jwk",
                JSON.parse(userWithBackup.public_key ?? "{}"),
                { name: "ECDH", namedCurve: "P-256" },
                false,
                [],
              );

              await saveKeyPair(userId, { privateKey, publicKey });
              sessionStorage.setItem(SYNCED_KEY, userId);
              clearConflict();
              return;
            }
            console.log("[useSyncKeys] Case 2: Email-based auto-recovery failed");
          }

          // Show manual recovery modal for email users, conflict for OAuth users
          if (userEmail) {
            console.log("[useSyncKeys] Case 2: Showing recovery modal for email user");
            setShowRecoveryModal(true);
          } else {
            console.log("[useSyncKeys] Case 2: OAuth user - recovery failed, showing conflict");
            sileo.error({
              title: "Recovery Failed",
              description: "Could not recover your encryption keys. Please use your original browser or contact support.",
            });
          }
          setConflict("missing_local_keys");
          return;
        }

        // No backup available - check if we can safely regenerate
        if (wallet) {
          const hasData = await hasEncryptedData(wallet);
          console.log("[useSyncKeys] Case 2: hasEncryptedData result:", hasData);

          if (hasData) {
            console.log(
              "[useSyncKeys] Case 2: CONFLICT DETECTED - missing_local_keys (no backup)",
            );
            setConflict("missing_local_keys");
            return;
          }
          console.log("[useSyncKeys] Case 2: No encrypted data found - safe to regenerate");
        } else {
          console.log("[useSyncKeys] Case 2: No wallet found for user");
        }

        // ── Case 3: No keys anywhere — generate new ──────────────
        console.log("[useSyncKeys] Case 3: No keys anywhere - generating new keys");
        const keyPair = await generateKeyPair(true);
        await saveKeyPair(userId, keyPair);
        const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

        // Export private key for backup (only time we extract it)
        const privateKeyJwk = await crypto.subtle.exportKey(
          "jwk",
          keyPair.privateKey,
        );

        // Create automatic backup password using wallet (works for all users including OAuth)
        const backupPassword = walletAddress 
          ? createRecoveryPassword(walletAddress, userId)
          : createRecoveryPassword(userEmail ?? userId, userId);
        const encryptedPrivateKey = await encryptPrivateKey(
          JSON.stringify(privateKeyJwk),
          backupPassword,
        );

        // Save to DB: public key + encrypted private key backup
        const [pubResult, privResult] = await Promise.all([
          updatePublicKey({ id: userId, public_key: publicKeyJwk }),
          saveEncryptedPrivateKey({
            id: userId,
            encrypted_private_key: encryptedPrivateKey,
          }),
        ]);

        console.log("[useSyncKeys] Case 3: New keys saved:", { 
          pubSuccess: pubResult.success, 
          privError: privResult.error 
        });

        if (pubResult.success && !privResult.error) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          clearDbUserCache();
        } else {
          calledRef.current = false;
        }
      } catch (err) {
        console.error("[useSyncKeys] Error syncing keys:", err);
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, userId, userEmail, walletAddress, setConflict, clearConflict]);

  return { showRecoveryModal, setShowRecoveryModal };
}
