"use client";

/**
 * Master secret generation from ECDH key pairs.
 *
 * Web Crypto does NOT support deriving ECDH keys from HKDF.
 * Practical approach for MVP:
 *   1. Generate ECDH P-256 keypair with extractable=true.
 *   2. Export privateKey as JWK string.
 *   3. That JWK string IS the master secret.
 *   4. SSS(2,3) over the JWK bytes (~250 bytes).
 *   5. To recover: reconstruct JWK bytes → parse → import as non-extractable.
 *
 * Recovery code format: base64 (BIP-39 does not scale to 250-byte secrets).
 */

const ECDH_CURVE = "P-256";

function jwkToBytes(jwk: JsonWebKey): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(jwk));
}

function bytesToJwk(bytes: Uint8Array): JsonWebKey {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(bytes)) as JsonWebKey;
}

/**
 * Generate a new ECDH keypair and return:
 * - masterSecret: the serialized privateKey JWK (bytes for SSS)
 * - publicKeyJwk: the publicKey JWK string (to store in DB)
 * - keyPair: the CryptoKey objects (privateKey is non-extractable)
 */
export async function generateMasterSecret(): Promise<{
  masterSecret: Uint8Array;
  publicKeyJwk: string;
  keyPair: CryptoKeyPair;
}> {
  // Generate extractable keypair temporarily
  const tempPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    ["deriveKey", "deriveBits"],
  );

  // Export privateKey JWK = this is our master secret
  const privateJwk = await crypto.subtle.exportKey("jwk", tempPair.privateKey);
  const masterSecret = jwkToBytes(privateJwk);

  // Export publicKey JWK for DB storage
  const publicJwk = await crypto.subtle.exportKey("jwk", tempPair.publicKey);
  const publicKeyJwk = JSON.stringify(publicJwk);

  // Re-import privateKey as non-extractable
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false,
    ["deriveKey", "deriveBits"],
  );

  return {
    masterSecret,
    publicKeyJwk,
    keyPair: { privateKey, publicKey: tempPair.publicKey },
  };
}

/**
 * Import a keypair from a reconstructed master secret (JWK bytes).
 * @param masterSecretBytes - reconstructed JWK bytes from SSS
 * @returns keyPair with non-extractable privateKey
 */
export async function importKeyPairFromMasterSecret(
  masterSecretBytes: Uint8Array,
): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string }> {
  const privateJwk = bytesToJwk(masterSecretBytes);

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false,
    ["deriveKey", "deriveBits"],
  );

  // Derive publicKey from privateKey JWK (JWK contains x,y coordinates)
  const publicJwk = { ...privateJwk };
  delete (publicJwk as Record<string, unknown>).d; // remove private component
  (publicJwk as Record<string, unknown>).key_ops = [];
  (publicJwk as Record<string, unknown>).ext = true;

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    [],
  );

  return {
    keyPair: { privateKey, publicKey },
    publicKeyJwk: JSON.stringify(publicJwk),
  };
}

/**
 * Legacy path: import from explicit private/public JWK objects.
 */
export async function importKeyPairFromJwk(
  privateJwk: JsonWebKey,
  publicJwk: JsonWebKey,
): Promise<CryptoKeyPair> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false,
    ["deriveKey", "deriveBits"],
  );

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    [],
  );

  return { privateKey, publicKey };
}
