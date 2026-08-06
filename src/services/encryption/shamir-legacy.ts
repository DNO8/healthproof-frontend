"use client";

/**
 * Shamir's Secret Sharing over GF(2^8).
 * Uses AES irreducible polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1).
 *
 * Splits a secret into N shares where any K shares can reconstruct.
 * We use K=2, N=2 for our use case (1 server share + 1 client-derived share).
 */

const IRREDUCIBLE_POLY = 0x11d; // x^8 + x^4 + x^3 + x^2 + 1

// ─── GF(2^8) arithmetic ─────────────────────────────────

/**
 * Multiply two elements in GF(2^8).
 */
function gfMul(a: number, b: number): number {
  let result = 0;
  let aa = a & 0xff;
  let bb = b & 0xff;
  for (let i = 0; i < 8; i++) {
    if (bb & 1) {
      result ^= aa;
    }
    const highBitSet = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (highBitSet) {
      aa ^= IRREDUCIBLE_POLY & 0xff;
    }
    bb >>= 1;
  }
  return result;
}

/**
 * Compute multiplicative inverse in GF(2^8) using extended Euclidean algorithm.
 */
function gfInv(a: number): number {
  if (a === 0) throw new Error("Division by zero in GF(2^8)");
  const m = IRREDUCIBLE_POLY;
  let x = 0;
  let y = 1;
  let aa = a & 0xff;
  let bb = m;

  while (aa !== 0) {
    const q = degree(bb) - degree(aa);
    if (q < 0) {
      [aa, bb] = [bb, aa];
      [x, y] = [y, x];
      continue;
    }
    bb ^= aa << q;
    y ^= x << q;
  }
  return y & 0xff;
}

function degree(a: number): number {
  let d = 0;
  let v = a;
  while (v !== 0) {
    d++;
    v >>= 1;
  }
  return d - 1;
}

/**
 * Evaluate a polynomial at point x using Horner's method.
 * coefficients[0] is the secret (constant term).
 */
function evalPoly(coefficients: Uint8Array, x: number): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = gfMul(result, x) ^ coefficients[i];
  }
  return result;
}

/**
 * Lagrange interpolation at x=0 to recover the secret.
 * points: array of [x, y] pairs.
 */
function interpolate(points: Array<[number, number]>): number {
  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let numerator = 1;
    let denominator = 1;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        numerator = gfMul(numerator, points[j][0]);
        denominator = gfMul(denominator, points[j][0] ^ points[i][0]);
      }
    }
    const term = gfMul(points[i][1], gfInv(denominator));
    result ^= gfMul(term, numerator);
  }
  return result;
}

// ─── Public API ─────────────────────────────────────────

/**
 * Generate N shares from a secret, requiring K shares to reconstruct.
 * @param secret - The secret bytes to split
 * @param threshold - Minimum number of shares needed (K)
 * @param total - Total number of shares to generate (N)
 * @returns Array of shares, each is [x, y] where x is the share index
 */
export function generateShares(
  secret: Uint8Array,
  threshold: number,
  total: number,
): Array<Uint8Array> {
  const shares: Array<Uint8Array> = [];

  for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
    // Generate random coefficients for this byte
    const coefficients = new Uint8Array(threshold);
    coefficients[0] = secret[byteIndex];
    for (let i = 1; i < threshold; i++) {
      coefficients[i] = Math.floor(Math.random() * 256);
    }

    // Evaluate polynomial at share points (x = 1, 2, ..., total)
    for (let shareIndex = 0; shareIndex < total; shareIndex++) {
      if (!shares[shareIndex]) {
        shares[shareIndex] = new Uint8Array(secret.length + 1);
        shares[shareIndex][0] = shareIndex + 1; // x-coordinate
      }
      shares[shareIndex][byteIndex + 1] = evalPoly(
        coefficients,
        shareIndex + 1,
      );
    }
  }

  return shares;
}

/**
 * Reconstruct the secret from at least K shares.
 * @param shares - Array of shares (each is Uint8Array with first byte as x)
 * @returns The reconstructed secret
 */
export function reconstructSecret(shares: Array<Uint8Array>): Uint8Array {
  if (shares.length < 2) {
    throw new Error("At least 2 shares are required for reconstruction");
  }

  const secretLength = shares[0].length - 1;
  const secret = new Uint8Array(secretLength);

  for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
    const points: Array<[number, number]> = [];
    for (const share of shares) {
      points.push([share[0], share[byteIndex + 1]]);
    }
    secret[byteIndex] = interpolate(points);
  }

  return secret;
}

/**
 * Serialize a share to base64 string.
 */
export function shareToBase64(share: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < share.length; i++) {
    binary += String.fromCharCode(share[i]);
  }
  return btoa(binary);
}

/**
 * Deserialize a share from base64 string.
 */
export function shareFromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
}

/**
 * Derive a deterministic share from a seed string.
 * Used for share 2 which is derived from walletAddress + userId.
 * Returns a share with x=2.
 */
export async function deriveShareFromSeed(
  seed: string,
  secretLength: number,
): Promise<Uint8Array> {
  // Use Web Crypto to derive deterministic bytes from seed
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(seed),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("HealthProof-Shamir-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    secretLength * 8,
  );

  const bytes = new Uint8Array(bits);
  const share = new Uint8Array(secretLength + 1);
  share[0] = 2; // x-coordinate for derived share
  share.set(bytes, 1);
  return share;
}
