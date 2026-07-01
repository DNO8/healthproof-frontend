"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyRecoveryCodeHandler(
  data: { userId: string; recoveryCodeHash: string },
  auth: AuthContext,
) {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("recovery_code_hash")
    .eq("id", data.userId)
    .single();

  if (error || !user) {
    console.error("[verifyRecoveryCode] Error:", error);
    throw new Error("User not found");
  }

  const isValid = user.recovery_code_hash === data.recoveryCodeHash;

  if (isValid) {
    await supabase
      .from("users")
      .update({ recovery_code_used_at: new Date().toISOString() })
      .eq("id", data.userId);
  }

  return { valid: isValid };
}

export const verifyRecoveryCode = withAuth(verifyRecoveryCodeHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});
