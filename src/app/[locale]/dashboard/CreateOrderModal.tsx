"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { createMedicalOrderOnChain } from "@/actions/medical-orders-onchain";
import { UserSelect } from "@/components/forms/UserSelect";

type CreateOrderModalProps = {
  onClose: () => void;
  doctorId: string;
};

const EXAM_TYPES = [
  "BLOOD_TEST",
  "URINE_TEST",
  "X_RAY",
  "MRI",
  "CT_SCAN",
  "ULTRASOUND",
  "ECG",
  "OTHER",
] as const;

export function CreateOrderModal({ onClose, doctorId }: CreateOrderModalProps) {
  const t = useTranslations("dashboard.actions");
  const [patientId, setPatientId] = useState("");
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [episodeId, setEpisodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    orderId: string;
    txHash: string;
  } | null>(null);

  async function handleCreate() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({ title: "Error", description: "Patient wallet is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await createMedicalOrderOnChain({
        patientWallet: trimmed,
        examType,
        episodeId: episodeId.trim() || undefined,
      });

      if ("error" in res) {
        sileo.error({
          title: "Order creation failed",
          description: res.error.slice(0, 120),
          duration: 5000,
        });
        return;
      }

      setResult({ orderId: res.orderId, txHash: res.txHash });
      sileo.success({
        title: "Order created",
        description: `Order registered on-chain. TX: ${res.txHash.slice(0, 16)}…`,
        duration: 4000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg rounded-3xl border border-white/70 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {t("createOrder")}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div>
              <UserSelect
                value={patientId}
                onChange={setPatientId}
                label="Patient"
                placeholder="Select patient or paste wallet"
                filterRole="patient"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Exam Type
              </label>
              <select
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Episode ID <span className="text-slate-400">(optional)</span>
              </label>
              <input
                className="neu-inset w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                value={episodeId}
                onChange={(e) => setEpisodeId(e.target.value)}
                placeholder="Paste episode ID to link this order"
                type="text"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Copy the Episode ID from Clinical Episodes after creating one.
              </p>
            </div>

            <button
              className="neu-surface hover:neu-pressed mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
              disabled={loading || !patientId.trim()}
              onClick={handleCreate}
              type="button"
            >
              {loading ? "Creating on-chain…" : "Create Medical Order"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Order created successfully ✓</p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="font-medium">Order ID:</span>{" "}
                <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  {result.orderId}
                </code>
              </div>
              {episodeId.trim() && (
                <div>
                  <span className="font-medium">Linked Episode:</span>{" "}
                  <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    {episodeId.trim()}
                  </code>
                </div>
              )}
              <div>
                <span className="font-medium">TX Hash:</span>{" "}
                <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  {result.txHash}
                </code>
              </div>
            </div>

            <button
              className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
