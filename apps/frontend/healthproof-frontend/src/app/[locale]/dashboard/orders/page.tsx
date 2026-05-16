"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { createMedicalOrderOnChain, getOrderOnChain } from "@/actions/medical-orders-onchain";
import { useWalletAddress } from "@/hooks/useWalletAddress";

const EXAM_TYPES = [
  "BLOOD_TEST", "URINE_TEST", "X_RAY", "MRI", "CT_SCAN", "ULTRASOUND", "ECG", "OTHER",
] as const;

export default function OrdersPage() {
  const t = useTranslations("dashboard.orders");
  const walletAddress = useWalletAddress();
  const [tab, setTab] = useState<"create" | "lookup">("create");
  const [patientId, setPatientId] = useState("");
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [episodeId, setEpisodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [order, setOrder] = useState<{ orderId: string; patient: string; doctor: string; examType: string; status: number; episodeId: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function handleCreate() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({ title: t("patientRequiredTitle"), description: t("patientRequiredDesc") });
      return;
    }
    setLoading(true);
    try {
      const res = await createMedicalOrderOnChain({
        patientWallet: trimmed,
        examType,
        episodeId: episodeId.trim() || undefined,
      });
      if (!res.success) {
        sileo.error({ title: t("createError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({
          title: t("createSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setPatientId("");
        setEpisodeId("");
      }
    } catch (e) {
      sileo.error({ title: t("createError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setOrder(null);
    try {
      const res = await getOrderOnChain({ orderId: lookupId.trim() });
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        sileo.error({ title: t("lookupError"), description: t("notFound") });
      }
    } catch (e) {
      sileo.error({ title: t("lookupError"), description: String(e).slice(0, 120) });
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === "create" ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"
            }`}
            onClick={() => setTab("create")}
            type="button"
          >
            {t("tabCreate")}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === "lookup" ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"
            }`}
            onClick={() => setTab("lookup")}
            type="button"
          >
            {t("tabLookup")}
          </button>
        </div>
      </div>

      {tab === "create" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("patientLabel")}</label>
            <input
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              placeholder={t("patientPlaceholder")}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("examTypeLabel")}</label>
            <select
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              {EXAM_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("episodeLabel")}</label>
            <input
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              placeholder={t("episodePlaceholder")}
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
            />
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={loading || !patientId.trim()}
            onClick={handleCreate}
            type="button"
          >
            {loading ? t("creating") : t("createButton")}
          </button>
        </div>
      )}

      {tab === "lookup" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("orderIdLabel")}</label>
            <input
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              placeholder={t("orderIdPlaceholder")}
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={lookupLoading || !lookupId.trim()}
            onClick={handleLookup}
            type="button"
          >
            {lookupLoading ? t("loading") : t("lookupButton")}
          </button>
          {order && (
            <div className="neu-inset rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-slate-800">{order.examType}</p>
              <p className="text-xs text-slate-500">{t("patient")}: {order.patient.slice(0, 8)}…{order.patient.slice(-4)}</p>
              <p className="text-xs text-slate-500">{t("doctor")}: {order.doctor.slice(0, 8)}…{order.doctor.slice(-4)}</p>
              <p className="text-xs text-slate-500">{t("episode")}: {order.episodeId.slice(0, 10)}…</p>
              <p className="text-xs text-slate-500">{t("status")}: {order.status === 0 ? t("statusPending") : order.status === 1 ? t("statusAssigned") : order.status === 2 ? t("statusCompleted") : t("statusCancelled")}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
