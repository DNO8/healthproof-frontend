import {
  type IpfsUploadResult,
  uploadToIpfsAction,
} from "@/actions/documents/upload-to-ipfs";
import { isPdfFile } from "@/lib/validate-file";
import {
  exportPublicKey,
  importPublicKey,
  type WrappedKey,
  wrapSessionKey,
} from "@/services/encryption/ecdh";
import { encryptFile, hashData, hashFile } from "@/services/encryption/encrypt";
import {
  encodeIv,
  generateEncryptionKey,
} from "@/services/encryption/key-management";

export interface UploadResult {
  fileHash: string;
  ipfs: IpfsUploadResult;
  iv: string;
}

export interface HybridUploadResult extends UploadResult {
  encryptedKeys: Record<string, WrappedKey>;
  uploaderPublicKey: string;
}

export interface HybridRecipient {
  wallet: string;
  publicKeyJwk: string;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function isValidEvmAddress(value: string): boolean {
  return typeof value === "string" && EVM_ADDRESS_RE.test(value);
}

function isValidEcdhP256Jwk(
  jwk: unknown,
): jwk is { kty: "EC"; crv: "P-256"; x: string; y: string } {
  if (typeof jwk !== "object" || jwk === null) return false;
  const k = jwk as Record<string, unknown>;
  return (
    k.kty === "EC" &&
    k.crv === "P-256" &&
    typeof k.x === "string" &&
    k.x.length > 0 &&
    typeof k.y === "string" &&
    k.y.length > 0
  );
}

function validateRecipients(recipients: HybridRecipient[]): void {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("AtLeastOneRecipientRequired");
  }
  for (const r of recipients) {
    if (!r || typeof r !== "object") throw new Error("InvalidRecipient");
    if (!isValidEvmAddress(r.wallet)) throw new Error("InvalidRecipient");
    if (!isValidEcdhP256Jwk(JSON.parse(r.publicKeyJwk)))
      throw new Error("InvalidRecipient");
  }
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
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed.");
  }
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
  myPublicKey: CryptoKey,
  recipients: HybridRecipient[],
): Promise<HybridUploadResult> {
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed.");
  }
  if (file.size === 0) {
    throw new Error("InvalidPayload");
  }
  validateRecipients(recipients);

  // 1. Generate random AES-256 session key
  const sessionKey = await generateEncryptionKey();

  // 2. Encrypt file with AES-GCM
  const fileHash = await hashFile(file);
  const { encrypted, iv } = await encryptFile(file, sessionKey);

  // 3. Upload encrypted blob to IPFS
  const ipfs = await sendToIpfs(encrypted, `${fileHash}-${file.name}.enc`);

  // 4. Wrap session key for each recipient (normalized lowercase wallet)
  const encryptedKeys: Record<string, WrappedKey> = {};
  for (const r of recipients) {
    const recipientPubKey = await importPublicKey(r.publicKeyJwk);
    encryptedKeys[r.wallet.toLowerCase()] = await wrapSessionKey(
      sessionKey,
      myPrivateKey,
      recipientPubKey,
    );
  }

  const uploaderPublicKey = await exportPublicKey(myPublicKey);

  return {
    fileHash,
    ipfs,
    iv: encodeIv(iv),
    encryptedKeys,
    uploaderPublicKey,
  };
}

export async function uploadHybridEncryptedJson(
  data: object,
  fileName: string,
  myPrivateKey: CryptoKey,
  myPublicKey: CryptoKey,
  recipients: HybridRecipient[],
): Promise<HybridUploadResult> {
  if (
    !data ||
    typeof data !== "object" ||
    Object.keys(data).length === 0 ||
    (Array.isArray(data) && data.length === 0)
  ) {
    throw new Error("InvalidPayload");
  }
  validateRecipients(recipients);

  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(jsonString).buffer as ArrayBuffer;

  // 1. Generate random AES-256 session key
  const sessionKey = await generateEncryptionKey();

  // 2. Encrypt JSON with AES-GCM
  const fileHash = await hashData(buffer);
  const { encrypted, iv } = await encryptFile(
    new File([buffer], `${fileName}.json`),
    sessionKey,
  );

  // 3. Upload encrypted blob to IPFS
  const ipfs = await sendToIpfs(encrypted, `${fileHash}-${fileName}.enc`);

  // 4. Wrap session key for each recipient (normalized lowercase wallet)
  const encryptedKeys: Record<string, WrappedKey> = {};
  for (const r of recipients) {
    const recipientPubKey = await importPublicKey(r.publicKeyJwk);
    encryptedKeys[r.wallet.toLowerCase()] = await wrapSessionKey(
      sessionKey,
      myPrivateKey,
      recipientPubKey,
    );
  }

  const uploaderPublicKey = await exportPublicKey(myPublicKey);

  return {
    fileHash,
    ipfs,
    iv: encodeIv(iv),
    encryptedKeys,
    uploaderPublicKey,
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
