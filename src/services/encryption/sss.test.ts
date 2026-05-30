"use client";

import { describe, it, expect } from "vitest";
import { generateShares, reconstructSecret, validateReconstruction } from "./sss";
import { hashMasterSecret } from "./integrity";

describe("SSS(2,3) over ECDH JWK-sized secrets", () => {
  const sampleSecret = new TextEncoder().encode(
    JSON.stringify({
      kty: "EC",
      crv: "P-256",
      d: "sample-private-key-component-here-long-enough-to-test",
      x: "sample-public-x-coordinate-here-long-enough",
      y: "sample-public-y-coordinate-here-long-enough",
    }),
  );

  it("splits into 3 shares and any 2 reconstruct the original", async () => {
    const shares = generateShares(sampleSecret, 2, 3);
    expect(shares.length).toBe(3);

    const combos = [
      [shares[0], shares[1]],
      [shares[0], shares[2]],
      [shares[1], shares[2]],
      [shares[0], shares[1], shares[2]],
    ];

    for (const combo of combos) {
      const reconstructed = reconstructSecret(combo);
      expect(new Uint8Array(reconstructed)).toEqual(sampleSecret);
    }
  });

  it("fails to reconstruct from a single share", () => {
    const shares = generateShares(sampleSecret, 2, 3);
    expect(() => reconstructSecret([shares[0]])).toThrow(
      "At least 2 shares are required",
    );
  });

  it("single share does not leak the secret", () => {
    const shares = generateShares(sampleSecret, 2, 3);
    const single = new Uint8Array(reconstructSecret([shares[0], shares[0]])); // trick: same share twice
    expect(single).not.toEqual(sampleSecret);
  });

  it("detects tampering via integrity hash", async () => {
    const shares = generateShares(sampleSecret, 2, 3);
    const hash = await hashMasterSecret(sampleSecret);

    // Valid reconstruction
    expect(await validateReconstruction([shares[0], shares[1]], hash)).toBe(true);

    // Tamper one byte of share1
    const tamperedShare = shares[0];
    const tamperedBytes = new Uint8Array(tamperedShare.length);
    for (let i = 0; i < tamperedBytes.length; i++) {
      tamperedBytes[i] = tamperedShare.charCodeAt(i);
    }
    tamperedBytes[tamperedBytes.length - 1] ^= 0xff;
    let tamperedStr = "";
    for (let i = 0; i < tamperedBytes.length; i++) {
      tamperedStr += String.fromCharCode(tamperedBytes[i]);
    }

    expect(await validateReconstruction([tamperedStr, shares[1]], hash)).toBe(false);
  });

  it("roundtrip serialization of shares", () => {
    const shares = generateShares(sampleSecret, 2, 3);
    // secrets.js-grempe returns hex strings; verify they are valid hex
    for (const share of shares) {
      expect(share).toMatch(/^[0-9a-f]+$/i);
      expect(share.length).toBeGreaterThan(0);
    }
  });

  it("extract share3 and reconstruct with share2", () => {
    const shares = generateShares(sampleSecret, 2, 3);
    const [, , share3] = shares;
    const share2 = shares[1];
    const reconstructed = reconstructSecret([share2, share3]);
    expect(new Uint8Array(reconstructed)).toEqual(sampleSecret);
  });
});
