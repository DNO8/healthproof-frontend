"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface RetrieveEmergencyKeyData {
  requestId: string;
}

/**
 * Retrieve an encrypted session key from escrow.
 * Only the guardian can retrieve their own key.
 */
async function retrieveEmergencyKeyHandler(
  data: RetrieveEmergencyKeyData,
  auth: AuthContext,
): Promise<{ encryptedKey: string; expiresAt: string }> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("EmergencyKeyEscrow")
    .select("encryptedKey, expiresAt, guardianWallet")
    .eq("requestId", data.requestId)
    .single();

  if (error || !row) {
    console.error("[retrieveEmergencyKey] Supabase error:", error);
    throw new Error("Emergency key not found");
  }

  // Ensure only the guardian can retrieve their own key
  if (row.guardianWallet.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Unauthorized: only the guardian can retrieve this key");
  }

  return {
    encryptedKey: row.encryptedKey,
    expiresAt: row.expiresAt,
  };
}

export const retrieveEmergencyKey = withAuth(retrieveEmergencyKeyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
