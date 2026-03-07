"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updateWalletAddress(data: {
  id: string;
  wallet_address: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ wallet_address: data.wallet_address })
    .eq("id", data.id);

  if (error) {
    console.error("updateWalletAddress error:", error);
    return { error: error.message };
  }

  return { success: true };
}
