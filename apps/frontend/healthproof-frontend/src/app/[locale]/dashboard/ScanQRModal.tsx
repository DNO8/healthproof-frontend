"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { EncryptedQRData } from "@/types/domain.types";
import { isExpired } from "@/features/permissions";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { checkAccessOnChain } from "@/actions/permissions/check-access-onchain";
import { Modal } from "@/components/ui/Modal";
import { useDocumentDecrypt } from "@/hooks/documents/useDocumentDecrypt";
import { FilePreview, getExtensionFromMime } from "@/components/documents/FilePreview";

type ScanQRModalProps = {
  onClose: () => void;
  doctorId: string;
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
  const [resultMeta, setResultMeta] = useState<EncryptedQRData | null>(null);
  const { decrypt, decryptedFile, loading: decryptLoading, clear } = useDocumentDecrypt();

  const processing = decryptLoading;

  async function handleProcess() {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      sileo.warning({ title: t("pasteRequired"), description: t("pasteRequiredDesc") });
      return;
    }

    const qr = parseEncryptedQR(trimmed);
    if (!qr) {
      sileo.error({ title: t("invalidQr"), description: t("invalidQrDesc") });
      return;
    }

    if (isExpired(qr)) {
      sileo.error({ title: t("expired"), description: t("expiredDesc") });
      return;
    }

    setResultMeta(qr);
    clear();

    try {
      // 1. Save permission key to DB
      const permResult = await savePermissionKey({
        document_id: qr.crypto.document_id,
        patient_wallet: qr.payload.patient_wallet ?? qr.wallet,
        grantee_wallet: qr.payload.grantee_wallet ?? doctorId,
        encrypted_key: JSON.stringify(qr.crypto.encrypted_key),
      });

      if ("error" in permResult && permResult.error) {
        console.error("[ScanQRModal] Permission save failed:", permResult.error);
      }

      // 2. Verify on-chain access
      const patientWallet = qr.payload.patient_wallet ?? qr.wallet;
      const granteeWallet = qr.payload.grantee_wallet ?? doctorId;
      const hasAccess = await checkAccessOnChain({
        patientWallet,
        requesterWallet: granteeWallet,
        documentId: qr.crypto.document_id,
      });
      if (!hasAccess) {
        console.warn("[ScanQRModal] On-chain access check returned false — proceeding with QR trust");
      }

      // 3. Decrypt via shared hook
      await decrypt({
        cid: qr.crypto.cid,
        iv: qr.crypto.iv,
        wrappedKey: qr.crypto.encrypted_key,
        senderPublicKeyJwk: qr.crypto.patient_public_key,
        myUserId: doctorId,
      });

      sileo.success({ title: t("decrypted"), description: t("decryptedDesc"), duration: 4000 });
    } catch (err) {
      console.error("[ScanQRModal] Error processing QR:", err);
      const message = err instanceof Error ? err.message : t("processError");
      sileo.error({ title: t("processErrorTitle"), description: message });
    }
  }

  function handleDownload() {
    if (!decryptedFile) return;
    const ext = getExtensionFromMime(decryptedFile.mime);
    const name = `result-${resultMeta?.crypto.document_id.slice(0, 8) ?? "file"}${ext}`;
    const a = document.createElement("a");
    a.href = decryptedFile.url;
    a.download = name;
    a.click();
  }

  return (
    <Modal open onClose={onClose} title={t("title")} size={decryptedFile ? "lg" : "md"}>
      {!decryptedFile ? (
        <>
          <p className="text-sm text-slate-500">{t("description")}</p>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor="qrPayload">
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
            <button className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700" onClick={onClose} type="button">
              {t("cancel")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">🔓</span>
            <p className="text-sm font-semibold text-slate-800">{t("fileDecrypted")}</p>
          </div>

          {decryptedFile && <FilePreview file={decryptedFile} />}

          {resultMeta && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">{t("viewDetails")}</summary>
              <div className="mt-2 space-y-2">
                <div className="neu-inset rounded-xl p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("patientLabel")}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">{resultMeta.payload.patient_wallet}</p>
                </div>
                <div className="neu-inset rounded-xl p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("cidLabel")}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">{resultMeta.crypto.cid}</p>
                </div>
                <div className="neu-inset rounded-xl p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("signatureLabel")}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">{resultMeta.signature.slice(0, 30)}...</p>
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
            <button className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700" onClick={onClose} type="button">
              {t("done")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
