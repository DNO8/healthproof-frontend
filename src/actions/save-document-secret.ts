"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function saveDocumentSecret(data: {
  document_id: string;
  uploader_wallet: string;
  patient_wallet: string;
  iv: string;
  encrypted_keys: Record<string, unknown>;
  uploader_public_key: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("document_secrets").insert({
    document_id: data.document_id,
    uploader_wallet: data.uploader_wallet.toLowerCase(),
    patient_wallet: data.patient_wallet.toLowerCase(),
    iv: data.iv,
    encrypted_keys: data.encrypted_keys,
    uploader_public_key: data.uploader_public_key,
  });

  if (error) {
    console.error("saveDocumentSecret error:", error);
    return { error: error.message };
  }

  return { success: true };
}
