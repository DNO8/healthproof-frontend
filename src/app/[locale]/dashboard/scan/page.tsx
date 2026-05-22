"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import type { EncryptedQRData } from "@/types/domain.types";
import { isExpired } from "@/features/permissions";
import { savePermissionKey } from "@/actions/save-permission-key";
import { checkAccessOnChain } from "@/actions/check-access-onchain";
import { QRScanner } from "@/components/scanner/QRScanner";
import { sileo } from "sileo";

export default function ScanPage() {
  const t = useTranslations("dashboard.scan");
  const router = useRouter();
  const { user } = usePrivy();
  const myUserId = user?.id ?? "";

  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processPayload(payload: string) {
    if (!myUserId) return;
    setScanning(true);
    setError(null);
    try {
      const data = JSON.parse(payload.trim()) as EncryptedQRData;
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
      sileo.success({ title: t("accessGranted"), description: t("redirecting") });
      router.push(`/dashboard/shared?doc=${encodeURIComponent(crypto.document_id)}`);
    } catch (e) {
      setError(String(e).slice(0, 200));
    } finally {
      setScanning(false);
    }
  }

  async function handleScan() {
    if (!qrInput.trim()) return;
    await processPayload(qrInput);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="neu-shell border border-white/70 p-4 sm:p-6 space-y-3 mb-6">
        <p className="text-sm text-slate-700 font-medium">{t("cameraLabel")}</p>
        <QRScanner
          onScan={(decodedText) => processPayload(decodedText)}
          onError={(err) => console.error("[QRScanner]", err)}
        />
      </div>

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

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    </main>
  );
}
