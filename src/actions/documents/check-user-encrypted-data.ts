"use server";

import { verifySelf } from "@/lib/auth/privy-verify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if a user has any encrypted documents (as uploader or patient).
 * Used to prevent automatic key regeneration when existing data depends on them.
 * Restricted to the authenticated user only (HIPAA access control).
 *
 * @param walletAddress - Wallet address to check.
 * @param _privyToken - Optional explicit Privy token (bypasses stale cookie issues).
 */
export async function hasEncryptedData(
  walletAddress: string,
  _privyToken?: string,
): Promise<boolean> {
  if (!walletAddress) return false;

  try {
    await verifySelf(walletAddress, _privyToken);
  } catch (authErr) {
    console.warn(
      "[hasEncryptedData] auth failed:",
      authErr instanceof Error ? authErr.message : authErr,
    );
    return false;
  }

  const supabase = createAdminClient();
  const wallet = walletAddress.toLowerCase();

  const { count, error } = await supabase
    .from("document_secrets")
    .select("id", { count: "exact", head: true })
    .or(`uploader_wallet.eq.${wallet},patient_wallet.eq.${wallet}`);

  if (error) {
    console.error("[hasEncryptedData] query error:", error);
    return false;
  }

  return (count ?? 0) > 0;
}
