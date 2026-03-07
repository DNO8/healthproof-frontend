// Hybrid encryption using ECDH P-256 + AES-GCM (Web Crypto API)
// Used to wrap/unwrap AES-256 session keys for multi-party access

const ECDH_CURVE = "P-256";
const DERIVED_KEY_ALGO = { name: "AES-GCM", length: 256 } as const;
const HKDF_HASH = "SHA-256";
const HKDF_INFO = new TextEncoder().encode("HealthProof-ECDH-v1");

// ─── Key Pair Generation ────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false, // private key NOT extractable
    ["deriveKey", "deriveBits"],
  );
}

// ─── Public Key Export / Import ─────────────────────────

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    [],
  );
}

// ─── Shared Secret Derivation ───────────────────────────

async function deriveSharedBits(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
}

async function deriveWrappingKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  const sharedBits = await deriveSharedBits(privateKey, publicKey);

  // Import shared bits as HKDF key material
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );

  // Derive AES-GCM wrapping key via HKDF
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt: new Uint8Array(32), // static salt (key uniqueness comes from ECDH)
      info: HKDF_INFO,
    },
    hkdfKey,
    DERIVED_KEY_ALGO,
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── Wrap / Unwrap AES Session Key ──────────────────────

export interface WrappedKey {
  data: string; // base64-encoded encrypted AES key
  iv: string; // base64-encoded IV used for wrapping
}

export async function wrapSessionKey(
  sessionKey: CryptoKey,
  myPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<WrappedKey> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, recipientPublicKey);

  // Export session key as raw bytes
  const rawKey = await crypto.subtle.exportKey("raw", sessionKey);

  // Encrypt the raw key with the derived wrapping key
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawKey,
  );

  return {
    data: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

export async function unwrapSessionKey(
  wrapped: WrappedKey,
  myPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(myPrivateKey, senderPublicKey);

  const encryptedData = base64ToArrayBuffer(wrapped.data);
  const iv = new Uint8Array(base64ToArrayBuffer(wrapped.iv));

  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encryptedData,
  );

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    DERIVED_KEY_ALGO,
    true, // exportable so it can be re-wrapped for sharing
    ["encrypt", "decrypt"],
  );
}

// ─── Helpers ────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
