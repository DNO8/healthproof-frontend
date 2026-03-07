"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { generateKeyPair, exportPublicKey } from "@/services/encryption/ecdh";
import {
  saveKeyPair,
  hasKeyPair,
  getKeyPair,
} from "@/services/encryption/keystore";
import { updatePublicKey } from "@/actions/update-public-key";
import { getUserPublicKey } from "@/actions/get-user-public-key";
import { clearDbUserCache } from "@/hooks/useDbUser";

const SYNCED_KEY = "hp_keys_synced";

export function useSyncKeys() {
  const { ready, authenticated, user } = usePrivy();
  const calledRef = useRef(false);

  const userId = user?.id;

  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (calledRef.current) return;

    const alreadySynced = sessionStorage.getItem(SYNCED_KEY);
    if (alreadySynced === userId) return;

    calledRef.current = true;

    (async () => {
      try {
        // Check if key pair already exists in IndexedDB
        const exists = await hasKeyPair(userId);

        let publicKeyJwk: string;

        if (exists) {
          const kp = await getKeyPair(userId);
          if (!kp) {
            calledRef.current = false;
            return;
          }
          publicKeyJwk = await exportPublicKey(kp.publicKey);
        } else {
          // Generate new ECDH key pair + store in IndexedDB
          const keyPair = await generateKeyPair();
          await saveKeyPair(userId, keyPair);
          publicKeyJwk = await exportPublicKey(keyPair.publicKey);
        }

        // Always ensure DB matches IndexedDB (prevents stale key mismatches)
        const dbPk = await getUserPublicKey(userId);
        if (dbPk === publicKeyJwk) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          return;
        }

        // DB missing or stale — update
        const result = await updatePublicKey({
          id: userId,
          public_key: publicKeyJwk,
        });

        if (result.success) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          clearDbUserCache();
        } else {
          console.error(
            "[useSyncKeys] Failed to save public key:",
            result.error,
          );
          calledRef.current = false;
        }
      } catch (err) {
        console.error("[useSyncKeys] Error generating key pair:", err);
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, userId]);
}
