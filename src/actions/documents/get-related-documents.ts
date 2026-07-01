"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentSecretRow } from "./get-document-secret";

export interface RelatedDocument {
  id: string;
  document_id: string;
  file_name: string | null;
  uploader_wallet: string;
  patient_wallet: string;
  iv: string;
  encrypted_keys: Record<string, { data: string; iv: string }>;
  uploader_public_key: string | null;
  related_cid: string | null;
  document_type: string | null;
  created_at: string;
}

export async function getRelatedDocuments(
  documentId: string,
): Promise<RelatedDocument[]> {
  const supabase = createAdminClient();

  const { data: meta, error: metaError } = await supabase
    .from("document_metadata")
    .select("document_id, related_cid, document_type")
    .eq("document_id", documentId)
    .single();

  if (metaError || !meta) {
    return [];
  }

  const relatedCid = meta.related_cid;
  const documentIds = [documentId];
  if (relatedCid) {
    documentIds.push(relatedCid);
  }

  const { data: rows, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, created_at",
    )
    .in("document_id", documentIds)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return [];
  }

  const typed = rows.map((r) => ({
    ...(r as DocumentSecretRow),
    related_cid: null as string | null,
    document_type: null as string | null,
  }));

  const enriched = await Promise.all(
    typed.map(async (r) => {
      const { data: m } = await supabase
        .from("document_metadata")
        .select("related_cid, document_type")
        .eq("document_id", r.document_id)
        .single();
      return {
        ...r,
        related_cid: (m?.related_cid as string | null) ?? null,
        document_type: (m?.document_type as string | null) ?? null,
      };
    }),
  );

  return enriched;
}
