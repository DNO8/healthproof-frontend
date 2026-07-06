"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { sileo } from "sileo";
import { checkAccessOnChain } from "@/actions/permissions/check-access-onchain";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { QRScanner } from "@/components/scanner/QRScanner";
import { isExpired } from "@/features/permissions";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useRouter } from "@/i18n/navigation";
import type { EncryptedQRData } from "@/types/domain.types";

interface QRV2 {
  type: "healthproof_permission_v2";
  scope: "document" | "episode";
  patient_wallet: string;
  grantee_wallet: string;
  expires_at: number;
  nonce: string;
  document_id?: string;
  episode_id?: string;
}

function isValidWallet(addr: unknown): boolean {
  return (
    typeof addr === "string" && addr.startsWith("0x") && addr.length === 42
  );
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
  const lastPayloadRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  async function processPayload(payload: string) {
    if (!myUserId) return;

    // Dedupe: ignore the exact same payload processed recently
    if (lastPayloadRef.current === payload) {
      console.log("[ScanPage] duplicate payload ignored");
      return;
    }

    // Guard: prevent concurrent processing
    if (processingRef.current) {
      console.log("[ScanPage] already processing, ignoring new scan");
      return;
    }

    processingRef.current = true;
    lastPayloadRef.current = payload;
    console.log("[ScanPage] processPayload start, userId:", myUserId);
    setScanning(true);
    setError(null);
    try {
      const parsed = JSON.parse(payload.trim());

      // ─── QR v2 (lightweight) ───
      if (parsed?.type === "healthproof_permission_v2") {
        const data = parsed as QRV2;
        if (!data.patient_wallet || !data.grantee_wallet || !data.scope) {
          throw new Error(t("invalidQR"));
        }
        if (
          !isValidWallet(data.patient_wallet) ||
          !isValidWallet(data.grantee_wallet)
        ) {
          throw new Error(t("invalidQR"));
        }
        const now = Math.floor(Date.now() / 1000);
        if (data.expires_at && data.expires_at < now) {
          throw new Error(t("expiredQR"));
        }
        if (
          walletAddress &&
          walletAddress.toLowerCase() !== data.grantee_wallet.toLowerCase()
        ) {
          console.error("[ScanPage] Wallet mismatch:", {
            current: walletAddress,
            qrGrantee: data.grantee_wallet,
          });
          throw new Error(
            t("walletMismatch") ??
              "This QR code is not intended for your wallet.",
          );
        }

        const params = new URLSearchParams();
        params.set("patient", data.patient_wallet);
        if (data.scope === "episode") {
          if (!data.episode_id) throw new Error(t("invalidQR"));
          params.set("episode", data.episode_id);
          sileo.success({
            title: t("accessGranted"),
            description: t("redirecting"),
          });
          console.log(
            "[ScanPage] redirecting to shared with episode:",
            data.episode_id,
          );
          router.push(`/dashboard/shared?${params.toString()}`);
          return;
        } else {
          // document scope
          if (!data.document_id) throw new Error(t("invalidQR"));
          params.set("doc", data.document_id);
          sileo.success({
            title: t("accessGranted"),
            description: t("redirecting"),
          });
          console.log(
            "[ScanPage] redirecting to shared with doc:",
            data.document_id,
          );
          router.push(`/dashboard/shared?${params.toString()}`);
          return;
        }
      }

      // ─── Legacy v1 QR (heavy, with crypto keys) ───
      const data = parsed as EncryptedQRData;
      console.log(
        "[ScanPage] QR parsed, docId:",
        data.crypto?.document_id,
        "patient:",
        data.payload?.patient_wallet,
        "grantee:",
        data.payload?.grantee_wallet,
      );
      const crypto = data.crypto;
      if (
        !crypto?.document_id ||
        !crypto.cid ||
        !crypto.encrypted_key ||
        !crypto.patient_public_key
      ) {
        throw new Error(t("invalidQR"));
      }
      if (!data.payload?.patient_wallet || !data.payload?.grantee_wallet) {
        throw new Error(t("invalidQR"));
      }
      if (
        !isValidWallet(data.payload.patient_wallet) ||
        !isValidWallet(data.payload.grantee_wallet)
      ) {
        throw new Error(t("invalidQR"));
      }
      if (isExpired(data)) {
        throw new Error(t("expiredQR"));
      }
      // Block if current wallet doesn't match QR grantee
      if (
        walletAddress &&
        walletAddress.toLowerCase() !==
          data.payload.grantee_wallet.toLowerCase()
      ) {
        console.error("[ScanPage] Wallet mismatch:", {
          current: walletAddress,
          qrGrantee: data.payload.grantee_wallet,
        });
        throw new Error(
          t("walletMismatch") ??
            "This QR code is not intended for your wallet.",
        );
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
      console.log("[ScanPage] saving permission keys...");
      const qrDocs = crypto.documents ?? [crypto];
      for (const doc of qrDocs) {
        const saveResult = await savePermissionKey({
          document_id: doc.document_id,
          patient_wallet: data.payload.patient_wallet,
          grantee_wallet: data.payload.grantee_wallet,
          encrypted_key: JSON.stringify(doc.encrypted_key),
        });
        if ("error" in saveResult && saveResult.error) {
          console.warn(
            "[ScanPage] savePermissionKey:",
            doc.document_id,
            saveResult.error,
          );
        } else {
          console.log("[ScanPage] permission key saved for", doc.document_id);
        }
      }
      sileo.success({
        title: t("accessGranted"),
        description: t("redirecting"),
      });
      const params = new URLSearchParams();
      params.set("doc", crypto.document_id);
      params.set("pk", crypto.patient_public_key);
      console.log(
        "[ScanPage] redirecting to shared with doc:",
        crypto.document_id,
      );
      router.push(`/dashboard/shared?${params.toString()}`);
      return;
    } catch (e) {
      const msg = String(e).slice(0, 200);
      console.error("[ScanPage] processPayload error:", msg, e);

      // Clear last payload on error so user can retry the same QR
      lastPayloadRef.current = null;

      // Show a friendlier message for rate limits
      if (msg.includes("429") || msg.includes("Rate limit")) {
        setError(
          t("rateLimitError") ??
            "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
        );
        sileo.error({
          title: t("scanErrorTitle"),
          description:
            t("rateLimitError") ?? "Espera unos segundos antes de reintentar.",
        });
      } else {
        setError(msg);
        sileo.error({ title: t("scanErrorTitle"), description: msg });
      }
    } finally {
      setScanning(false);
      processingRef.current = false;
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
          <span className="mb-1.5 block text-xs font-medium text-slate-700">
            {t("qrInputLabel")}
            <textarea
              className="neu-pressed mt-1.5 block w-full rounded-xl px-4 py-3 text-sm text-slate-700 outline-none min-h-[120px] resize-none"
              placeholder={t("qrInputPlaceholder")}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
            />
          </span>
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
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
