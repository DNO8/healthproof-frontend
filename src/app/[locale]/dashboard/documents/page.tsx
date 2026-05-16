"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { listDocumentSecretsForWallet } from "@/actions/get-document-secret";
import { getDocumentOnChain } from "@/actions/get-document-onchain";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import type { OnChainDocument } from "@/lib/medical-constants";

type DocRow = {
  id: string;
  document_id: string;
  uploader_wallet: string;
  patient_wallet: string;
  created_at: string;
};

export default function DocumentsPage() {
  const t = useTranslations("dashboard.documents");
  const walletAddress = useWalletAddress();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [selected, setSelected] = useState<DocRow | null>(null);
  const [onChainDoc, setOnChainDoc] = useState<OnChainDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    listDocumentSecretsForWallet(walletAddress)
      .then((rows) => setDocs(rows as DocRow[]))
      .catch((e) => {
        sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  async function handleSelect(doc: DocRow) {
    setSelected(doc);
    setOnChainDoc(null);
    setDetailLoading(true);
    try {
      const result = await getDocumentOnChain({ documentId: doc.document_id });
      if (result.success && result.data?.document) {
        setOnChainDoc(result.data.document);
      }
    } catch (e) {
      sileo.error({ title: t("detailError"), description: String(e).slice(0, 120) });
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* List */}
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{t("listTitle")}</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                    selected?.id === doc.id
                      ? "neu-pressed border-l-4 border-l-sky-500"
                      : "neu-surface hover:neu-pressed"
                  }`}
                  onClick={() => handleSelect(doc)}
                  type="button"
                >
                  <p className="text-xs font-mono text-slate-500 truncate">{doc.document_id}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("uploader")}: {doc.uploader_wallet.slice(0, 6)}…{doc.uploader_wallet.slice(-4)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{t("detailTitle")}</h2>
          {!selected ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("selectPrompt")}</p>
          ) : detailLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
          ) : onChainDoc ? (
            <div className="space-y-3">
              <DetailRow label={t("docType")} value={onChainDoc.documentType} />
              <DetailRow label={t("cid")} value={onChainDoc.cid} />
              <DetailRow label={t("clinicalHash")} value={onChainDoc.clinicalHash} />
              <DetailRow label={t("episodeId")} value={onChainDoc.episodeId} />
              <DetailRow label={t("patient")} value={`${onChainDoc.patient.slice(0, 8)}…${onChainDoc.patient.slice(-4)}`} />
              <DetailRow label={t("issuer")} value={`${onChainDoc.issuer.slice(0, 8)}…${onChainDoc.issuer.slice(-4)}`} />
              <DetailRow label={t("institution")} value={`${onChainDoc.institution.slice(0, 8)}…${onChainDoc.institution.slice(-4)}`} />
              <DetailRow label={t("standard")} value={onChainDoc.standard} />
              <DetailRow label={t("classification")} value={onChainDoc.classification} />
              <DetailRow label={t("createdAt")} value={new Date(onChainDoc.createdAt * 1000).toLocaleString()} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{t("notOnChain")}</p>
          )}
        </div>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
      <span className="text-xs font-medium text-slate-500 shrink-0 w-24">{label}</span>
      <span className="text-sm text-slate-800 break-all font-mono">{value}</span>
    </div>
  );
}
