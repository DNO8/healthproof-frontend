"use client";

import { usePrivy } from "@privy-io/react-auth";
import { FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import type { SharedDocument } from "@/actions/documents/list-shared-documents";
import { listSharedDocuments } from "@/actions/documents/list-shared-documents";
import { listSharedDocumentsByEpisode } from "@/actions/documents/list-shared-documents-by-episode";
import { checkAccessOnChain } from "@/actions/permissions/check-access-onchain";
import { FilePreview } from "@/components/documents/FilePreview";
import { SharedErrorBoundary } from "@/components/feedback/SharedErrorBoundary";
import { EmptyState, SkeletonList } from "@/components/ui";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useDocumentDecrypt } from "@/hooks/documents/useDocumentDecrypt";
import { useRouter } from "@/i18n/navigation";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import type { WrappedKey } from "@/services/encryption/ecdh";

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default function SharedDocumentsPage() {
  const t = useTranslations("sharedDocuments");
  const router = useRouter();
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const userId = user?.id ?? "";
  const searchParams = useSearchParams();
  const highlightDocId = searchParams.get("doc");
  const episodeId = searchParams.get("episode");
  const _patientWalletFromQR = searchParams.get("patient");

  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<SharedDocument | null>(null);
  const [patientKeys, setPatientKeys] = useState<Record<string, string | null>>(
    {},
  );
  const [hasAttemptedAutoDecrypt, setHasAttemptedAutoDecrypt] = useState(false);
  const qrPatientKey = searchParams.get("pk");

  const {
    decrypt,
    decryptedFile,
    loading: decryptLoading,
    error: decryptError,
    clear,
  } = useDocumentDecrypt();

  const fetchDocs = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      let resultDocs: SharedDocument[] = [];
      if (episodeId) {
        const res = await listSharedDocumentsByEpisode({ episodeId });
        if (isAuthSuccess(res) && res.data) {
          resultDocs = res.data.documents;
        }
      } else {
        const res = await listSharedDocuments({ doctorWallet: walletAddress });
        if (isAuthSuccess(res) && res.data) {
          resultDocs = res.data.documents;
        }
      }
      setDocs(resultDocs);
      // Pre-fetch patient public keys
      const uniquePatients = [
        ...new Set(resultDocs.map((d) => d.patient_wallet)),
      ];
      const keyMap: Record<string, string | null> = {};
      await Promise.all(
        uniquePatients.map(async (pw) => {
          try {
            keyMap[pw] = await getUserPublicKey(pw);
          } catch {
            keyMap[pw] = null;
          }
        }),
      );
      setPatientKeys(keyMap);
      if (
        uniquePatients.length > 0 &&
        Object.values(keyMap).every((v) => v === null)
      ) {
        sileo.warning({
          title: "Claves de pacientes no disponibles",
          description:
            "No se pudieron obtener las claves públicas de los pacientes. Es posible que las claves de cifrado aún se estén recuperando.",
          duration: 5000,
        });
      }
    } catch (e) {
      sileo.error({
        title: t("loadError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t, episodeId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const performDecrypt = useCallback(
    async (doc: SharedDocument, silent = false) => {
      if (!walletAddress || !userId) return null;
      if (!doc.iv) {
        if (!silent)
          sileo.error({ title: t("noIv"), description: t("noIvDesc") });
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
          if (!silent)
            sileo.error({
              title: t("accessRevoked"),
              description: t("accessRevokedDesc"),
            });
          return null;
        }
      } catch {
        if (!silent)
          sileo.error({
            title: t("accessCheckError"),
            description: t("accessCheckErrorDesc"),
          });
        return null;
      }

      // Resolve patient public key: QR param → pre-fetched map → on-demand fetch
      let senderKey = qrPatientKey ?? patientKeys[doc.patient_wallet] ?? null;
      if (!senderKey) {
        try {
          senderKey = await getUserPublicKey(doc.patient_wallet);
          if (senderKey) {
            setPatientKeys((prev) => ({
              ...prev,
              [doc.patient_wallet]: senderKey,
            }));
          }
        } catch {
          senderKey = null;
        }
      }
      if (!senderKey) {
        if (!silent)
          sileo.error({ title: t("noKey"), description: t("noPatientKey") });
        return null;
      }
      let wrappedKey: WrappedKey;
      try {
        wrappedKey = JSON.parse(doc.encrypted_key) as WrappedKey;
      } catch {
        if (!silent)
          sileo.error({ title: t("noKey"), description: t("invalidKey") });
        return null;
      }
      const result = await decrypt({
        cid: doc.document_id,
        iv: doc.iv,
        wrappedKey,
        senderPublicKeyJwk: senderKey,
        myUserId: userId,
      });
      if (!result && !silent) {
        sileo.error({
          title: t("decryptFailed"),
          description: t("decryptFailedDesc"),
        });
      }
      return result;
    },
    [walletAddress, userId, t, qrPatientKey, patientKeys, decrypt],
  );

  // Auto-select document from QR scan redirect
  useEffect(() => {
    if (!highlightDocId || docs.length === 0 || hasAttemptedAutoDecrypt) return;
    const doc = docs.find((d) => d.document_id === highlightDocId);
    if (doc && doc.document_id !== selectedDoc?.document_id) {
      setSelectedDoc(doc);
      clear();
      performDecrypt(doc);
    }
    setHasAttemptedAutoDecrypt(true);
    // Clean URL so refresh doesn't retry with stale params
    router.replace("/dashboard/shared");
  }, [
    highlightDocId,
    docs,
    clear,
    hasAttemptedAutoDecrypt,
    performDecrypt,
    router.replace,
    selectedDoc?.document_id,
  ]);
  async function handleView(doc: SharedDocument) {
    setSelectedDoc(doc);
    clear();
    await performDecrypt(doc);
  }

  function handleDownload() {
    if (!decryptedFile) return;
    const a = document.createElement("a");
    a.href = decryptedFile.url;
    a.download =
      selectedDoc?.file_name ??
      `document-${selectedDoc?.document_id.slice(0, 8) ?? "file"}`;
    a.click();
  }

  const isDecrypting = decryptLoading;

  return (
    <SharedErrorBoundary>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

        {loading ? (
          <SkeletonList count={3} />
        ) : docs.length === 0 ? (
          <EmptyState icon={FileText} title={t("empty")} />
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
                      <p className="text-sm font-semibold text-slate-800">
                        {doc.file_name ?? t("documentTitle")}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {formatAddress(doc.document_id)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t("sharedOn")}:{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
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
                    <p>
                      {t("patient")}:{" "}
                      {doc.patient_name || formatAddress(doc.patient_wallet)}
                    </p>
                    {doc.uploader_wallet && (
                      <p>
                        {t("uploadedBy")}:{" "}
                        {doc.uploader_name ||
                          formatAddress(doc.uploader_wallet)}
                      </p>
                    )}
                    {doc.doc_created_at && (
                      <p>
                        {t("uploadedOn")}:{" "}
                        {new Date(doc.doc_created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {isSelected && decryptedFile && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                      <FilePreview file={decryptedFile} />
                      <button
                        className="w-full rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        onClick={handleDownload}
                        type="button"
                      >
                        {t("download")}
                      </button>
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
    </SharedErrorBoundary>
  );
}
