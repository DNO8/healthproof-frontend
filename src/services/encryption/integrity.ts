"use client";

/**
 * Integrity helpers for the master secret.
 * SHA-256 is used to verify that reconstructed shares produce the original secret.
 */

/**
 * Compute SHA-256 of raw bytes and return as hex string.
 */
export async function hashMasterSecret(secret: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", secret.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Quick equality check of two hex strings (constant-time-ish via length then value).
 */
export function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
