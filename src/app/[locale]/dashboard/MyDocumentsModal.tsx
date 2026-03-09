"use client";

import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { listDocumentSecretsForWallet } from "@/actions/get-document-secret";

type DocumentRow = {
  id: string;
  document_id: string;
  uploader_wallet: string;
  patient_wallet: string;
  created_at: string;
};

type MyDocumentsModalProps = {
  onClose: () => void;
};

export function MyDocumentsModal({ onClose }: MyDocumentsModalProps) {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address;

  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    listDocumentSecretsForWallet(walletAddress)
      .then((rows) => setDocs(rows as DocumentRow[]))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/70 p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">My Documents</h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No documents found for your wallet.
          </p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl bg-slate-50 p-4 text-xs text-slate-700 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Document
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  <code className="break-all rounded bg-white px-1 py-0.5 text-[11px]">
                    {doc.document_id}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Uploaded by:</span>{" "}
                  <code className="text-[11px]">
                    {doc.uploader_wallet.slice(0, 8)}…
                    {doc.uploader_wallet.slice(-6)}
                  </code>
                </div>
              </div>
            ))}
            <p className="pt-2 text-center text-[10px] text-slate-400">
              {docs.length} document{docs.length !== 1 ? "s" : ""} on record
            </p>
          </div>
        )}

        <button
          className="neu-surface hover:neu-pressed mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}
