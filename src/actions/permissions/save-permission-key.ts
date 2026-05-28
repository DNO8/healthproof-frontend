"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function savePermissionKey(data: {
  document_id: string;
  patient_wallet: string;
  grantee_wallet: string;
  encrypted_key: string;
}) {
  try {
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
      console.error("savePermissionKey error:", error);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[savePermissionKey] failed", {
      documentId: data.document_id,
      patientWallet: data.patient_wallet,
      granteeWallet: data.grantee_wallet,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
}

export async function getPermissionKey(
  documentId: string,
  granteeWallet: string,
): Promise<string | null> {
  try {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("permission_keys")
    .select("encrypted_key")
    .eq("document_id", documentId)
    .eq("grantee_wallet", granteeWallet.toLowerCase())
    .single();

    if (error || !data) {
      return null;
    }

    return data.encrypted_key as string;
  } catch (err) {
    console.error("[getPermissionKey] failed", {
      documentId,
      granteeWallet,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return null;
  }
}
