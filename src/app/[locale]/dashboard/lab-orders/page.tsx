"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { assignLabToOrder, getOrderOnChain } from "@/actions/medical-orders-onchain";
import { useWalletAddress } from "@/hooks/useWalletAddress";

export default function LabOrdersPage() {
  const t = useTranslations("dashboard.labOrders");
  const walletAddress = useWalletAddress();
  const [orderId, setOrderId] = useState("");
  const [labWallet, setLabWallet] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [order, setOrder] = useState<{ orderId: string; patient: string; doctor: string; examType: string; status: number; episodeId: string; assignedLab: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!orderId.trim() || !labWallet.trim()) return;
    setAssigning(true);
    try {
      const res = await assignLabToOrder({ orderId: orderId.trim(), labWallet: labWallet.trim() });
      if (!res.success) {
        sileo.error({ title: t("assignError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({ title: t("assignSuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` });
        setOrderId("");
        setLabWallet("");
      }
    } catch (e) {
      sileo.error({ title: t("assignError"), description: String(e).slice(0, 120) });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700">{t("lookupTitle")}</h2>
        <input
          className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
          placeholder={t("lookupPlaceholder")}
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
        />
        <button
          className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
          disabled={loading || !lookupId.trim()}
          onClick={handleLookup}
          type="button"
        >
          {loading ? t("loading") : t("lookupButton")}
        </button>
        {order && (
          <div className="neu-inset rounded-xl p-4 space-y-1">
            <p className="text-sm font-semibold text-slate-800">{order.examType}</p>
            <p className="text-xs text-slate-500">{t("patient")}: {order.patient.slice(0, 8)}…{order.patient.slice(-4)}</p>
            <p className="text-xs text-slate-500">{t("doctor")}: {order.doctor.slice(0, 8)}…{order.doctor.slice(-4)}</p>
            <p className="text-xs text-slate-500">{t("status")}: {order.status === 0 ? t("statusPending") : order.status === 1 ? t("statusAssigned") : order.status === 2 ? t("statusCompleted") : t("statusCancelled")}</p>
          </div>
        )}
      </div>

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">{t("assignTitle")}</h2>
        <input
          className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
          placeholder={t("orderIdPlaceholder")}
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <input
          className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
          placeholder={t("labWalletPlaceholder")}
          value={labWallet}
          onChange={(e) => setLabWallet(e.target.value)}
        />
        <button
          className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
          disabled={assigning || !orderId.trim() || !labWallet.trim()}
          onClick={handleAssign}
          type="button"
        >
          {assigning ? t("assigning") : t("assignButton")}
        </button>
      </div>
    </main>
  );
}
