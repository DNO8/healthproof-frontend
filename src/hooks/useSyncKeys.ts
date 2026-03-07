"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { generateKeyPair, exportPublicKey } from "@/services/encryption/ecdh";
import { saveKeyPair, hasKeyPair } from "@/services/encryption/keystore";
import { updatePublicKey } from "@/actions/update-public-key";
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
        if (exists) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          return;
        }

        // Generate new ECDH key pair
        const keyPair = await generateKeyPair();

        // Store in IndexedDB (private key is non-extractable)
        await saveKeyPair(userId, keyPair);

        // Export public key and save to DB
        const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
        const result = await updatePublicKey({
          id: userId,
          public_key: publicKeyJwk,
        });

        if (result.success) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          clearDbUserCache();
        } else {
          console.error("[useSyncKeys] Failed to save public key:", result.error);
          calledRef.current = false;
        }
      } catch (err) {
        console.error("[useSyncKeys] Error generating key pair:", err);
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, userId]);
}
