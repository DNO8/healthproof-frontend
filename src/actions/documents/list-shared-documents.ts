"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

export interface SharedDocument {
  document_id: string;
  file_name: string | null;
  patient_wallet: string;
  grantee_wallet: string;
  encrypted_key: string;
  created_at: string;
  iv: string | null;
  uploader_wallet: string | null;
  uploader_public_key: string | null;
  doc_created_at: string | null;
  patient_name?: string | null;
  uploader_name?: string | null;
}

async function handler(
  data: { doctorWallet: string },
  _auth: AuthContext
): Promise<{ documents: SharedDocument[] }> {
  try {
  const supabase = createAdminClient();

  // 1. Get all permission_keys granted to this doctor
  const { data: permissions, error: permError } = await supabase
    .from("permission_keys")
    .select("document_id, patient_wallet, grantee_wallet, encrypted_key, created_at")
    .eq("grantee_wallet", data.doctorWallet.toLowerCase())
    .order("created_at", { ascending: false });

  if (permError || !permissions || permissions.length === 0) {
    return { documents: [] };
  }

  // 2. Get matching document_secrets in one query
  const documentIds = permissions.map((p) => p.document_id);
  const { data: secrets, error: secretsError } = await supabase
    .from("document_secrets")
    .select("document_id, file_name, uploader_wallet, iv, uploader_public_key, created_at")
    .in("document_id", documentIds);

  if (secretsError || !secrets) {
    // Return permissions without secret metadata
    return {
      documents: permissions.map((p) => ({
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

  const documents: SharedDocument[] = permissions.map((p) => {
    const secret = secretMap.get(p.document_id);
    return {
      document_id: p.document_id,
      file_name: (secret as { file_name?: string | null })?.file_name ?? null,
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

  // 4. Enrich with user names
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
  } catch (err) {
    console.error("[listSharedDocuments] failed", {
      doctorWallet: data.doctorWallet,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
}

export const listSharedDocuments = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
