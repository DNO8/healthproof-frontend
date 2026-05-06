"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

interface UpdateProfileData {
  id: string;
  full_name: string;
}

async function updateProfileHandler(
  data: UpdateProfileData,
  auth: AuthContext
) {
  // Verify caller can only update their own profile
  if (data.id !== auth.userId) {
    return { error: "Unauthorized" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ full_name: data.full_name.trim() || null })
    .eq("id", data.id);

  if (error) {
    console.error("updateProfile error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export const updateProfile = withAuth(updateProfileHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
