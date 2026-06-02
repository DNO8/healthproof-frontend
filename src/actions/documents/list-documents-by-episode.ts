"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { DocumentSecretRow } from "./get-document-secret";

interface ListDocsByEpisodeParams {
  patientWallet: string;
  episodeId: string;
}

async function handler(
  data: ListDocsByEpisodeParams,
  auth: AuthContext,
): Promise<{ documents: DocumentSecretRow[] }> {
  if (auth.wallet.toLowerCase() !== data.patientWallet.toLowerCase()) {
    throw new Error("Unauthorized: can only list your own documents");
  }

  const supabase = createAdminClient();
  const w = data.patientWallet.toLowerCase();
  const ep = data.episodeId.toLowerCase();

  const { data: rows, error } = await supabase
    .from("document_secrets")
    .select(
      "id, document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, created_at, episode_id",
    )
    .eq("patient_wallet", w)
    .eq("episode_id", ep)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.error("[listDocumentsByEpisode] error:", error);
    return { documents: [] };
  }

  const typedRows = rows as DocumentSecretRow[];
  const wallets = typedRows.map((r) => r.uploader_wallet);
  const nameMap = await resolveWalletNames(wallets);

  return {
    documents: typedRows.map((r) => ({
      ...r,
      uploader_name: nameMap.get(r.uploader_wallet.toLowerCase()) ?? null,
    })),
  };
}

export const listDocumentsByEpisode = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
