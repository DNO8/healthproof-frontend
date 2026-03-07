"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { EncryptedQRData } from "@/types/domain.types";
import { isExpired } from "@/features/permissions";
import { createPermission } from "@/actions/create-permission";
import { downloadAndDecrypt } from "@/services/storage/download";

type ScanQRModalProps = {
  onClose: () => void;
  doctorId: string;
};

type DecryptedFile = {
  url: string;
  blob: Blob;
  mime: string;
};

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
};

async function detectMime(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (header[0] === 0x89 && header[1] === 0x50) return "image/png";
  if (header[0] === 0xff && header[1] === 0xd8) return "image/jpeg";
  if (header[0] === 0x47 && header[1] === 0x49) return "image/gif";
  if (header[0] === 0x25 && header[1] === 0x50) return "application/pdf";
  if (header[0] === 0x52 && header[1] === 0x49) return "image/webp";
  // Try reading as text
  try {
    const text = await blob.slice(0, 512).text();
    if (/^[\x20-\x7E\t\n\r]+$/.test(text)) {
      if (text.trimStart().startsWith("{")) return "application/json";
      return "text/plain";
    }
  } catch {
    /* not text */
  }
  return blob.type || "application/octet-stream";
}

function FilePreview({ file }: { file: DecryptedFile }) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (
      file.mime === "text/plain" ||
      file.mime === "application/json" ||
      file.mime === "text/csv"
    ) {
      file.blob.text().then((t) => {
        if (file.mime === "application/json") {
          try {
            setTextContent(JSON.stringify(JSON.parse(t), null, 2));
          } catch {
            setTextContent(t);
          }
        } else {
          setTextContent(t);
        }
      });
    }
  }, [file]);

  if (file.mime.startsWith("image/")) {
    return (
      <div className="mt-4 flex justify-center">
        {/* biome-ignore lint: blob URL not compatible with next/image */}
        <img
          src={file.url}
          alt="Decrypted result"
          className="max-h-72 rounded-xl border border-slate-200 object-contain"
        />
      </div>
    );
  }

  if (file.mime === "application/pdf") {
    return (
      <div className="mt-4">
        <iframe
          src={file.url}
          className="h-80 w-full rounded-xl border border-slate-200"
          title="Decrypted PDF"
        />
      </div>
    );
  }

  if (textContent !== null) {
    return (
      <div className="mt-4">
        <pre className="neu-inset max-h-72 overflow-auto rounded-xl p-4 text-xs text-slate-700">
          {textContent}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6">
      <span className="text-2xl">📄</span>
      <p className="text-xs text-slate-400">
        {file.mime} &middot; {(file.blob.size / 1024).toFixed(1)} KB
      </p>
    </div>
  );
}

function parseEncryptedQR(raw: string): EncryptedQRData | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type !== "healthproof_permission") return null;
    if (!parsed.payload || !parsed.signature || !parsed.wallet) return null;
    if (!parsed.crypto?.cid || !parsed.crypto?.encrypted_key) return null;
    return parsed as EncryptedQRData;
  } catch {
    return null;
  }
}

export function ScanQRModal({ onClose, doctorId }: ScanQRModalProps) {
  const t = useTranslations("scanModal");
  const [rawInput, setRawInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFile | null>(
    null,
  );
  const [resultMeta, setResultMeta] = useState<EncryptedQRData | null>(null);

  async function handleProcess() {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      sileo.warning({
        title: t("pasteRequired"),
        description: t("pasteRequiredDesc"),
      });
      return;
    }

    const qr = parseEncryptedQR(trimmed);
    if (!qr) {
      sileo.error({
        title: t("invalidQr"),
        description: t("invalidQrDesc"),
      });
      return;
    }

    if (isExpired(qr)) {
      sileo.error({
        title: t("expired"),
        description: t("expiredDesc"),
      });
      return;
    }

    setProcessing(true);
    setResultMeta(qr);

    try {
      // 1. Save permission to DB
      const permResult = await createPermission({
        patient_id: qr.payload.patient_id,
        granted_to_id: doctorId,
        resource_type: qr.payload.resource_type as "RESULT" | "ORDER",
        resource_id: qr.payload.resource_id,
        encrypted_key: JSON.stringify(qr.crypto.encrypted_key),
        onchain_tx_hash: qr.signature,
      });

      if ("error" in permResult && permResult.error) {
        console.error(
          "[ScanQRModal] Permission save failed:",
          permResult.error,
        );
      }

      // 2. Download and decrypt the file
      const result = await downloadAndDecrypt({
        cid: qr.crypto.cid,
        iv: qr.crypto.iv,
        wrappedKey: qr.crypto.encrypted_key,
        senderPublicKeyJwk: qr.crypto.patient_public_key,
        myUserId: doctorId,
      });

      const mime = await detectMime(result.blob);
      const typedBlob = new Blob([result.blob], { type: mime });
      const typedUrl = URL.createObjectURL(typedBlob);
      setDecryptedFile({ url: typedUrl, blob: typedBlob, mime });

      sileo.success({
        title: t("decrypted"),
        description: t("decryptedDesc"),
        duration: 4000,
      });
    } catch (err) {
      console.error("[ScanQRModal] Error processing QR:", err);
      const message = err instanceof Error ? err.message : t("processError");
      sileo.error({
        title: t("processErrorTitle"),
        description: message,
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!decryptedFile) return;
    const ext = MIME_EXT[decryptedFile.mime] ?? "";
    const name = `result-${resultMeta?.crypto.result_id.slice(0, 8) ?? "file"}${ext}`;
    const a = document.createElement("a");
    a.href = decryptedFile.url;
    a.download = name;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className={`neu-shell mx-4 w-full border border-white/70 p-5 sm:p-8 ${decryptedFile ? "max-w-2xl" : "max-w-lg"}`}
      >
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

        {!decryptedFile ? (
          <>
            <p className="mt-3 text-sm text-slate-500">{t("description")}</p>

            <div className="mt-5">
              <label
                className="mb-1.5 block text-xs font-medium text-slate-700"
                htmlFor="qrPayload"
              >
                {t("qrPayload")}
              </label>
              <textarea
                id="qrPayload"
                className="neu-inset w-full rounded-xl px-4 py-3 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={t("qrPlaceholder")}
                rows={6}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
                disabled={!rawInput.trim() || processing}
                onClick={handleProcess}
                type="button"
              >
                {processing ? t("processing") : t("verifyDecrypt")}
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
              <span className="text-4xl">🔓</span>
              <p className="text-sm font-semibold text-slate-800">
                {t("fileDecrypted")}
              </p>
            </div>

            {/* File preview */}
            <FilePreview file={decryptedFile} />

            {resultMeta && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                  {t("viewDetails")}
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="neu-inset rounded-xl p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {t("patientLabel")}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                      {resultMeta.payload.patient_id}
                    </p>
                  </div>
                  <div className="neu-inset rounded-xl p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {t("cidLabel")}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                      {resultMeta.crypto.cid}
                    </p>
                  </div>
                  <div className="neu-inset rounded-xl p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {t("signatureLabel")}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                      {resultMeta.signature.slice(0, 30)}...
                    </p>
                  </div>
                </div>
              </details>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft)"
                onClick={handleDownload}
                type="button"
              >
                {t("downloadFile")}
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
