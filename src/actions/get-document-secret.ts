"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface DocumentSecretRow {
  id: string;
  document_id: string;
  uploader_wallet: string;
  patient_wallet: string;
  iv: string;
  encrypted_keys: Record<string, { data: string; iv: string }>;
  created_at: string;
}

export async function getDocumentSecret(
  documentId: string,
): Promise<DocumentSecretRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, uploader_wallet, patient_wallet, iv, encrypted_keys, created_at",
    )
    .eq("document_id", documentId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DocumentSecretRow;
}

export async function listDocumentSecretsForWallet(
  wallet: string,
): Promise<DocumentSecretRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, uploader_wallet, patient_wallet, iv, encrypted_keys, created_at",
    )
    .eq("patient_wallet", wallet.toLowerCase())
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as DocumentSecretRow[];
}
