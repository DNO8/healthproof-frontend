"use client";

/**
 * Helper functions for backing up and recovering private keys.
 * Uses PBKDF2 + AES-GCM for password-based encryption.
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from password using PBKDF2.
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a private key (as JWK string) with a password.
 * Returns base64-encoded ciphertext with salt and iv prepended.
 */
export async function encryptPrivateKey(
  privateKeyJwk: string,
  password: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt.buffer);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(privateKeyJwk);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Combine: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a private key with a password.
 * Returns the private key JWK string or null if password is wrong.
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string
): Promise<string | null> {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

    if (combined.length < SALT_LENGTH + IV_LENGTH) {
      return null;
    }

    const salt = combined.slice(0, SALT_LENGTH).buffer;
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH).buffer;

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // Wrong password or corrupted data
    return null;
  }
}

/**
 * Create a recovery password from user's email and Privy token.
 * Uses a combination of user-provided secret + wallet signature if available.
 */
export function createRecoveryPassword(
  email: string,
  secretToken: string
): string {
  // Combine email + secret token to create a stable password
  // This ensures the password is reproducible across sessions
  return `${email.toLowerCase().trim()}|${secretToken}`;
}
