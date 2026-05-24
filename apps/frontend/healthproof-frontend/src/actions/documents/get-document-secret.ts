"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";

export interface DocumentSecretRow {
  id: string;
  document_id: string;
  file_name: string | null;
  uploader_wallet: string;
  patient_wallet: string;
  iv: string;
  encrypted_keys: Record<string, { data: string; iv: string }>;
  uploader_public_key: string | null;
  created_at: string;
  uploader_name?: string | null;
}

export async function getDocumentSecret(
  documentId: string,
): Promise<DocumentSecretRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, created_at",
    )
    .eq("document_id", documentId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as DocumentSecretRow;
  const nameMap = await resolveWalletNames([row.uploader_wallet]);
  row.uploader_name = nameMap.get(row.uploader_wallet.toLowerCase()) ?? null;
  return row;
}

export async function listDocumentSecretsForWallet(
  wallet: string,
): Promise<DocumentSecretRow[]> {
  const supabase = createAdminClient();

  const w = wallet.toLowerCase();
  const { data, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, created_at",
    )
    .or(`patient_wallet.eq.${w},uploader_wallet.eq.${w}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data as DocumentSecretRow[];
  const wallets = rows.map((r) => r.uploader_wallet);
  const nameMap = await resolveWalletNames(wallets);

  return rows.map((r) => ({
    ...r,
    uploader_name: nameMap.get(r.uploader_wallet.toLowerCase()) ?? null,
  }));
}
