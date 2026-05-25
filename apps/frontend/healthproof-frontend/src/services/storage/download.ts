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

async function fetchFromGateway(cid: string, timeoutMs = 30000): Promise<ArrayBuffer> {
  const url = `${GATEWAY_URL}/ipfs/${cid}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }
    return response.arrayBuffer();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("IPFS fetch timed out. The file may no longer be available on the gateway.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
  console.log("[downloadAndDecrypt] starting for CID:", opts.cid);

  // 1. Get my private key from IndexedDB
  const myKeys = await getKeyPair(opts.myUserId);
  console.log("[downloadAndDecrypt] myKeys found:", !!myKeys, "privateKey:", !!myKeys?.privateKey);
  if (!myKeys?.privateKey) {
    throw new Error("Encryption keys not found in this browser.");
  }

  // 2. Import sender's public key
  const senderPubKey = await importPublicKey(opts.senderPublicKeyJwk);
  console.log("[downloadAndDecrypt] senderPubKey imported");

  // 3. Unwrap the AES session key
  console.log("[downloadAndDecrypt] unwrapping session key...");
  const sessionKey = await unwrapSessionKey(
    opts.wrappedKey,
    myKeys.privateKey,
    senderPubKey,
  );
  console.log("[downloadAndDecrypt] sessionKey unwrapped");

  // 4. Download encrypted blob from IPFS
  console.log("[downloadAndDecrypt] fetching from IPFS...");
  const encryptedBlob = await fetchFromGateway(opts.cid);
  console.log("[downloadAndDecrypt] fetched encrypted blob, size:", encryptedBlob.byteLength);

  // 5. Decrypt with AES-GCM
  const iv = decodeIv(opts.iv);
  console.log("[downloadAndDecrypt] decoded IV, length:", iv.length);
  console.log("[downloadAndDecrypt] decrypting file data...");
  const decrypted = await decryptData(encryptedBlob, sessionKey, iv);
  console.log("[downloadAndDecrypt] file decrypted, size:", decrypted.byteLength);

  // 6. Create Blob and object URL
  const blob = new Blob([decrypted]);
  const url = URL.createObjectURL(blob);
  console.log("[downloadAndDecrypt] done, blob URL created");

  return { data: decrypted, blob, url };
}
