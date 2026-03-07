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
