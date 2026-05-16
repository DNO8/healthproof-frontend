"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { EncryptedQRData } from "@/types/domain.types";
import { isExpired } from "@/features/permissions";
import { savePermissionKey } from "@/actions/save-permission-key";
import { checkAccessOnChain } from "@/actions/check-access-onchain";
import { downloadAndDecrypt } from "@/services/storage/download";

export default function ScanPage() {
  const t = useTranslations("dashboard.scan");
  const { user } = usePrivy();
  const myUserId = user?.id ?? "";
  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    decrypted: { url: string; blob: Blob; mime: string } | null;
    error: string | null;
  } | null>(null);

  async function handleScan() {
    if (!qrInput.trim() || !myUserId) return;
    setScanning(true);
    setResult(null);
    try {
      const data = JSON.parse(qrInput.trim()) as EncryptedQRData;
      const crypto = data.crypto;
      if (!crypto?.document_id || !crypto.cid || !crypto.encrypted_key) {
        throw new Error(t("invalidQR"));
      }
      if (isExpired(data)) {
        throw new Error(t("expiredQR"));
      }
      const access = await checkAccessOnChain({
        patientWallet: data.payload.patient_wallet,
        requesterWallet: data.payload.grantee_wallet,
        documentId: crypto.document_id,
      });
      if (!access.success || !access.data) {
        throw new Error(t("noAccess"));
      }
      await savePermissionKey({
        document_id: crypto.document_id,
        patient_wallet: data.payload.patient_wallet,
        grantee_wallet: data.payload.grantee_wallet,
        encrypted_key: JSON.stringify(crypto.encrypted_key),
      });
      const decrypted = await downloadAndDecrypt({
        cid: crypto.cid,
        iv: crypto.iv,
        wrappedKey: crypto.encrypted_key,
        senderPublicKeyJwk: crypto.patient_public_key,
        myUserId,
      });
      setResult({ decrypted: { ...decrypted, mime: "application/octet-stream" }, error: null });
    } catch (e) {
      setResult({ decrypted: null, error: String(e).slice(0, 200) });
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("qrInputLabel")}</label>
          <textarea
            className="neu-pressed w-full rounded-xl px-4 py-3 text-sm text-slate-700 outline-none min-h-[120px] resize-none"
            placeholder={t("qrInputPlaceholder")}
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
          />
        </div>
        <button
          className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
          disabled={scanning || !qrInput.trim()}
          onClick={handleScan}
          type="button"
        >
          {scanning ? t("scanning") : t("scanButton")}
        </button>

        {result && (
          <div className="rounded-xl p-4 space-y-3">
            {result.error ? (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{result.error}</div>
            ) : result.decrypted ? (
              <div className="space-y-3">
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl">{t("decryptSuccess")}</div>
                {result.decrypted.mime.startsWith("image/") ? (
                  <img src={result.decrypted.url} alt={t("preview")} className="neu-pressed rounded-xl max-w-full" />
                ) : (
                  <a
                    href={result.decrypted.url}
                    download={`document${getExt(result.decrypted.mime)}`}
                    className="inline-block neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {t("download")}
                  </a>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function getExt(mime: string) {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };
  return map[mime] || "";
}
