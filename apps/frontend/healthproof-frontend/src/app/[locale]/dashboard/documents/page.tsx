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
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { getKeyPair } from "@/services/encryption/keystore";
import { exportPublicKey } from "@/services/encryption/ecdh";

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
  const [keyMismatch, setKeyMismatch] = useState<boolean>(false);

  const { decrypt, decryptedFile, loading: decryptLoading, error: decryptError, clear } = useDocumentDecrypt();

  // One-time key diagnostic: check local keys match DB public key
  useEffect(() => {
    if (!userId || !walletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const myKeys = await getKeyPair(userId);
        if (!myKeys?.publicKey) return;
        const localPubJwk = await exportPublicKey(myKeys.publicKey);
        const dbPubJwk = await getUserPublicKey(userId) ?? await getUserPublicKey(walletAddress);
        if (cancelled) return;
        if (dbPubJwk && localPubJwk !== dbPubJwk) {
          console.error("[DocumentsPage] KEY MISMATCH detected at mount");
          setKeyMismatch(true);
        }
      } catch (err) {
        console.warn("[DocumentsPage] key diagnostic error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, walletAddress]);

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
        const rawName = file.name || doc.file_name || `document-${doc.document_id.slice(0, 8)}`;
        const baseName = rawName.replace(/\.[^.]+$/, "");
        const fullName = `${baseName}${ext}`;
        const a = document.createElement("a");
        a.href = file.url;
        a.download = fullName;
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

    // Debug: log available keys and search criteria
    console.log("[performDecrypt] doc.encrypted_keys:", Object.keys(doc.encrypted_keys));
    console.log("[performDecrypt] walletAddress:", walletAddress?.toLowerCase());
    console.log("[performDecrypt] userId:", userId);

    // Try multiple possible key formats
    const possibleKeys = [
      walletAddress.toLowerCase(),
      walletAddress,
      userId,
      userId.toLowerCase(),
    ];
    let wrappedKey = null;
    for (const key of possibleKeys) {
      if (doc.encrypted_keys[key]) {
        wrappedKey = doc.encrypted_keys[key];
        console.log("[performDecrypt] found wrappedKey for key:", key);
        break;
      }
    }

    if (!wrappedKey) {
      if (!silent) {
        setViewError(t("noKeyDesc") ?? "You don't have a decryption key for this document.");
        sileo.error({ title: t("noKey"), description: t("noKeyDesc") });
      }
      return null;
    }

    // Fallback: if uploader_public_key is missing, fetch it from the uploader's user record
    let senderPublicKeyJwk = doc.uploader_public_key;
    if (!senderPublicKeyJwk && doc.uploader_wallet) {
      console.log("[performDecrypt] uploader_public_key missing, fetching from DB...");
      senderPublicKeyJwk = await getUserPublicKey(doc.uploader_wallet);
      console.log("[performDecrypt] fetched uploader_public_key:", senderPublicKeyJwk ? "found" : "not found");
    }

    if (!senderPublicKeyJwk) {
      if (!silent) {
        setViewError(t("noUploaderKey") ?? "Uploader public key is missing.");
        sileo.error({ title: t("noKey"), description: t("noUploaderKey") });
      }
      return null;
    }

    // Check cached key mismatch from mount diagnostic
    if (keyMismatch) {
      if (!silent) {
        const msg = t("keyMismatch") ?? "Your local encryption keys do not match your account. You may need to recover your keys using your recovery codes.";
        setViewError(msg);
        sileo.error({ title: t("decryptError"), description: msg });
      }
      return null;
    }

    try {
      const result = await decrypt({
        cid: doc.document_id,
        iv: doc.iv,
        wrappedKey,
        senderPublicKeyJwk,
        myUserId: userId,
      });
      if (result) {
        result.name = doc.file_name || undefined;
      }
      console.log("[performDecrypt] decrypt result:", result ? "success" : "null");
      return result;
    } catch (e) {
      console.error("[performDecrypt] decrypt error:", e);
      if (!silent) {
        const msg = e instanceof Error ? e.message : String(e);
        setViewError(msg);
      }
      return null;
    }
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
