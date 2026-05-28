"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";
import { encryptShareForServer } from "@/lib/kms/server-share-crypto";

async function saveServerShareHandler(
  data: { userId: string; share2: string },
  auth: AuthContext
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  // Convert hex string share to actual bytes before encryption
  const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  };
  const shareBytes = hexToBytes(data.share2);

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
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
