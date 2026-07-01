"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Shield,
  UserCheck,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import type { PatientDocument } from "@/actions/emergency/list-patient-documents";
import { listPatientDocuments } from "@/actions/emergency/list-patient-documents";
import type { PatientOption } from "@/actions/emergency/list-patients";
import { listPatients } from "@/actions/emergency/list-patients";
import { requestEmergencyOnChain } from "@/actions/emergency/request-emergency-onchain";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { signMetaTransaction } from "@/lib/metatx/forwarder";

interface Props {
  onClose: () => void;
}

async function getViemWalletClient(wallet: {
  getEthereumProvider: () => Promise<unknown>;
}) {
  const provider = (await wallet.getEthereumProvider()) as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  return createWalletClient({
    chain: HEALTHPROOF_CHAIN,
    transport: custom(provider),
  });
}

export function EmergencyAccessModal({ onClose }: Props) {
  const t = useTranslations("dashboard.emergency");
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = user?.wallet?.address;

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [selectedPatientWallet, setSelectedPatientWallet] = useState("");
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [reason, setReason] = useState("");
  const [path, setPath] = useState<"guardian" | "dual-doctor" | "patient">(
    "guardian",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load patients on mount
  useEffect(() => {
    let cancelled = false;
    listPatients({})
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) {
            setPatients(res.data);
          } else {
            setPatients([]);
          }
          setLoadingPatients(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPatients([]);
          setLoadingPatients(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load documents when patient changes
  useEffect(() => {
    if (!selectedPatientWallet) {
      setDocuments([]);
      setSelectedDocumentId("");
      return;
    }
    let cancelled = false;
    setLoadingDocs(true);
    listPatientDocuments({ patientWallet: selectedPatientWallet })
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) {
            setDocuments(res.data);
          } else {
            setDocuments([]);
          }
          setLoadingDocs(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([]);
          setLoadingDocs(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPatientWallet]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !wallet ||
      !wallets?.length ||
      !selectedPatientWallet ||
      !selectedDocumentId
    )
      return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const resourceId =
        selectedDocumentId.startsWith("0x") && selectedDocumentId.length === 66
          ? (selectedDocumentId as `0x${string}`)
          : keccak256(toHex(selectedDocumentId));

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
        [selectedPatientWallet as `0x${string}`, resourceId, reasonHash],
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
        patientWallet: selectedPatientWallet,
        documentId: selectedDocumentId,
        reasonHash: reasonHash,
      });

      if (result.success) {
        setSuccess(
          t("requestSuccess", {
            txHash: result.data.txHash,
            requestId: result.data.requestId,
          }),
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

  const _selectedPatient = patients.find(
    (p) => p.wallet_address === selectedPatientWallet,
  );

  const pathInfo: Record<
    typeof path,
    { icon: React.ReactNode; desc: string; detail: string }
  > = {
    guardian: {
      icon: <Shield className="h-4 w-4" />,
      desc: t("pathGuardian"),
      detail:
        t("pathGuardianDetail") ||
        "Requires an active guardian to approve. Access expires in 72 hours.",
    },
    "dual-doctor": {
      icon: <UserCheck className="h-4 w-4" />,
      desc: t("pathDualDoctor"),
      detail:
        t("pathDualDoctorDetail") ||
        "Requires a second verified doctor to witness. Access expires in 4 hours.",
    },
    patient: {
      icon: <Clock className="h-4 w-4" />,
      desc: t("pathPatient"),
      detail:
        t("pathPatientDetail") ||
        "Patient must be conscious and explicitly approve. Unlimited duration.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
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
          {/* Patient Select */}
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t("selectPatient")}
            </span>
            <div className="relative">
              <select
                value={selectedPatientWallet}
                onChange={(e) => {
                  setSelectedPatientWallet(e.target.value);
                  setSelectedDocumentId("");
                }}
                className="neu-input w-full appearance-none rounded-xl px-4 py-2 pr-10 text-sm"
                disabled={loadingPatients || patients.length === 0}
                required
              >
                <option value="">
                  {loadingPatients
                    ? t("loadingPatients")
                    : patients.length === 0
                      ? t("noPatients")
                      : "--"}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.wallet_address}>
                    {p.full_name ||
                      p.email ||
                      `${p.wallet_address.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Document Select */}
          {selectedPatientWallet && (
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("selectDocument")}
              </span>
              <div className="relative">
                <select
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="neu-input w-full appearance-none rounded-xl px-4 py-2 pr-10 text-sm"
                  disabled={loadingDocs || documents.length === 0}
                  required
                >
                  <option value="">
                    {loadingDocs
                      ? t("loadingDocuments")
                      : documents.length === 0
                        ? t("noDocuments")
                        : "--"}
                  </option>
                  {documents.map((d) => (
                    <option key={d.document_id} value={d.document_id}>
                      {d.file_name || `${d.document_id.slice(0, 16)}...`} (
                      {new Date(d.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {selectedDocumentId && (
                <p className="mt-1 text-xs text-slate-400 font-mono">
                  {t("documentId")}: {selectedDocumentId}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t("reason")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="neu-input w-full rounded-xl px-4 py-2 text-sm"
              rows={3}
              required
            />
          </div>

          {/* Activation Path */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {t("activationPath")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["guardian", "dual-doctor", "patient"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPath(p)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                    path === p
                      ? "border-sky-300 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {pathInfo[p].icon}
                  {pathInfo[p].desc}
                </button>
              ))}
            </div>
            <div className="mt-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-700">
              <strong>{pathInfo[path].desc}</strong>: {pathInfo[path].detail}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !wallet ||
              !selectedPatientWallet ||
              !selectedDocumentId
            }
            className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? t("submitting") : t("submitRequest")}
          </button>
        </form>
      </div>
    </div>
  );
}
