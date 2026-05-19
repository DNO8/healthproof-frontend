"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { assignLabToOrder, getOrderOnChain } from "@/actions/medical-orders-onchain";
import { listOrdersByLab } from "@/actions/list-orders-by-lab";
import type { OrderRef } from "@/actions/list-orders-by-lab";
import { useWalletAddress } from "@/hooks/useWalletAddress";

const STATUS_FILTERS = [
  { key: "all", labelKey: "filterAll" },
  { key: "pending", labelKey: "filterPending" },
  { key: "assigned", labelKey: "filterAssigned" },
  { key: "completed", labelKey: "filterCompleted" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function statusBadgeClass(status: number): string {
  switch (status) {
    case 0:
      return "bg-amber-100 text-amber-700";
    case 1:
      return "bg-sky-100 text-sky-700";
    case 2:
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export default function LabOrdersPage() {
  const t = useTranslations("dashboard.labOrders");
  const router = useRouter();
  const walletAddress = useWalletAddress();
  const [orders, setOrders] = useState<OrderRef[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

  const [orderId, setOrderId] = useState("");
  const [labWallet, setLabWallet] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [order, setOrder] = useState<{ orderId: string; patient: string; doctor: string; examType: string; status: number; episodeId: string; assignedLab: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingOrders(true);
    try {
      const res = await listOrdersByLab({ labWallet: walletAddress });
      if (res.success && res.data) {
        setOrders(res.data.orders);
      } else {
        setOrders([]);
      }
    } catch (e) {
      sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
    } finally {
      setLoadingOrders(false);
    }
  }, [walletAddress, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return o.status === 0;
    if (activeFilter === "assigned") return o.status === 1;
    if (activeFilter === "completed") return o.status === 2;
    return true;
  });

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
        fetchOrders();
      }
    } catch (e) {
      sileo.error({ title: t("assignError"), description: String(e).slice(0, 120) });
    } finally {
      setAssigning(false);
    }
  }

  function handleUploadResult(order: OrderRef) {
    const params = new URLSearchParams();
    params.set("orderId", order.orderId);
    params.set("patientWallet", order.patient);
    router.push(`/dashboard/upload?${params.toString()}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      {/* Auto-list: My Orders */}
      <div className="neu-shell border border-white/70 p-6 sm:p-8 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{t("myOrders")}</h2>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === f.key
                  ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                  : "neu-surface text-slate-500 hover:neu-pressed"
              }`}
              onClick={() => setActiveFilter(f.key)}
              type="button"
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {loadingOrders ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
        ) : filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredOrders.map((o) => (
              <div
                key={o.orderId}
                className="neu-surface rounded-xl p-4 space-y-2 transition hover:neu-pressed"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{o.examType || t("orderCardTitle")}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(o.status)}`}>
                    {o.status === 0 ? t("statusPending") : o.status === 1 ? t("statusAssigned") : o.status === 2 ? t("statusCompleted") : t("statusCancelled")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{t("patient")}: <span className="font-mono">{formatAddress(o.patient)}</span></span>
                  <span>{t("doctor")}: <span className="font-mono">{formatAddress(o.doctor)}</span></span>
                  <span>{t("createdAt")}: {new Date(o.createdAt * 1000).toLocaleDateString()}</span>
                </div>
                {(o.status === 0 || o.status === 1) && (
                  <button
                    className="mt-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                    onClick={() => handleUploadResult(o)}
                    type="button"
                  >
                    {t("uploadResult")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Tools */}
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
