// Client-side download and decryption from IPFS using ECDH-wrapped keys

import { decryptData } from "@/services/encryption/decrypt";
import { decodeIv } from "@/services/encryption/key-management";
import {
  unwrapSessionKey,
  importPublicKey,
  type WrappedKey,
} from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";

const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "gateway.pinata.cloud";
const GATEWAY_URL = PINATA_GATEWAY.startsWith("http")
  ? PINATA_GATEWAY
  : `https://${PINATA_GATEWAY}`;

async function fetchFromGateway(cid: string): Promise<ArrayBuffer> {
  const url = `${GATEWAY_URL}/ipfs/${cid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export interface DecryptedResult {
  data: ArrayBuffer;
  blob: Blob;
  url: string;
}

export async function downloadAndDecrypt(opts: {
  cid: string;
  iv: string;
  wrappedKey: WrappedKey;
  senderPublicKeyJwk: string;
  myUserId: string;
}): Promise<DecryptedResult> {
  // 1. Get my private key from IndexedDB
  const myKeys = await getKeyPair(opts.myUserId);
  if (!myKeys) {
    throw new Error("Encryption keys not found in this browser.");
  }

  // 2. Import sender's public key
  const senderPubKey = await importPublicKey(opts.senderPublicKeyJwk);

  // 3. Unwrap the AES session key
  const sessionKey = await unwrapSessionKey(
    opts.wrappedKey,
    myKeys.privateKey,
    senderPubKey,
  );

  // 4. Download encrypted blob from IPFS
  const encryptedBlob = await fetchFromGateway(opts.cid);

  // 5. Decrypt with AES-GCM
  const iv = decodeIv(opts.iv);
  const decrypted = await decryptData(encryptedBlob, sessionKey, iv);

  // 6. Create Blob and object URL
  const blob = new Blob([decrypted]);
  const url = URL.createObjectURL(blob);

  return { data: decrypted, blob, url };
}
