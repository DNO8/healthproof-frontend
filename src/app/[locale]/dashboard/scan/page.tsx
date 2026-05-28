"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import type { EncryptedQRData } from "@/types/domain.types";
import { isExpired } from "@/features/permissions";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { checkAccessOnChain } from "@/actions/permissions/check-access-onchain";
import { QRScanner } from "@/components/scanner/QRScanner";
import { sileo } from "sileo";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";

function isValidWallet(addr: unknown): boolean {
  return typeof addr === "string" && addr.startsWith("0x") && addr.length === 42;
}

export default function ScanPage() {
  const t = useTranslations("dashboard.scan");
  const router = useRouter();
  const { user } = usePrivy();
  const myUserId = user?.id ?? "";
  const walletAddress = useWalletAddress();

  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processPayload(payload: string) {
    if (!myUserId) return;
    console.log("[ScanPage] processPayload start, userId:", myUserId);
    setScanning(true);
    setError(null);
    try {
      const data = JSON.parse(payload.trim()) as EncryptedQRData;
      console.log("[ScanPage] QR parsed, docId:", data.crypto?.document_id, "patient:", data.payload?.patient_wallet, "grantee:", data.payload?.grantee_wallet);
      const crypto = data.crypto;
      if (!crypto?.document_id || !crypto.cid || !crypto.encrypted_key || !crypto.patient_public_key) {
        throw new Error(t("invalidQR"));
      }
      if (!data.payload?.patient_wallet || !data.payload?.grantee_wallet) {
        throw new Error(t("invalidQR"));
      }
      if (!isValidWallet(data.payload.patient_wallet) || !isValidWallet(data.payload.grantee_wallet)) {
        throw new Error(t("invalidQR"));
      }
      if (isExpired(data)) {
        throw new Error(t("expiredQR"));
      }
      // Warn if current wallet doesn't match QR grantee (cross-device wallet mismatch)
      if (walletAddress && walletAddress.toLowerCase() !== data.payload.grantee_wallet.toLowerCase()) {
        console.warn("[ScanPage] Wallet mismatch:", {
          current: walletAddress,
          qrGrantee: data.payload.grantee_wallet,
        });
      }
      console.log("[ScanPage] checking on-chain access...");
      const access = await checkAccessOnChain({
        patientWallet: data.payload.patient_wallet,
        requesterWallet: data.payload.grantee_wallet,
        documentId: crypto.document_id,
      });
      console.log("[ScanPage] access result:", access);
      if (!access.success || !access.data) {
        throw new Error(t("noAccess"));
      }
      console.log("[ScanPage] saving permission key...");
      const saveResult = await savePermissionKey({
        document_id: crypto.document_id,
        patient_wallet: data.payload.patient_wallet,
        grantee_wallet: data.payload.grantee_wallet,
        encrypted_key: JSON.stringify(crypto.encrypted_key),
      });
      if ("error" in saveResult && saveResult.error) {
        console.warn("[ScanPage] savePermissionKey:", saveResult.error);
      } else {
        console.log("[ScanPage] permission key saved");
      }
      sileo.success({ title: t("accessGranted"), description: t("redirecting") });
      const params = new URLSearchParams();
      params.set("doc", crypto.document_id);
      params.set("pk", crypto.patient_public_key);
      console.log("[ScanPage] redirecting to shared with doc:", crypto.document_id);
      router.push(`/dashboard/shared?${params.toString()}`);
    } catch (e) {
      const msg = String(e).slice(0, 200);
      console.error("[ScanPage] processPayload error:", msg, e);
      setError(msg);
      sileo.error({ title: t("scanErrorTitle"), description: msg });
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
