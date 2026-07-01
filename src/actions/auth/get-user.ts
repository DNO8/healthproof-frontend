"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function getDbUserHandler(
  data: { idOrWallet: string },
  _auth: AuthContext,
) {
  const supabase = createAdminClient();

  // Try lookup by Privy DID first
  const { data: userData, error } = await supabase
    .from("users")
    .select(
      "id, email, wallet_address, full_name, created_at, public_key, onboarding_completed_at",
    )
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
      onboarding_completed_at:
        (userData.onboarding_completed_at as string | null) ?? null,
    };
  }

  // Fall back to wallet_address lookup (normalize to lowercase for case-insensitive match)
  const walletLower = data.idOrWallet.toLowerCase();
  const { data: byWallet, error: walletErr } = await supabase
    .from("users")
    .select(
      "id, email, wallet_address, full_name, created_at, public_key, onboarding_completed_at",
    )
    .eq("wallet_address", walletLower)
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
    onboarding_completed_at:
      (byWallet.onboarding_completed_at as string | null) ?? null,
  };
}

export const getDbUser = withAuth(getDbUserHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
