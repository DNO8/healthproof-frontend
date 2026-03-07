// Re-wrap an AES session key for a new recipient
// Used when a patient shares access with a doctor

import {
  unwrapSessionKey,
  wrapSessionKey,
  importPublicKey,
  exportPublicKey,
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

  // DEBUG: export current public key and compare
  const myCurrentPubKey = await exportPublicKey(myKeys.publicKey);
  console.log("[rewrap] myUserId:", opts.myUserId);
  console.log(
    "[rewrap] my current publicKey (from IndexedDB):",
    myCurrentPubKey,
  );
  console.log(
    "[rewrap] sender publicKey (lab _uploader):",
    opts.senderPublicKeyJwk,
  );
  console.log(
    "[rewrap] wrappedKey.data length:",
    opts.myWrappedKey.data.length,
  );
  console.log("[rewrap] wrappedKey.iv length:", opts.myWrappedKey.iv.length);

  // 2. Import sender's public key to unwrap
  const senderPubKey = await importPublicKey(opts.senderPublicKeyJwk);

  // 3. Unwrap the AES session key using my private key + sender's public key
  console.log("[rewrap] Attempting unwrapSessionKey...");
  const sessionKey = await unwrapSessionKey(
    opts.myWrappedKey,
    myKeys.privateKey,
    senderPubKey,
  );
  console.log("[rewrap] unwrapSessionKey OK");

  // 4. Import recipient's public key
  const recipientPubKey = await importPublicKey(opts.recipientPublicKeyJwk);

  // 5. Re-wrap the AES session key for the new recipient
  return wrapSessionKey(sessionKey, myKeys.privateKey, recipientPubKey);
}
