"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface UserWithBackup {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
  created_at: string;
  public_key: string | null;
  encrypted_private_key: string | null;
}

/**
 * Get user data including encrypted private key backup.
 * Used for key recovery when IndexedDB is empty.
 */
export async function getUserWithBackup(
  idOrWallet: string,
): Promise<UserWithBackup | null> {
  const supabase = createAdminClient();

  // Try lookup by Privy DID first
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, wallet_address, full_name, created_at, public_key, encrypted_private_key",
    )
    .eq("id", idOrWallet)
    .single();

  if (!error && data) {
    return {
      id: data.id as string,
      email: (data.email as string) ?? "",
      wallet_address: data.wallet_address as string | null,
      full_name: data.full_name as string | null,
      created_at: data.created_at as string,
      public_key: (data.public_key as string | null) ?? null,
      encrypted_private_key:
        (data.encrypted_private_key as string | null) ?? null,
    };
  }

  // Fall back to wallet_address lookup
  const { data: byWallet, error: walletErr } = await supabase
    .from("users")
    .select(
      "id, email, wallet_address, full_name, created_at, public_key, encrypted_private_key",
    )
    .eq("wallet_address", idOrWallet)
    .single();

  if (walletErr || !byWallet) {
    return null;
  }

  return {
    id: byWallet.id as string,
    email: (byWallet.email as string) ?? "",
    wallet_address: byWallet.wallet_address as string | null,
    full_name: byWallet.full_name as string | null,
    created_at: byWallet.created_at as string,
    public_key: (byWallet.public_key as string | null) ?? null,
    encrypted_private_key:
      (byWallet.encrypted_private_key as string | null) ?? null,
  };
}
