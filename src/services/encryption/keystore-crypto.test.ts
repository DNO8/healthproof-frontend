"use client";

import { describe, expect, it } from "vitest";
import {
  decryptShare1,
  encryptShare1,
  isEncryptedShare1,
} from "./keystore-crypto";

const TEST_USER_ID = "did:privy:test-user-123";
const TEST_SHARE1 =
  "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01";

describe("keystore-crypto (IndexedDB share1 encryption)", () => {
  it("encrypts and decrypts share1 roundtrip", async () => {
    const encrypted = await encryptShare1(TEST_SHARE1, TEST_USER_ID);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(isEncryptedShare1(encrypted)).toBe(true);

    const decrypted = await decryptShare1(encrypted, TEST_USER_ID);
    expect(decrypted).toBe(TEST_SHARE1);
  });

  it("produces different ciphertexts for same share1 (random IV)", async () => {
    const enc1 = await encryptShare1(TEST_SHARE1, TEST_USER_ID);
    const enc2 = await encryptShare1(TEST_SHARE1, TEST_USER_ID);
    expect(enc1).not.toBe(enc2);
  });

  it("returns legacy plaintext unchanged", async () => {
    const legacy = TEST_SHARE1;
    expect(isEncryptedShare1(legacy)).toBe(false);
    const decrypted = await decryptShare1(legacy, TEST_USER_ID);
    expect(decrypted).toBe(legacy);
  });

  it("fails decryption with wrong userId (different key)", async () => {
    const encrypted = await encryptShare1(TEST_SHARE1, TEST_USER_ID);
    // Different userId derives a different key → AES-GCM auth tag fails
    await expect(decryptShare1(encrypted, "wrong-user")).rejects.toThrow();
  });
});
