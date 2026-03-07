"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function revokePermission(permissionId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("permissions")
    .update({ status: "REVOKED" })
    .eq("id", permissionId);

  if (error) {
    console.error("revokePermission error:", error);
    return { error: error.message };
  }

  return { success: true };
}
