import { encryptFile, hashFile, hashData } from "@/services/encryption/encrypt";
import { encodeIv } from "@/services/encryption/key-management";
import {
  uploadToIpfsAction,
  type IpfsUploadResult,
} from "@/actions/upload-to-ipfs";

export interface UploadResult {
  fileHash: string;
  ipfs: IpfsUploadResult;
  iv: string;
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
