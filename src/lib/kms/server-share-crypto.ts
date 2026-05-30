"use server";

/**
 * Envelope encryption for the server-side SSS share (share2).
 * Uses AWS KMS to generate a unique Data Encryption Key (DEK) per user,
 * then encrypts the share with AES-GCM. The DEK itself is encrypted
 * by the KMS Customer Master Key (CMK) and stored alongside the ciphertext.
 *
 * The server never sees the DEK in plaintext after generation.
 */

import {
  GenerateDataKeyCommand,
  DecryptCommand,
  EncryptCommand,
} from "@aws-sdk/client-kms";
import { kmsClient } from "./client";

function getKmsKeyId(): string {
  const keyId = process.env.AWS_KMS_KEY_ID;
  if (!keyId) {
    throw new Error("AWS_KMS_KEY_ID not configured");
  }
  return keyId;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedServerShare {
  encryptedShare: string; // base64 share ciphertext
  encryptedDek: string; // base64 DEK ciphertext (wrapped by CMK)
  kmsKeyId: string;
}

/**
 * Encrypt a share using envelope encryption via AWS KMS.
 * 1. Ask KMS for a new DEK.
 * 2. Encrypt share with DEK via AES-GCM.
 * 3. Return ciphertext + encrypted DEK (DEK is destroyed from memory).
 */
export async function encryptShareForServer(
  share: Uint8Array,
): Promise<EncryptedServerShare> {
  const keyId = getKmsKeyId();

  // 1. Generate DEK from KMS
  const genCmd = new GenerateDataKeyCommand({
    KeyId: keyId,
    KeySpec: "AES_256",
  });
  const genRes = await kmsClient.send(genCmd);

  if (!genRes.Plaintext || !genRes.CiphertextBlob) {
    throw new Error("KMS GenerateDataKey returned empty key material");
  }

  const dek = new Uint8Array(genRes.Plaintext);
  const encryptedDek = new Uint8Array(genRes.CiphertextBlob);

  // 2. Encrypt share with DEK via AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dekKey = await crypto.subtle.importKey(
    "raw",
    dek as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    dekKey,
    share as BufferSource,
  );

  // 3. Wipe DEK from memory (best effort in JS)
  dek.fill(0);

  // Combine IV + ciphertext for storage
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return {
    encryptedShare: arrayBufferToBase64(combined),
    encryptedDek: arrayBufferToBase64(encryptedDek),
    kmsKeyId: keyId,
  };
}

/**
 * Decrypt a server share using envelope encryption.
 * 1. Ask KMS to decrypt the DEK.
 * 2. Decrypt share with DEK via AES-GCM.
 * 3. Wipe DEK from memory.
 */
export async function decryptShareForServer(
  encrypted: EncryptedServerShare,
): Promise<Uint8Array> {
  getKmsKeyId(); // validate env is present

  // 1. Decrypt DEK via KMS
  const decryptDekCmd = new DecryptCommand({
    KeyId: encrypted.kmsKeyId,
    CiphertextBlob: base64ToUint8Array(encrypted.encryptedDek),
  });
  const decryptDekRes = await kmsClient.send(decryptDekCmd);

  if (!decryptDekRes.Plaintext) {
    throw new Error("KMS Decrypt returned empty plaintext");
  }

  const dek = new Uint8Array(decryptDekRes.Plaintext);

  // 2. Decrypt share with DEK
  const combined = base64ToUint8Array(encrypted.encryptedShare);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const dekKey = await crypto.subtle.importKey(
    "raw",
    dek as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    dekKey,
    ciphertext as BufferSource,
  );

  // 3. Wipe DEK
  dek.fill(0);

  return new Uint8Array(plaintext);
}
