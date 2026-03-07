"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePublicKey(data: {
  id: string;
  public_key: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ public_key: data.public_key })
    .eq("id", data.id);

  if (error) {
    console.error("updatePublicKey error:", error);
    return { error: error.message };
  }

  return { success: true };
}
