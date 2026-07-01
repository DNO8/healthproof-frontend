"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function saveEncryptedPrivateKeyHandler(
  data: { id: string; encrypted_private_key: string },
  auth: AuthContext,
) {
  if (auth.userId !== data.id) {
    throw new Error("Unauthorized: can only update your own backup");
  }

  const supabase = createAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("users")
    .update({ encrypted_private_key: data.encrypted_private_key })
    .eq("id", data.id)
    .select("id");

  if (error) {
    console.error("[saveEncryptedPrivateKey] error:", error);
    throw new Error("Failed to save encrypted private key");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when saving encrypted private key");
  }

  return { success: true };
}

export const saveEncryptedPrivateKey = withAuth(
  saveEncryptedPrivateKeyHandler,
  {
    rateLimit: { windowMs: 60000, maxRequests: 15 },
  },
);
