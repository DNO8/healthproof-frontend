"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { encryptShareForServer } from "@/lib/kms/server-share-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

async function saveServerShareHandler(
  data: { userId: string; share2: string },
  auth: AuthContext,
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
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
      scheme_version: 2,
    })
    .eq("id", data.userId)
    .select("id");

  if (error) {
    console.error("[saveServerShare] Error:", error);
    throw new Error("Failed to save server share");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when saving server share");
  }

  return { success: true };
}

export const saveServerShare = withAuth(saveServerShareHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 15 },
});
