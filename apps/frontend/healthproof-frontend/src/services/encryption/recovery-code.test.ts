"use client";

import { describe, expect, it } from "vitest";
import { decodeRecoveryCode, encodeRecoveryCode } from "./recovery-code";

describe("recovery-code encode/decode", () => {
  it("roundtrip: encode then decode returns original bytes", () => {
    const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe]);
    const encoded = encodeRecoveryCode(original);
    const decoded = decodeRecoveryCode(encoded);
    expect(decoded).toEqual(original);
  });

  it("encode produces a non-empty string", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02]);
    const encoded = encodeRecoveryCode(bytes);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("decode normalizes whitespace before decoding", () => {
    const original = new Uint8Array([0xab, 0xcd, 0xef]);
    const encoded = encodeRecoveryCode(original);
    // Inject whitespace (spaces and newlines) into the encoded string
    const tampered = `${encoded.slice(0, 3)} ${encoded.slice(3, 6)}\n${encoded.slice(6)}`;
    const decoded = decodeRecoveryCode(tampered);
    expect(decoded).toEqual(original);
  });

  it("decode throws on invalid base64", () => {
    expect(() => decodeRecoveryCode("!!!invalid!!!")).toThrow();
  });
});
