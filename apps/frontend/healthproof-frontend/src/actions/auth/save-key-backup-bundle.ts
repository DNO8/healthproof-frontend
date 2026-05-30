"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";
import { encryptShareForServer } from "@/lib/kms/server-share-crypto";

interface KeyBackupBundle {
  userId: string;
  share2: string;
  recoveryCodeHash: string;
  masterSecretHash: string;
  publicKey: string;
}

/**
 * Atomically save all SSS v2 backup fields in a single Supabase transaction.
 * Prevents partial state where share2 is saved but recoveryCodeHash is not.
 */
async function saveKeyBackupBundleHandler(
  data: KeyBackupBundle,
  auth: AuthContext,
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: can only update your own backup");
  }

  // Validate share2 is a non-empty string
  if (!data.share2 || typeof data.share2 !== "string") {
    throw new Error("Invalid share2: must be a non-empty string");
  }

  // Encode share2 as UTF-8 bytes (secrets.js-grempe shares are opaque strings)
  const shareBytes = new TextEncoder().encode(data.share2);

  const encrypted = await encryptShareForServer(shareBytes);

  const supabase = createAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("users")
    .update({
      server_share_ciphertext: encrypted.encryptedShare,
      server_share_dek_ciphertext: encrypted.encryptedDek,
      server_share_kms_key_id: encrypted.kmsKeyId,
      recovery_code_hash: data.recoveryCodeHash,
      master_secret_hash: data.masterSecretHash,
      public_key: data.publicKey,
      scheme_version: 2,
    })
    .eq("id", data.userId)
    .select("id");

  if (error) {
    console.error("[saveKeyBackupBundle] Supabase error:", error);
    throw new Error("Failed to save key backup bundle");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when saving key backup bundle");
  }

  return { success: true };
}

export const saveKeyBackupBundle = withAuth(saveKeyBackupBundleHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 15 },
});
