"use client";

/**
 * IndexedDB share1 encryption layer.
 *
 * share1 (SSS local share) is encrypted at rest with AES-GCM using a key
 * derived from userId + NEXT_PUBLIC_KEY_BACKUP_PEPPER via PBKDF2.
 *
 * This protects against malware / browser extensions that can read
 * IndexedDB, because they would also need the per-user derived key.
 *
 * Design: low coupling — keystore.ts calls these helpers without knowing
 * the crypto details; high cohesion — all IndexedDB crypto lives here.
 */

const DB_KEY_ITERATIONS = 100_000;
const DB_KEY_LENGTH = 32; // 256 bits for AES-GCM
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:v1:";

function getPepper(): string {
  return process.env.NEXT_PUBLIC_KEY_BACKUP_PEPPER ?? "";
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/**
 * Derive an AES-GCM key from userId + pepper using PBKDF2.
 * The salt is deterministic (SHA-256 of userId) so the same key is
 * reproduced on every device for the same user, without storing salt.
 */
async function deriveIndexedDbKey(userId: string): Promise<CryptoKey> {
  const pepper = getPepper();
  const password = `${userId}|${pepper}`;

  // Deterministic salt so decryption works across devices
  const saltBuffer = await crypto.subtle.digest(
    "SHA-256",
    utf8(userId) as BufferSource,
  );
  const salt = new Uint8Array(saltBuffer).slice(0, SALT_LENGTH);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    utf8(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: DB_KEY_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: DB_KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a share1 hex string for IndexedDB storage.
 * Returns a prefixed base64 string: enc:v1:<base64(iv + ciphertext)>.
 */
export async function encryptShare1(
  share1: string,
  userId: string,
): Promise<string> {
  const key = await deriveIndexedDbKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = utf8(share1);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext as BufferSource,
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  const base64 = btoa(String.fromCharCode(...combined));
  return `${ENCRYPTED_PREFIX}${base64}`;
}

/**
 * Decrypt a share1 from IndexedDB storage.
 * Accepts both encrypted (prefixed) and legacy plaintext hex.
 */
export async function decryptShare1(
  encrypted: string,
  userId: string,
): Promise<string> {
  // Legacy plaintext (hex string, no prefix)
  if (!encrypted.startsWith(ENCRYPTED_PREFIX)) {
    return encrypted;
  }

  const base64 = encrypted.slice(ENCRYPTED_PREFIX.length);
  const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  if (combined.length < IV_LENGTH) {
    throw new Error("Invalid encrypted share1: too short");
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const key = await deriveIndexedDbKey(userId);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Return true if the stored value appears to be an encrypted share1.
 */
export function isEncryptedShare1(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}
