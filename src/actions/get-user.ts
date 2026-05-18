"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

async function getDbUserHandler(
  data: { idOrWallet: string },
  auth: AuthContext
) {
  const supabase = createAdminClient();

  // Try lookup by Privy DID first
  const { data: userData, error } = await supabase
    .from("users")
    .select("id, email, wallet_address, full_name, created_at, public_key, role")
    .eq("id", data.idOrWallet)
    .single();

  if (!error && userData) {
    return {
      id: userData.id as string,
      email: (userData.email as string) ?? "",
      wallet_address: userData.wallet_address as string | null,
      full_name: userData.full_name as string | null,
      created_at: userData.created_at as string,
      public_key: (userData.public_key as string | null) ?? null,
      role: (userData.role as string | null) ?? null,
    };
  }

  // Fall back to wallet_address lookup
  const { data: byWallet, error: walletErr } = await supabase
    .from("users")
    .select("id, email, wallet_address, full_name, created_at, public_key, role")
    .eq("wallet_address", data.idOrWallet)
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
    role: (byWallet.role as string | null) ?? null,
  };
}

export const getDbUser = withAuth(getDbUserHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
