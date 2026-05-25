"use client";

/**
 * Recovery code formatting for SSS share3.
 *
 * MVP: Base64 only. The master secret is a serialized ECDH JWK (~250 bytes),
 * so BIP-39 (max 32 bytes of entropy) does not scale. Future versions may
 * switch to a 32-byte random seed + HKDF once Web Crypto supports ECDH derivation.
 *
 * Format: base64 string, grouped by 4 characters for readability.
 */

/**
 * Encode a share3 into a human-readable recovery code.
 */
export function encodeRecoveryCode(share3: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...share3));
  const groups = base64.match(/.{1,4}/g) ?? [base64];
  return groups.join(" ");
}

/**
 * Decode a recovery code back into share3 bytes.
 */
export function decodeRecoveryCode(code: string): Uint8Array {
  const cleaned = code.replace(/\s/g, "");
  const binary = atob(cleaned);
  const share = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    share[i] = binary.charCodeAt(i);
  }
  return share;
}

/**
 * Normalize a recovery code input for hashing/verification.
 * Removes all whitespace.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/\s/g, "");
}

/**
 * Hash a recovery code for server-side verification.
 */
export async function hashRecoveryCode(normalizedCode: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(normalizedCode));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
