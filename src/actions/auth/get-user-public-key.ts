"use server";

import { requireAuth } from "@/lib/auth/privy-verify";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getUserPublicKey(
  input: string | { idOrWallet: string; _privyToken?: string },
  _privyToken?: string,
): Promise<string | null> {
  const idOrWallet = typeof input === "string" ? input : input.idOrWallet;
  const token = typeof input === "string" ? _privyToken : input._privyToken;

  try {
    await requireAuth(token);
    const supabase = createAdminClient();

    // Try lookup by user ID first (Privy DID — case-sensitive)
    const { data, error } = await supabase
      .from("users")
      .select("public_key")
      .eq("id", idOrWallet)
      .single();

    if (!error && data?.public_key) {
      return data.public_key as string;
    }

    // Fall back to wallet_address lookup (normalize to lowercase for case-insensitive match)
    const walletLower = idOrWallet.toLowerCase();
    const { data: byWallet, error: walletErr } = await supabase
      .from("users")
      .select("public_key")
      .eq("wallet_address", walletLower)
      .single();

    if (walletErr || !byWallet) {
      return null;
    }

    return (byWallet.public_key as string | null) ?? null;
  } catch (err) {
    console.error("[getUserPublicKey] failed", {
      idOrWallet,
      error:
        err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return null;
  }
}
