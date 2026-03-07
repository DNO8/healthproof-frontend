"use client";

import { useState } from "react";
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
};

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
        console.error("[ScanQRModal] Permission save failed:", permResult.error);
      }

      // 2. Download and decrypt the file
      const result = await downloadAndDecrypt({
        cid: qr.crypto.cid,
        iv: qr.crypto.iv,
        wrappedKey: qr.crypto.encrypted_key,
        senderPublicKeyJwk: qr.crypto.patient_public_key,
        myUserId: doctorId,
      });

      setDecryptedFile({ url: result.url, blob: result.blob });

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
    const a = document.createElement("a");
    a.href = decryptedFile.url;
    a.download = `result-${resultMeta?.crypto.result_id.slice(0, 8) ?? "file"}`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">
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

            {resultMeta && (
              <div className="mt-4 space-y-2">
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
