"use client";

import { useRef, useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { generateEncryptionKey } from "@/services/encryption/key-management";
import { uploadEncryptedFile } from "@/services/storage/upload";

type UploadResultsModalProps = {
  onClose: () => void;
};

type UploadedDoc = {
  id: string;
  fileName: string;
  fileHash: string;
  cid: string;
  iv: string;
  uploadedAt: string;
};

const STORAGE_KEY = "hp_uploaded_results";

function getStoredResults(): UploadedDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeResult(doc: UploadedDoc) {
  const existing = getStoredResults();
  existing.unshift(doc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function UploadResultsModal({ onClose }: UploadResultsModalProps) {
  const t = useTranslations("uploadModal");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadedDoc | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    try {
      const key = await generateEncryptionKey();
      const uploadResult = await uploadEncryptedFile(file, key);

      const doc: UploadedDoc = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileHash: uploadResult.fileHash,
        cid: uploadResult.ipfs.cid,
        iv: uploadResult.iv,
        uploadedAt: new Date().toISOString(),
      };

      storeResult(doc);
      setResult(doc);

      sileo.success({
        title: t("uploadComplete"),
        description: t("uploadCompleteDesc", { fileName: file.name }),
        duration: 4000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("uploadFailed");
      sileo.error({
        title: t("uploadFailed"),
        description: message,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="dialog"
    >
      <div className="neu-shell mx-4 w-full max-w-lg border border-white/70 p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
          <button
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <svg
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="20"
            >
              <title>{t("close")}</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!result ? (
          <>
            <p className="mt-3 text-sm text-slate-500">{t("description")}</p>

            <div className="mt-6">
              <button
                className={`neu-surface flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 transition ${
                  dragging
                    ? "border-sky-400 bg-sky-50/50 ring-2 ring-sky-200"
                    : "border-slate-300 hover:border-sky-300 hover:bg-sky-50/30"
                }`}
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <span className="text-3xl">{dragging ? "⬇️" : "📁"}</span>
                <span className="text-sm font-medium text-slate-600">
                  {file ? file.name : t("selectFile")}
                </span>
                {!file && (
                  <span className="text-xs text-slate-400">
                    {t("dragHint")}
                  </span>
                )}
                {file && (
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </button>
              <input
                accept="*/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                ref={fileRef}
                type="file"
              />
            </div>

            <p className="mt-3 text-[11px] text-slate-400">{t("clientMode")}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
                disabled={!file || uploading}
                onClick={handleUpload}
                type="button"
              >
                {uploading ? t("encrypting") : t("encryptUpload")}
              </button>
              <button
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-sm font-semibold text-slate-800">
                {t("fileUploaded")}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("fileName")}
                </p>
                <p className="mt-0.5 text-sm text-slate-700 break-all">
                  {result.fileName}
                </p>
              </div>
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("sha256")}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                  {result.fileHash}
                </p>
              </div>
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("ipfsCid")}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                  {result.cid}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft)"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                type="button"
              >
                {t("uploadAnother")}
              </button>
              <button
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                {t("done")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
