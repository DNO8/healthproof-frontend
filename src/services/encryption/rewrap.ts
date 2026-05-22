// Re-wrap an AES session key for a new recipient
// Used when a patient shares access with a doctor

import {
  unwrapSessionKey,
  wrapSessionKey,
  importPublicKey,
  type WrappedKey,
} from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";

export async function rewrapKeyForRecipient(opts: {
  myUserId: string;
  myWrappedKey: WrappedKey;
  senderPublicKeyJwk: string;
  recipientPublicKeyJwk: string;
}): Promise<WrappedKey> {
  // 1. Get my private key from IndexedDB
  const myKeys = await getKeyPair(opts.myUserId);
  if (!myKeys) {
    throw new Error("Encryption keys not found in this browser.");
  }

  // 2. Import sender's public key to unwrap
  const senderPubKey = await importPublicKey(opts.senderPublicKeyJwk);

  // 3. Unwrap the AES session key using my private key + sender's public key
  const sessionKey = await unwrapSessionKey(
    opts.myWrappedKey,
    myKeys.privateKey,
    senderPubKey,
  );

  // 4. Import recipient's public key
  const recipientPubKey = await importPublicKey(opts.recipientPublicKeyJwk);

  // 5. Re-wrap the AES session key for the new recipient
  return wrapSessionKey(sessionKey, myKeys.privateKey, recipientPubKey);
}

interface DocumentSecret {
  document_id: string;
  uploader_public_key?: string | null;
  uploader_wallet: string;
  encrypted_keys: Record<string, WrappedKey>;
  iv?: string;
}

export interface BatchRewrapResult {
  documentId: string;
  rewrapped: WrappedKey;
}

/**
 * Batch re-wrap all document secrets for a new recipient.
 * Used when granting FULL_ACCESS or INSTITUTION-wide permissions.
 */
export async function batchRewrapForGrantee(opts: {
  myUserId: string;
  myWalletAddress: string;
  secrets: DocumentSecret[];
  recipientPublicKeyJwk: string;
}): Promise<BatchRewrapResult[]> {
  const results: BatchRewrapResult[] = [];

  for (const secret of opts.secrets) {
    try {
      const myWrappedKey =
        secret.encrypted_keys[opts.myWalletAddress.toLowerCase()] ??
        secret.encrypted_keys[opts.myUserId];
      if (!myWrappedKey) continue;

      let senderPublicKeyJwk = secret.uploader_public_key;
      if (!senderPublicKeyJwk) {
        // Skip documents where we can't determine the sender public key
        // (would need an async lookup; caller should pre-populate)
        continue;
      }

      const rewrapped = await rewrapKeyForRecipient({
        myUserId: opts.myUserId,
        myWrappedKey,
        senderPublicKeyJwk,
        recipientPublicKeyJwk: opts.recipientPublicKeyJwk,
      });

      results.push({ documentId: secret.document_id, rewrapped });
    } catch {
      // Skip documents that can't be rewrapped
      continue;
    }
  }

  return results;
}
