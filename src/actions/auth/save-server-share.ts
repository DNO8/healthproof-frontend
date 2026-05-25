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

  const shareBytes = new Uint8Array(
    data.share2.split("").map((c) => c.charCodeAt(0))
  );

  const encrypted = await encryptShareForServer(shareBytes);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      server_share_ciphertext: encrypted.encryptedShare,
      server_share_dek_ciphertext: encrypted.encryptedDek,
      server_share_kms_key_id: encrypted.kmsKeyId,
      scheme_version: 2,
    })
    .eq("id", data.userId);

  if (error) {
    console.error("[saveServerShare] Error:", error);
    throw new Error("Failed to save server share");
  }

  return { success: true };
}

export const saveServerShare = withAuth(saveServerShareHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});
