"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Save encrypted private key backup to users table.
 * Called automatically when new keys are generated.
 */
export async function saveEncryptedPrivateKey(data: {
  id: string;
  encrypted_private_key: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ encrypted_private_key: data.encrypted_private_key })
    .eq("id", data.id);

  if (error) {
    console.error("saveEncryptedPrivateKey error:", error);
    return { error: error.message };
  }

  return { success: true };
}
