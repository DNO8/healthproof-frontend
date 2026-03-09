"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getUserPublicKey(
  idOrWallet: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  // Try lookup by user ID first
  const { data, error } = await supabase
    .from("users")
    .select("public_key")
    .eq("id", idOrWallet)
    .single();

  if (!error && data?.public_key) {
    return data.public_key as string;
  }

  // Fall back to wallet_address lookup
  const { data: byWallet, error: walletErr } = await supabase
    .from("users")
    .select("public_key")
    .eq("wallet_address", idOrWallet)
    .single();

  if (walletErr || !byWallet) {
    return null;
  }

  return (byWallet.public_key as string | null) ?? null;
}
