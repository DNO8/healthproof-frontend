import { encryptFile, hashFile, hashData } from "@/services/encryption/encrypt";
import {
  generateEncryptionKey,
  encodeIv,
} from "@/services/encryption/key-management";
import {
  uploadToIpfsAction,
  type IpfsUploadResult,
} from "@/actions/upload-to-ipfs";
import {
  wrapSessionKey,
  importPublicKey,
  type WrappedKey,
} from "@/services/encryption/ecdh";

export interface UploadResult {
  fileHash: string;
  ipfs: IpfsUploadResult;
  iv: string;
}

export interface HybridUploadResult extends UploadResult {
  encryptedKeys: Record<string, WrappedKey>;
}

export interface Recipient {
  userId: string;
  publicKeyJwk: string;
}

async function sendToIpfs(
  data: ArrayBuffer,
  fileName: string,
): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append(
    "file",
    new File([data], fileName, { type: "application/octet-stream" }),
  );
  return uploadToIpfsAction(formData);
}

export async function uploadEncryptedFile(
  file: File,
  encryptionKey: CryptoKey,
): Promise<UploadResult> {
  const fileHash = await hashFile(file);
  const { encrypted, iv } = await encryptFile(file, encryptionKey);

  const ipfs = await sendToIpfs(encrypted, `${fileHash}-${file.name}.enc`);

  return {
    fileHash,
    ipfs,
    iv: encodeIv(iv),
  };
}

export async function uploadHybridEncryptedFile(
  file: File,
  myPrivateKey: CryptoKey,
  recipients: Recipient[],
): Promise<HybridUploadResult> {
  // 1. Generate random AES-256 session key
  const sessionKey = await generateEncryptionKey();

  // 2. Encrypt file with AES-GCM
  const fileHash = await hashFile(file);
  const { encrypted, iv } = await encryptFile(file, sessionKey);

  // 3. Upload encrypted blob to IPFS
  const ipfs = await sendToIpfs(encrypted, `${fileHash}-${file.name}.enc`);

  // 4. Wrap session key for each recipient
  const encryptedKeys: Record<string, WrappedKey> = {};
  for (const r of recipients) {
    const recipientPubKey = await importPublicKey(r.publicKeyJwk);
    encryptedKeys[r.userId] = await wrapSessionKey(
      sessionKey,
      myPrivateKey,
      recipientPubKey,
    );
  }

  return {
    fileHash,
    ipfs,
    iv: encodeIv(iv),
    encryptedKeys,
  };
}

export async function uploadEncryptedJson(
  data: object,
  encryptionKey: CryptoKey,
  name: string,
): Promise<UploadResult> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(jsonString).buffer as ArrayBuffer;

  const fileHash = await hashData(buffer);

  const { encrypted, iv } = await encryptFile(
    new File([buffer], `${name}.json`),
    encryptionKey,
  );

  const ipfs = await sendToIpfs(encrypted, `${fileHash}-${name}.enc`);

  return {
    fileHash,
    ipfs,
    iv: encodeIv(iv),
  };
}
