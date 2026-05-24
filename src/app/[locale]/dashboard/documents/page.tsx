"use client";

import { useState, useEffect, useCallback } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { listDocumentSecretsForWallet } from "@/actions/documents/get-document-secret";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useDocumentDecrypt } from "@/hooks/documents/useDocumentDecrypt";
import { FilePreview, getExtensionFromMime } from "@/components/documents/FilePreview";
import { EmptyState, SkeletonList } from "@/components/ui";
import { FileText } from "lucide-react";
import type { DocumentSecretRow } from "@/actions/documents/get-document-secret";

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default function DocumentsPage() {
  const t = useTranslations("myDocuments");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const userId = user?.id ?? "";

  const [docs, setDocs] = useState<DocumentSecretRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSecretRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const { decrypt, decryptedFile, loading: decryptLoading, error: decryptError, clear } = useDocumentDecrypt();

  const fetchDocs = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const rows = await listDocumentSecretsForWallet(walletAddress);
      setDocs(rows);
    } catch (e) {
      sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  function handleSelect(doc: DocumentSecretRow) {
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      clear();
      return;
    }
    setSelectedDoc(doc);
    clear();
  }

  async function handleView(doc: DocumentSecretRow) {
    setSelectedDoc(doc);
    clear();
    setViewError(null);
    setModalOpen(true);
    await performDecrypt(doc);
  }

  function closeModal() {
    setModalOpen(false);
    setViewError(null);
    clear();
  }

  async function handleDownload(doc: DocumentSecretRow) {
    setDownloadingId(doc.id);
    try {
      const file = await performDecrypt(doc, true);
      if (file) {
        const ext = getExtensionFromMime(file.mime);
        const name = `document-${doc.document_id.slice(0, 8)}${ext}`;
        const a = document.createElement("a");
        a.href = file.url;
        a.download = name;
        a.click();
      }
    } catch (e) {
      sileo.error({ title: t("downloadError"), description: String(e).slice(0, 120) });
    } finally {
      setDownloadingId(null);
    }
  }

  async function performDecrypt(doc: DocumentSecretRow, silent = false) {
    if (!walletAddress || !userId) {
      if (!silent) setViewError(t("missingWallet") ?? "Wallet or user not available.");
      return null;
    }
    const wrappedKey =
      doc.encrypted_keys[walletAddress.toLowerCase()] ??
      doc.encrypted_keys[userId];
    if (!wrappedKey) {
      if (!silent) {
        setViewError(t("noKeyDesc") ?? "You don't have a decryption key for this document.");
        sileo.error({ title: t("noKey"), description: t("noKeyDesc") });
      }
      return null;
    }
    if (!doc.uploader_public_key) {
      if (!silent) {
        setViewError(t("noUploaderKey") ?? "Uploader public key is missing.");
        sileo.error({ title: t("noKey"), description: t("noUploaderKey") });
      }
      return null;
    }
    return await decrypt({
      cid: doc.document_id,
      iv: doc.iv,
      wrappedKey,
      senderPublicKeyJwk: doc.uploader_public_key,
      myUserId: userId,
    });
  }

  const isDecrypting = decryptLoading || !!downloadingId;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      {loading ? (
        <SkeletonList count={3} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("empty")}
          action={{ label: t("uploadFirst"), href: "/dashboard/upload" }}
        />
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            const isBusy = isDecrypting && isSelected;
            return (
              <div
                key={doc.id}
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
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => handleView(doc)}
                      type="button"
                    >
                      {isBusy ? t("decrypting") : t("view")}
                    </button>
                    <button
                      className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                      disabled={isDecrypting}
                      onClick={() => handleDownload(doc)}
                      type="button"
                    >
                      {downloadingId === doc.id ? t("decrypting") : t("download")}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>{t("uploadedBy")}: {doc.uploader_name || formatAddress(doc.uploader_wallet)}</p>
                </div>

                {isSelected && decryptError && (
                  <p className="mt-2 text-xs text-red-500">{decryptError}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-5xl h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedDoc ? (selectedDoc.file_name ?? t("documentTitle")) : t("documentTitle")}
                </p>
                {selectedDoc && (
                  <p className="text-[10px] font-mono text-slate-400">
                    {formatAddress(selectedDoc.document_id)}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                type="button"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              {decryptLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-slate-400">{t("decrypting")}</p>
                </div>
              ) : decryptedFile ? (
                <FilePreview file={decryptedFile} />
              ) : viewError || decryptError ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-500 text-center px-4">{viewError || decryptError}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-slate-400">{t("loading")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
