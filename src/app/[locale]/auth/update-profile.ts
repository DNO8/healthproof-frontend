"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(data: {
  id: string;
  full_name: string;
}) {
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
