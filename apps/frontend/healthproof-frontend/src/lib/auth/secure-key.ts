"use server";

import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "crypto";
import { getKMSProvider } from "@/lib/kms/interface";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface KeyCache {
  key: string;
  expiresAt: number;
}

let keyCache: KeyCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the decrypted deployer private key via KMS provider
 * @deprecated Use getKMSProvider().getPrivateKey() directly for new code
 */
export async function getDeployerPrivateKey(): Promise<string> {
  // Check cache first
  if (keyCache && Date.now() < keyCache.expiresAt) {
    return keyCache.key;
  }

  const kms = getKMSProvider();
  const decrypted = await kms.getPrivateKey();

  // Cache for performance
  keyCache = {
    key: decrypted,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return decrypted;
}

/**
 * Get the Shamir encryption key via KMS provider
 */
export async function getShamirKey(): Promise<string> {
  const kms = getKMSProvider();
  return await kms.getShamirKey();
}

/**
 * Encrypt a private key for storage
 * Use this function to initially encrypt the key
 */
export function encryptPrivateKey(plainKey: string, encryptionPassword: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(encryptionPassword);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainKey.replace(/^0x/, ""), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt the stored key
 */
function decryptKey(encryptedData: string, encryptionPassword: string): string {
  const parts = encryptedData.split(":");
  
  if (parts.length !== 3) {
    throw new SecureKeyError("Invalid encrypted key format");
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = deriveKey(encryptionPassword);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Derive encryption key from password using scrypt
 */
function deriveKey(password: string): Buffer {
  // Use a fixed salt for deterministic key derivation
  // In production, you might want to store the salt separately
  const salt = Buffer.from("healthproof-salt-v1", "utf8");
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Clear the key cache (call after sensitive operations)
 */
export function clearKeyCache(): void {
  keyCache = null;
}

export class SecureKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecureKeyError";
  }
}

/**
 * Utility to encrypt key for initial setup
 * Run this once and store the result in DEPLOYER_PRIVATE_KEY_ENCRYPTED
 */
export function setupEncryptedKey(): void {
  const plainKey = process.env.DEPLOYER_PRIVATE_KEY;
  const encryptionKey = process.env.DEPLOYER_KEY_ENCRYPTION_KEY;
  
  if (!plainKey || !encryptionKey) {
    console.log("Set DEPLOYER_PRIVATE_KEY and DEPLOYER_KEY_ENCRYPTION_KEY env vars first");
    return;
  }
  
  const encrypted = encryptPrivateKey(plainKey, encryptionKey);
  console.log("\n=== ENCRYPTED KEY (store this in DEPLOYER_PRIVATE_KEY_ENCRYPTED) ===");
  console.log(encrypted);
  console.log("===================================================================\n");
  console.log("Remove DEPLOYER_PRIVATE_KEY from env after storing the encrypted version");
}
