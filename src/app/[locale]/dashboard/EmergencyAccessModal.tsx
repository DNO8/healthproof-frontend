"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X, Shield, UserCheck, Clock } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import { requestEmergencyOnChain } from "@/actions/emergency/request-emergency-onchain";

interface Props {
  onClose: () => void;
}

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<any> }) {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
}

export function EmergencyAccessModal({ onClose }: Props) {
  const t = useTranslations("dashboard.emergency");
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = user?.wallet?.address;

  const [patientWallet, setPatientWallet] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [reason, setReason] = useState("");
  const [path, setPath] = useState<"guardian" | "dual-doctor" | "patient">("guardian");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !wallets?.length) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const resourceId = documentId.startsWith("0x") && documentId.length === 66
        ? (documentId as `0x${string}`)
        : keccak256(toHex(documentId));

      const reasonHash = keccak256(toHex(reason || "Emergency access"));

      const to = CONTRACT_ADDRESSES.EmergencyAccessManager;
      if (!to) {
        throw new Error("EmergencyAccessManager address not configured");
      }

      const activeWallet = wallets[0];
      const viemWallet = await getViemWalletClient(activeWallet);

      const request = await signMetaTransaction(
        viemWallet,
        to,
        "requestEmergencyAccess",
        [patientWallet as `0x${string}`, resourceId, reasonHash],
        [
          {
            name: "requestEmergencyAccess",
            type: "function",
            inputs: [
              { name: "patient", type: "address" },
              { name: "resourceId", type: "bytes32" },
              { name: "reasonHash", type: "bytes32" },
            ],
            outputs: [{ name: "requestId", type: "bytes32" }],
            stateMutability: "nonpayable",
          },
        ],
        BigInt(0),
      );

      const result = await requestEmergencyOnChain({
        request,
        patientWallet,
        documentId,
        reasonHash: reasonHash,
      });

      if (result.success) {
        setSuccess(
          t("requestSuccess", {
            txHash: result.data.txHash,
            requestId: result.data.requestId,
          })
        );
      } else {
        setError(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">{t("description")}</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("patientWallet")}
            </label>
            <input
              type="text"
              value={patientWallet}
              onChange={(e) => setPatientWallet(e.target.value)}
              placeholder="0x..."
              className="neu-input w-full rounded-xl px-4 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("documentId")}
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="CID or bytes32"
              className="neu-input w-full rounded-xl px-4 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("reason")}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="neu-input w-full rounded-xl px-4 py-2 text-sm"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t("activationPath")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPath("guardian")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                  path === "guardian"
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Shield className="h-4 w-4" />
                {t("pathGuardian")}
              </button>
              <button
                type="button"
                onClick={() => setPath("dual-doctor")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                  path === "dual-doctor"
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                {t("pathDualDoctor")}
              </button>
              <button
                type="button"
                onClick={() => setPath("patient")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                  path === "patient"
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Clock className="h-4 w-4" />
                {t("pathPatient")}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            {t("pathWarning")}
          </div>

          <button
            type="submit"
            disabled={loading || !wallet}
            className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? t("submitting") : t("submitRequest")}
          </button>
        </form>
      </div>
    </div>
  );
}
