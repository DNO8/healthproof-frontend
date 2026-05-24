"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

const SHAMIR_ENCRYPTION_KEY = process.env.SHAMIR_ENCRYPTION_KEY;

/**
 * Save an encrypted Shamir share to the user's record.
 * The share is encrypted with SHAMIR_ENCRYPTION_KEY (server secret).
 */
async function saveKeyShareHandler(
  data: { userId: string; share: string },
  auth: AuthContext
): Promise<{ success: boolean }> {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  if (!SHAMIR_ENCRYPTION_KEY) {
    throw new Error("Server configuration error: SHAMIR_ENCRYPTION_KEY not set");
  }

  const encryptedShare = await encryptShare(data.share, SHAMIR_ENCRYPTION_KEY);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      key_share: encryptedShare,
      key_version: 1,
    })
    .eq("id", data.userId);

  if (error) {
    console.error("[saveKeyShare] Error:", error);
    throw new Error("Failed to save key share");
  }

  return { success: true };
}

export const saveKeyShare = withAuth(saveKeyShareHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});

// ─── Server-side share encryption ───────────────────────

async function encryptShare(
  share: string,
  key: string
): Promise<string> {
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  const KEY_LENGTH = 32;

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["encrypt"]
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(share)
  );

  // Combine: salt + iv + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}
