"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

async function saveMasterSecretHashHandler(
  data: { userId: string; masterSecretHash: string },
  auth: AuthContext
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  const supabase = createAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("users")
    .update({
      master_secret_hash: data.masterSecretHash,
    })
    .eq("id", data.userId)
    .select("id");

  if (error) {
    console.error("[saveMasterSecretHash] Error:", error);
    throw new Error("Failed to save master secret hash");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when saving master secret hash");
  }

  return { success: true };
}

export const saveMasterSecretHash = withAuth(saveMasterSecretHashHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 15 },
});
