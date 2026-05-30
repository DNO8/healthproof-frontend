"use client";

import { describe, it, expect } from "vitest";
import { hashRecoveryCode, verifyRecoveryCodeHash } from "./recovery-code";

describe("recovery-code hash with salt", () => {
  it("hashes with random salt and returns salt:hash format", async () => {
    const hash = await hashRecoveryCode("test-code-1234");
    expect(hash).toMatch(/^([0-9a-f]{32}):([0-9a-f]{64})$/);
  });

  it("reproduces same hash with same salt", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash1 = await hashRecoveryCode("test-code-1234", salt);
    const hash2 = await hashRecoveryCode("test-code-1234", salt);
    expect(hash1).toBe(hash2);
  });

  it("verify returns true for matching code", async () => {
    const hash = await hashRecoveryCode("my-recovery-code");
    const valid = await verifyRecoveryCodeHash("my-recovery-code", hash);
    expect(valid).toBe(true);
  });

  it("verify returns false for wrong code", async () => {
    const hash = await hashRecoveryCode("correct-code");
    const valid = await verifyRecoveryCodeHash("wrong-code", hash);
    expect(valid).toBe(false);
  });

  it("verify supports legacy plain hash (no salt)", async () => {
    // Manually compute legacy SHA-256
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode("legacy-code") as BufferSource);
    const legacyHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const valid = await verifyRecoveryCodeHash("legacy-code", legacyHash);
    expect(valid).toBe(true);
  });
});
