"use client";

import { useState, useEffect, useCallback } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { assignLabToOrder, getOrderOnChain } from "@/actions/medical-orders-onchain";
import { listOrdersByPatient } from "@/actions/list-orders-by-patient";
import { signGatewayMetaTx } from "@/lib/metatx/forwarder";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import type { OrderRef } from "@/actions/list-orders-by-doctor";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { LabSelect } from "@/components/forms/LabSelect";

const STATUS_FILTERS = [
  { key: "all", labelKey: "filterAll" },
  { key: "pending", labelKey: "filterPending" },
  { key: "assigned", labelKey: "filterAssigned" },
  { key: "completed", labelKey: "filterCompleted" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<any> }) {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
}

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

export default function MyOrdersPage() {
  const t = useTranslations("dashboard.myOrders");
  const walletAddress = useWalletAddress();
  const { wallets } = useWallets();

  const [orders, setOrders] = useState<OrderRef[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderRef | null>(null);
  const [selectedLab, setSelectedLab] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingOrders(true);
    try {
      const res = await listOrdersByPatient({ patientWallet: walletAddress });
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

  async function handleAssignLab() {
    if (!selectedOrder || !selectedLab.trim()) return;

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({ title: t("assignError"), description: "No active wallet found" });
      return;
    }

    setAssigning(true);
    try {
      const viemWallet = await getViemWalletClient(activeWallet);
      const patientAddress = (await viemWallet.getAddresses())[0];
      if (!patientAddress) throw new Error("No wallet address");

      const orderIdBytes =
        selectedOrder.orderId.startsWith("0x") && selectedOrder.orderId.length === 66
          ? (selectedOrder.orderId as `0x${string}`)
          : keccak256(toHex(selectedOrder.orderId));

      const request = await signGatewayMetaTx(
        viemWallet,
        "assignLabViaGateway",
        [orderIdBytes, selectedLab.trim(), patientAddress],
        HealthProofGatewayAbi,
      );

      const res = await assignLabToOrder({
        request,
        orderId: selectedOrder.orderId,
        labWallet: selectedLab.trim(),
        patientWallet: patientAddress,
      });

      if (!res.success) {
        sileo.error({ title: t("assignError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({
          title: t("assignSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setSelectedOrder(null);
        setSelectedLab("");
        await fetchOrders();
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

      {/* Orders list */}
      <div className="neu-shell border border-white/70 p-6 sm:p-8">
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
              <button
                key={o.orderId}
                className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                  selectedOrder?.orderId === o.orderId
                    ? "neu-pressed border-l-4 border-l-sky-500"
                    : "neu-surface hover:neu-pressed"
                }`}
                onClick={() => {
                  setSelectedOrder(
                    selectedOrder?.orderId === o.orderId ? null : o,
                  );
                  setSelectedLab("");
                }}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    {o.examType || t("orderLabel")}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(o.status)}`}
                  >
                    {o.status === 0
                      ? t("statusPending")
                      : o.status === 1
                        ? t("statusAssigned")
                        : o.status === 2
                          ? t("statusCompleted")
                          : t("statusCancelled")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>
                    {t("doctor")}:{" "}
                    <span className="font-mono">{formatAddress(o.doctor)}</span>
                  </span>
                  <span>
                    {t("createdAt")}:{" "}
                    {new Date(o.createdAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Order detail + lab assignment */}
        {selectedOrder && (
          <div className="mt-4 neu-inset rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                {selectedOrder.examType || t("orderLabel")}
              </p>
              <button
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100"
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedLab("");
                }}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                {t("doctor")}: {formatAddress(selectedOrder.doctor)}
              </p>
              <p>
                {t("status")}:{" "}
                {selectedOrder.status === 0
                  ? t("statusPending")
                  : selectedOrder.status === 1
                    ? t("statusAssigned")
                    : selectedOrder.status === 2
                      ? t("statusCompleted")
                      : t("statusCancelled")}
              </p>
              <p>
                {t("createdAt")}:{" "}
                {new Date(selectedOrder.createdAt * 1000).toLocaleString()}
              </p>
            </div>

            {selectedOrder.status === 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700">
                  {t("assignLabTitle")}
                </p>
                <LabSelect
                  value={selectedLab}
                  onChange={setSelectedLab}
                  doctorWallet={selectedOrder.doctor}
                />
                <button
                  className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
                  disabled={assigning || !selectedLab.trim()}
                  onClick={handleAssignLab}
                  type="button"
                >
                  {assigning ? t("assigning") : t("assignButton")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
