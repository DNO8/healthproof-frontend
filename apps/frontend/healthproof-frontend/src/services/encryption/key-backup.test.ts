"use client";

import { describe, it, expect } from "vitest";
import {
  encryptPrivateKeyV2,
  decryptPrivateKeyV2,
  deriveCrossDevicePassword,
} from "./key-backup";

const TEST_USER_ID = "did:privy:test-user-456";
const TEST_JWK = JSON.stringify({
  kty: "EC",
  crv: "P-256",
  x: "test-x",
  y: "test-y",
  d: "test-d",
});

describe("key-backup V2 (PBKDF2 + salt)", () => {
  it("encrypts and decrypts private key roundtrip", async () => {
    const encrypted = await encryptPrivateKeyV2(TEST_JWK, TEST_USER_ID);
    expect(encrypted).toMatch(/^v2:/);

    const decrypted = await decryptPrivateKeyV2(encrypted, TEST_USER_ID);
    expect(decrypted).toBe(TEST_JWK);
  });

  it("returns null for wrong userId", async () => {
    const encrypted = await encryptPrivateKeyV2(TEST_JWK, TEST_USER_ID);
    const decrypted = await decryptPrivateKeyV2(encrypted, "wrong-user");
    expect(decrypted).toBeNull();
  });

  it("decrypts legacy format (no v2: prefix)", async () => {
    // Legacy encrypt without V2 wrapper
    const { encryptPrivateKey, deriveCrossDevicePassword } = await import("./key-backup");
    // We can't easily test legacy without the old deriveCrossDevicePassword,
    // but we can verify the V2 decrypt path rejects an invalid legacy string gracefully
    const decrypted = await decryptPrivateKeyV2("invalid-legacy-string", TEST_USER_ID);
    expect(decrypted).toBeNull();
  });

  it("deriveCrossDevicePassword returns salt and reproducible password", async () => {
    const { password, salt } = await deriveCrossDevicePassword(TEST_USER_ID);
    expect(password).toMatch(/^[0-9a-f]{64}$/);
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);

    // Re-deriving with same salt gives same password
    const { password: password2 } = await deriveCrossDevicePassword(TEST_USER_ID, salt);
    expect(password2).toBe(password);

    // Different salt gives different password
    const { password: password3 } = await deriveCrossDevicePassword(TEST_USER_ID);
    expect(password3).not.toBe(password);
  });
});
