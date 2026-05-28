"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

async function savePermissionKeyHandler(
  data: {
    document_id: string;
    patient_wallet: string;
    grantee_wallet: string;
    encrypted_key: string;
  },
  auth: AuthContext,
) {
  // Only the patient can save permission keys for their documents
  if (auth.wallet.toLowerCase() !== data.patient_wallet.toLowerCase()) {
    throw new Error("Unauthorized: only the patient can save permission keys");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("permission_keys").upsert(
    {
      document_id: data.document_id,
      patient_wallet: data.patient_wallet.toLowerCase(),
      grantee_wallet: data.grantee_wallet.toLowerCase(),
      encrypted_key: data.encrypted_key,
    },
    { onConflict: "document_id,grantee_wallet" },
  );

  if (error) {
    console.error("[savePermissionKey] error:", error);
    throw new Error("Failed to save permission key");
  }

  return { success: true };
}

export const savePermissionKey = withAuth(savePermissionKeyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});

async function getPermissionKeyHandler(
  data: { documentId: string; granteeWallet: string },
  auth: AuthContext,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("permission_keys")
    .select("encrypted_key, patient_wallet, grantee_wallet")
    .eq("document_id", data.documentId)
    .eq("grantee_wallet", data.granteeWallet.toLowerCase())
    .single();

  if (error || !row) {
    return null;
  }

  // Authorization: caller must be the patient or the grantee
  const caller = auth.wallet.toLowerCase();
  const patient = (row.patient_wallet as string).toLowerCase();
  const grantee = (row.grantee_wallet as string).toLowerCase();
  if (caller !== patient && caller !== grantee) {
    throw new Error("Unauthorized: not authorized to access this permission key");
  }

  return row.encrypted_key as string;
}

export const getPermissionKey = withAuth(getPermissionKeyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
