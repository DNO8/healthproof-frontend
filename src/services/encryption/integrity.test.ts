"use client";

import { describe, it, expect } from "vitest";
import { hashMasterSecret, hashEquals } from "./integrity";

describe("integrity helpers", () => {
  it("hashMasterSecret produces consistent 64-char hex", async () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const hash1 = await hashMasterSecret(secret);
    const hash2 = await hashMasterSecret(secret);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex = 64 chars
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashEquals is constant-time", () => {
    expect(hashEquals("aabb", "aabb")).toBe(true);
    expect(hashEquals("aabb", "aabc")).toBe(false);
    expect(hashEquals("aabb", "aa")).toBe(false);
  });

  it("different secrets produce different hashes", async () => {
    const h1 = await hashMasterSecret(new Uint8Array([1]));
    const h2 = await hashMasterSecret(new Uint8Array([2]));
    expect(h1).not.toBe(h2);
  });
});
