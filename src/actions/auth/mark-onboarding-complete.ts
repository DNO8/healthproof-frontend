"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function markOnboardingCompleteHandler(
  _data: { userId: string },
  auth: AuthContext,
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", auth.userId)
    .is("onboarding_completed_at", null);

  if (error) {
    console.error("[markOnboardingComplete] error:", error.message);
    throw error;
  }

  return { ok: true };
}

export const markOnboardingComplete = withAuth(markOnboardingCompleteHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 15 },
});
