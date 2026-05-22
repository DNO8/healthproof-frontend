"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { listSharedDocuments } from "@/actions/list-shared-documents";
import { getUserPublicKey } from "@/actions/get-user-public-key";
import { checkAccessOnChain } from "@/actions/check-access-onchain";
import { useDocumentDecrypt } from "@/hooks/useDocumentDecrypt";
import { FilePreview } from "@/components/documents/FilePreview";
import type { SharedDocument } from "@/actions/list-shared-documents";

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default function SharedDocumentsPage() {
  const t = useTranslations("sharedDocuments");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const userId = user?.id ?? "";
  const searchParams = useSearchParams();
  const highlightDocId = searchParams.get("doc");

  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<SharedDocument | null>(null);
  const [patientKeys, setPatientKeys] = useState<Record<string, string | null>>({});

  const { decrypt, decryptedFile, loading: decryptLoading, error: decryptError, clear } = useDocumentDecrypt();

  const fetchDocs = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await listSharedDocuments({ doctorWallet: walletAddress });
      if (res.success && res.data) {
        setDocs(res.data.documents);
        // Pre-fetch patient public keys
        const uniquePatients = [...new Set(res.data.documents.map((d) => d.patient_wallet))];
        const keyMap: Record<string, string | null> = {};
        await Promise.all(
          uniquePatients.map(async (pw) => {
            try {
              keyMap[pw] = await getUserPublicKey(pw);
            } catch {
              keyMap[pw] = null;
            }
          })
        );
        setPatientKeys(keyMap);
      } else {
        setDocs([]);
      }
    } catch (e) {
      sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Auto-select document from QR scan redirect
  useEffect(() => {
    if (!highlightDocId || docs.length === 0 || !patientKeys) return;
    const doc = docs.find((d) => d.document_id === highlightDocId);
    if (doc && doc.document_id !== selectedDoc?.document_id) {
      setSelectedDoc(doc);
      clear();
      performDecrypt(doc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightDocId, docs, patientKeys]);

  async function performDecrypt(doc: SharedDocument, silent = false) {
    if (!walletAddress || !userId) return null;
    if (!doc.iv) {
      if (!silent) sileo.error({ title: t("noIv"), description: t("noIvDesc") });
      return null;
    }

    // 1. On-chain permission gate
    try {
      const accessResult = await checkAccessOnChain({
        patientWallet: doc.patient_wallet,
        requesterWallet: walletAddress,
        documentId: doc.document_id,
      });
      if (!accessResult.success || !accessResult.data) {
        if (!silent) sileo.error({ title: t("accessRevoked"), description: t("accessRevokedDesc") });
        return null;
      }
    } catch {
      if (!silent) sileo.error({ title: t("accessCheckError"), description: t("accessCheckErrorDesc") });
      return null;
    }

    const senderKey = patientKeys[doc.patient_wallet];
    if (!senderKey) {
      if (!silent) sileo.error({ title: t("noKey"), description: t("noPatientKey") });
      return null;
    }
    let wrappedKey;
    try {
      wrappedKey = JSON.parse(doc.encrypted_key);
    } catch {
      if (!silent) sileo.error({ title: t("noKey"), description: t("invalidKey") });
      return null;
    }
    return await decrypt({
      cid: doc.document_id,
      iv: doc.iv,
      wrappedKey,
      senderPublicKeyJwk: senderKey,
      myUserId: userId,
    });
  }

  async function handleView(doc: SharedDocument) {
    setSelectedDoc(doc);
    clear();
    await performDecrypt(doc);
  }

  const isDecrypting = decryptLoading;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
      ) : docs.length === 0 ? (
        <div className="neu-shell border border-white/70 p-8 text-center">
          <p className="text-sm text-slate-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => {
            const isSelected = selectedDoc?.document_id === doc.document_id;
            const isBusy = isDecrypting && isSelected;
            return (
              <div
                key={doc.document_id}
                className={`neu-shell rounded-xl p-5 sm:p-6 space-y-3 transition-all ${
                  isSelected ? "border-l-4 border-l-sky-500" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t("documentTitle")}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t("sharedOn")}: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => handleView(doc)}
                    type="button"
                  >
                    {isBusy ? t("decrypting") : t("view")}
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>{t("patient")}: <span className="font-mono">{formatAddress(doc.patient_wallet)}</span></p>
                  {doc.uploader_wallet && (
                    <p>{t("uploadedBy")}: <span className="font-mono">{formatAddress(doc.uploader_wallet)}</span></p>
                  )}
                  {doc.doc_created_at && (
                    <p>{t("uploadedOn")}: {new Date(doc.doc_created_at).toLocaleDateString()}</p>
                  )}
                </div>

                {isSelected && decryptedFile && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <FilePreview file={decryptedFile} />
                  </div>
                )}
                {isSelected && decryptError && (
                  <p className="mt-2 text-xs text-red-500">{decryptError}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
