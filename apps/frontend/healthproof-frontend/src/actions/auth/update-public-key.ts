"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

async function updatePublicKeyHandler(
  data: { id: string; public_key: string },
  auth: AuthContext,
) {
  // Users can only update their own public key
  if (auth.userId !== data.id) {
    throw new Error("Unauthorized: can only update your own public key");
  }

  const supabase = createAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("users")
    .update({ public_key: data.public_key })
    .eq("id", data.id)
    .select("id");

  if (error) {
    console.error("[updatePublicKey] error:", error);
    throw new Error("Failed to update public key");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when updating public key");
  }

  return { success: true };
}

export const updatePublicKey = withAuth(updatePublicKeyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
