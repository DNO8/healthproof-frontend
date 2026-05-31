"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function isValidAddress(addr: string): boolean {
  return typeof addr === "string" && addr.startsWith("0x") && addr.length === 42;
}

export async function saveDocumentSecret(data: {
  document_id: string;
  file_name?: string;
  uploader_wallet: string;
  patient_wallet: string;
  iv: string;
  encrypted_keys: Record<string, unknown>;
  uploader_public_key: string;
}) {
  // Validation
  if (!data.document_id?.trim()) {
    return { error: "document_id is required" };
  }
  if (!isValidAddress(data.uploader_wallet)) {
    return { error: `invalid uploader_wallet: ${data.uploader_wallet}` };
  }
  if (!isValidAddress(data.patient_wallet)) {
    return { error: `invalid patient_wallet: ${data.patient_wallet}` };
  }
  if (!data.iv?.trim()) {
    return { error: "iv is required" };
  }
  if (!data.uploader_public_key?.trim()) {
    return { error: "uploader_public_key is required" };
  }
  if (!data.encrypted_keys || Object.keys(data.encrypted_keys).length === 0) {
    return { error: "encrypted_keys must not be empty" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("document_secrets").insert({
    document_id: data.document_id,
    file_name: data.file_name ?? null,
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
