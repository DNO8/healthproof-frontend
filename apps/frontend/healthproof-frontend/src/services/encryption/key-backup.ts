"use client";

/**
 * Helper functions for backing up and recovering private keys.
 * Uses PBKDF2 + AES-GCM for password-based encryption.
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from password using PBKDF2.
 */
async function deriveKey(
  password: string,
  salt: BufferSource,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a private key (as JWK string) with a password.
 * Returns base64-encoded ciphertext with salt and iv prepended.
 */
export async function encryptPrivateKey(
  privateKeyJwk: string,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(privateKeyJwk);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  // Combine: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a private key with a password.
 * Returns the private key JWK string or null if password is wrong.
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string,
): Promise<string | null> {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
      c.charCodeAt(0),
    );

    if (combined.length < SALT_LENGTH + IV_LENGTH) {
      return null;
    }

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // Wrong password or corrupted data
    return null;
  }
}

/**
 * Create a recovery password from user's email and Privy token.
 * Uses a combination of user-provided secret + wallet signature if available.
 */
/**
 * Derive a cross-device consistent password from userId only.
 * This ensures backups can be recovered on any device for the same user,
 * regardless of wallet address variations between devices.
 *
 * V2: uses PBKDF2 with 100k iterations and a random salt instead of
 * raw SHA-256, mitigating offline brute-force if the pepper is public.
 */
export async function deriveCrossDevicePassword(
  userId: string,
  salt?: Uint8Array,
): Promise<{ password: string; salt: Uint8Array }> {
  const pepper = process.env.NEXT_PUBLIC_KEY_BACKUP_PEPPER ?? "";
  const raw = `${userId}|${pepper}`;

  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(raw) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const password = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { password, salt };
}

/**
 * Legacy V1 derivation (SHA-256 direct). Kept for decrypting old backups.
 */
async function _deriveCrossDevicePasswordLegacy(
  userId: string,
): Promise<string> {
  const pepper = process.env.NEXT_PUBLIC_KEY_BACKUP_PEPPER ?? "";
  const raw = `${userId}|${pepper}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw) as BufferSource,
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a deterministic backup password from userId + walletAddress.
 * Uses SHA-256 for uniform length, with an optional pepper from env.
 * @deprecated Use deriveCrossDevicePassword for new backups. Kept for decrypting legacy backups.
 */
export async function deriveBackupPassword(
  userId: string,
  walletAddress: string,
): Promise<string> {
  const pepper = process.env.NEXT_PUBLIC_KEY_BACKUP_PEPPER ?? "";
  const raw = `${userId}|${walletAddress.toLowerCase()}|${pepper}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Return both cross-device and old-style backup passwords for migration.
 * [0] = cross-device consistent (userId only) — RECOMMENDED
 * [1] = old-style plain string (walletAddress|userId)
 */
export async function deriveLegacyBackupPassword(
  userId: string,
  walletAddress: string | null | undefined,
): Promise<[string, string]> {
  const { password } = await deriveCrossDevicePassword(userId);
  const oldPw = walletAddress
    ? `${walletAddress.toLowerCase()}|${userId}`
    : `${userId}|${userId}`;
  return [password, oldPw];
}

/**
 * Return all possible backup passwords to try when decrypting.
 * This handles all historical password derivation schemes for maximum compatibility.
 */
export async function deriveAllBackupPasswords(
  userId: string,
  walletAddress: string | null | undefined,
): Promise<string[]> {
  const passwords = new Set<string>();
  passwords.add((await deriveCrossDevicePassword(userId)).password);
  passwords.add(await deriveBackupPassword(userId, walletAddress ?? userId));
  const oldPw = walletAddress
    ? `${walletAddress.toLowerCase()}|${userId}`
    : `${userId}|${userId}`;
  passwords.add(oldPw);
  return [...passwords];
}

export function createRecoveryPassword(
  email: string,
  secretToken: string,
): string {
  // Combine email + secret token to create a stable password
  // This ensures the password is reproducible across sessions
  return `${email.toLowerCase().trim()}|${secretToken}`;
}

// ─── V2 wrappers: PBKDF2-hardened password + embedded salt ──────────────────

const V2_PREFIX = "v2:";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Encrypt a private key with the V2 strong derivation (PBKDF2 + random salt).
 * Format: v2:<hex(salt)>:<base64(aes_salt + iv + ciphertext)>.
 */
export async function encryptPrivateKeyV2(
  privateKeyJwk: string,
  userId: string,
): Promise<string> {
  const { password, salt } = await deriveCrossDevicePassword(userId);
  const encrypted = await encryptPrivateKey(privateKeyJwk, password);
  return `${V2_PREFIX}${bytesToHex(salt)}:${encrypted}`;
}

/**
 * Decrypt a private key supporting both V2 (PBKDF2+salt) and legacy formats.
 */
export async function decryptPrivateKeyV2(
  encryptedData: string,
  userId: string,
): Promise<string | null> {
  if (!encryptedData.startsWith(V2_PREFIX)) {
    // Legacy: try all historical passwords
    const passwords = await deriveAllBackupPasswords(userId, null);
    for (const pw of passwords) {
      const result = await decryptPrivateKey(encryptedData, pw);
      if (result) return result;
    }
    return null;
  }

  const body = encryptedData.slice(V2_PREFIX.length);
  const colonIdx = body.indexOf(":");
  if (colonIdx === -1) return null;

  const saltHex = body.slice(0, colonIdx);
  const encrypted = body.slice(colonIdx + 1);

  const salt = hexToBytes(saltHex);
  const { password } = await deriveCrossDevicePassword(userId, salt);
  return decryptPrivateKey(encrypted, password);
}
