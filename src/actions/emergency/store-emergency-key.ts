"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { validatePatientAccess } from "@/lib/auth/permissions";

interface StoreEmergencyKeyData {
  requestId: string;
  patientWallet: string;
  guardianWallet: string;
  encryptedKey: string;
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * Store an encrypted session key in escrow for guardian-path emergency access.
 * Writes directly to Supabase; the key is encrypted with the guardian's public key
 * so the server cannot decrypt it.
 * Dual-doctor path does NOT use server escrow (E2E preservation).
 */
async function storeEmergencyKeyHandler(
  data: StoreEmergencyKeyData,
  auth: AuthContext
): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("EmergencyKeyEscrow")
    .insert({
      requestId: data.requestId,
      patientWallet: data.patientWallet,
      guardianWallet: data.guardianWallet,
      encryptedKey: data.encryptedKey,
      expiresAt: new Date(data.expiresAt * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[storeEmergencyKey] Supabase error:", error);
    throw new Error("Failed to store emergency key");
  }

  auditLog("storeEmergencyKey", auth, true, {
    requestId: data.requestId,
    patientWallet: data.patientWallet,
    guardianWallet: data.guardianWallet,
  });

  return { id: row.id };
}

async function validateStoreKey(
  data: StoreEmergencyKeyData,
  auth: AuthContext
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const storeEmergencyKey = withAuth(storeEmergencyKeyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateStoreKey,
});
