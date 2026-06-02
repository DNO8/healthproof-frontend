"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { SharedDocument } from "./list-shared-documents";

interface ListSharedDocsByEpisodeParams {
  episodeId: string;
}

async function handler(
  data: ListSharedDocsByEpisodeParams,
  auth: AuthContext,
): Promise<{ documents: SharedDocument[] }> {
  const supabase = createAdminClient();
  const grantee = auth.wallet.toLowerCase();
  const ep = data.episodeId.toLowerCase();

  // 1. Get permission_keys for this grantee, joining with document_secrets filtered by episode
  const { data: permRows, error: permError } = await supabase
    .from("permission_keys")
    .select("document_id, patient_wallet, grantee_wallet, encrypted_key, created_at")
    .eq("grantee_wallet", grantee);

  if (permError || !permRows || permRows.length === 0) {
    return { documents: [] };
  }

  const allowedDocIds = permRows.map((r) => r.document_id as string);

  // 2. Get document_secrets in this episode among the allowed docs
  const { data: secrets, error: secretsError } = await supabase
    .from("document_secrets")
    .select("document_id, file_name, uploader_wallet, iv, uploader_public_key, created_at")
    .eq("episode_id", ep)
    .in("document_id", allowedDocIds);

  if (secretsError || !secrets) {
    return {
      documents: permRows
        .filter((p) => allowedDocIds.includes(p.document_id))
        .map((p) => ({
          document_id: p.document_id,
          file_name: null,
          patient_wallet: p.patient_wallet,
          grantee_wallet: p.grantee_wallet,
          encrypted_key: p.encrypted_key,
          created_at: p.created_at,
          iv: null,
          uploader_wallet: null,
          uploader_public_key: null,
          doc_created_at: null,
          patient_name: null,
          uploader_name: null,
        })),
    };
  }

  const secretMap = new Map(secrets.map((s) => [s.document_id, s]));

  const documents: SharedDocument[] = permRows
    .filter((p) => allowedDocIds.includes(p.document_id))
    .map((p) => {
      const secret = secretMap.get(p.document_id);
      return {
        document_id: p.document_id,
        file_name: secret?.file_name ?? null,
        patient_wallet: p.patient_wallet,
        grantee_wallet: p.grantee_wallet,
        encrypted_key: p.encrypted_key,
        created_at: p.created_at,
        iv: secret?.iv ?? null,
        uploader_wallet: secret?.uploader_wallet ?? null,
        uploader_public_key: secret?.uploader_public_key ?? null,
        doc_created_at: secret?.created_at ?? null,
        patient_name: null,
        uploader_name: null,
      };
    });

  // Enrich with names
  const wallets = documents.flatMap((d) =>
    [d.patient_wallet, d.uploader_wallet].filter(Boolean) as string[]
  );
  const nameMap = await resolveWalletNames(wallets);

  const enriched = documents.map((d) => ({
    ...d,
    patient_name: nameMap.get(d.patient_wallet.toLowerCase()) ?? null,
    uploader_name: d.uploader_wallet
      ? (nameMap.get(d.uploader_wallet.toLowerCase()) ?? null)
      : null,
  }));

  return { documents: enriched };
}

export const listSharedDocumentsByEpisode = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
