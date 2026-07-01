"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function saveRecoveryHashHandler(
  data: { userId: string; recoveryCodeHash: string },
  auth: AuthContext,
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  const supabase = createAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("users")
    .update({
      recovery_code_hash: data.recoveryCodeHash,
    })
    .eq("id", data.userId)
    .select("id");

  if (error) {
    console.error("[saveRecoveryHash] Error:", error);
    throw new Error("Failed to save recovery hash");
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("User not found when saving recovery hash");
  }

  return { success: true };
}

export const saveRecoveryHash = withAuth(saveRecoveryHashHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 15 },
});
