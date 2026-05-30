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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a recovery code for server-side verification.
 * V2: uses a random 16-byte salt + SHA-256, returning `saltHex:hashHex`.
 * If no salt is provided, one is generated randomly.
 */
export async function hashRecoveryCode(
  normalizedCode: string,
  salt?: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  const combined = new Uint8Array(salt.length + encoder.encode(normalizedCode).length);
  combined.set(salt, 0);
  combined.set(encoder.encode(normalizedCode), salt.length);

  const hash = await crypto.subtle.digest("SHA-256", combined as BufferSource);
  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(hash))}`;
}

/**
 * Verify a recovery code against a stored hash.
 * Supports both V2 (`salt:hash`) and legacy V1 (plain hash) formats.
 */
export async function verifyRecoveryCodeHash(
  normalizedCode: string,
  storedHash: string,
): Promise<boolean> {
  // Legacy V1: plain SHA-256 hash (64 hex chars, no colon)
  if (!storedHash.includes(":")) {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(normalizedCode) as BufferSource,
    );
    const hashHex = bytesToHex(new Uint8Array(hash));
    return hashHex === storedHash;
  }

  // V2: salt:hash
  const [saltHex, expectedHash] = storedHash.split(":");
  if (!saltHex || !expectedHash) return false;
  const salt = hexToBytes(saltHex);
  const computed = await hashRecoveryCode(normalizedCode, salt);
  return computed === storedHash;
}
