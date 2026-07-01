"use client";

/**
 * Shamir's Secret Sharing (2,3) via secrets.js-grempe.
 * Cryptographically secure: uses crypto.getRandomValues for entropy.
 *
 * Usable secret size: up to 512 bytes (librería usa 8-bit chars internamente).
 * Shares: hex strings, each prefixed with x-coordinate in header byte.
 */

import * as secrets from "secrets.js-grempe";

const _BITS = 8; // GF(2^8), max secret length ~512 bytes

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Split a secret into N shares where any K can reconstruct.
 * @param secret - Raw bytes to split
 * @param threshold - K (min shares needed)
 * @param total - N (total shares)
 * @returns Array of shares as hex strings (each includes x-coordinate in header)
 */
const MAX_SECRET_LENGTH = 512; // BITS=8 max for secrets.js-grempe

export function generateShares(
  secret: Uint8Array,
  threshold: number,
  total: number,
): string[] {
  if (secret.length > MAX_SECRET_LENGTH) {
    throw new Error(
      `Secret too long for SSS with BITS=8 (max ${MAX_SECRET_LENGTH} bytes, got ${secret.length})`,
    );
  }
  const secretHex = bytesToHex(secret);
  // secrets.js-grempe: (secret, numShares, threshold, [padLength])
  // padLength defaults to 128 bits; do NOT pass BITS here.
  const shares = secrets.share(secretHex, total, threshold);
  return shares;
}

/**
 * Reconstruct the secret from at least K shares.
 * @param shares - Array of share hex strings
 * @returns The reconstructed raw bytes
 */
export function reconstructSecret(shares: string[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error("At least 2 shares are required for reconstruction");
  }
  const reconstructedHex = secrets.combine(shares);
  return hexToBytes(reconstructedHex);
}

/**
 * Validate that a reconstructed secret matches an expected hash.
 * @param shares - Shares used for reconstruction
 * @param expectedHash - Hex-encoded SHA-256 hash
 * @returns true if reconstruction yields matching hash
 */
export async function validateReconstruction(
  shares: string[],
  expectedHash: string,
): Promise<boolean> {
  try {
    const reconstructed = reconstructSecret(shares);
    const hash = await crypto.subtle.digest(
      "SHA-256",
      reconstructed.buffer as ArrayBuffer,
    );
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex === expectedHash;
  } catch {
    return false;
  }
}
