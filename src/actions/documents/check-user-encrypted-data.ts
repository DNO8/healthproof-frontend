"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if a user has any encrypted documents (as uploader or patient).
 * Used to prevent automatic key regeneration when existing data depends on them.
 */
export async function hasEncryptedData(
  walletAddress: string,
): Promise<boolean> {
  if (!walletAddress) return false;

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
