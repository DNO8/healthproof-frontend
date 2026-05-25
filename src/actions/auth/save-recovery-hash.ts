"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

async function saveRecoveryHashHandler(
  data: { userId: string; recoveryCodeHash: string },
  auth: AuthContext
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      recovery_code_hash: data.recoveryCodeHash,
    })
    .eq("id", data.userId);

  if (error) {
    console.error("[saveRecoveryHash] Error:", error);
    throw new Error("Failed to save recovery hash");
  }

  return { success: true };
}

export const saveRecoveryHash = withAuth(saveRecoveryHashHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});
