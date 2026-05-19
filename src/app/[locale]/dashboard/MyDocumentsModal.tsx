"use client";

import { useState, useEffect, useCallback } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { listDocumentSecretsForWallet } from "@/actions/get-document-secret";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { useDocumentDecrypt } from "@/hooks/useDocumentDecrypt";
import { FilePreview, getExtensionFromMime } from "@/components/documents/FilePreview";
import type { DocumentSecretRow } from "@/actions/get-document-secret";

type MyDocumentsModalProps = {
  onClose: () => void;
};

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export function MyDocumentsModal({ onClose }: MyDocumentsModalProps) {
  const t = useTranslations("myDocuments");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const userId = user?.id ?? "";

  const [docs, setDocs] = useState<DocumentSecretRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSecretRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    await performDecrypt(doc);
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
    if (!walletAddress || !userId) return null;
    const wrappedKey =
      doc.encrypted_keys[walletAddress.toLowerCase()] ??
      doc.encrypted_keys[userId];
    if (!wrappedKey) {
      if (!silent) sileo.error({ title: t("noKey"), description: t("noKeyDesc") });
      return null;
    }
    if (!doc.uploader_public_key) {
      if (!silent) sileo.error({ title: t("noKey"), description: t("noUploaderKey") });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/70 p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
        ) : docs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const isBusy = isDecrypting && isSelected;
              return (
                <div
                  key={doc.id}
                  className={`rounded-xl p-4 space-y-2 transition-all ${
                    isSelected ? "neu-pressed border-l-4 border-l-sky-500" : "neu-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t("documentTitle")}</p>
                      <p className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => handleView(doc)}
                        type="button"
                      >
                        {isBusy ? t("decrypting") : t("view")}
                      </button>
                      <button
                        className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                        disabled={isDecrypting}
                        onClick={() => handleDownload(doc)}
                        type="button"
                      >
                        {downloadingId === doc.id ? t("decrypting") : t("download")}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-mono text-[11px]">{formatAddress(doc.document_id)}</p>
                    <p>{t("uploadedBy")}: {formatAddress(doc.uploader_wallet)}</p>
                  </div>

                  {/* Inline preview */}
                  {isSelected && decryptedFile && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <FilePreview file={decryptedFile} />
                    </div>
                  )}
                  {isSelected && decryptError && (
                    <p className="mt-2 text-xs text-red-500">{decryptError}</p>
                  )}
                </div>
              );
            })}
            <p className="pt-2 text-center text-[10px] text-slate-400">
              {docs.length} document{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <button
          className="neu-surface hover:neu-pressed mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all"
          onClick={onClose}
          type="button"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
