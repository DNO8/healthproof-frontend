"use client";

import { useState, useEffect, useCallback } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, keccak256, toHex, stringToHex } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { createMedicalOrderOnChain, getOrderOnChain } from "@/actions/medical-orders-onchain";
import { listOrdersByDoctor } from "@/actions/list-orders-by-doctor";
import { listOrdersByPatient } from "@/actions/list-orders-by-patient";
import { listEpisodesByPatient } from "@/actions/list-episodes-by-patient";
import { signGatewayMetaTx } from "@/lib/metatx/forwarder";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import type { OrderRef } from "@/actions/list-orders-by-doctor";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { UserSelect } from "@/components/forms/UserSelect";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<any> }) {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
}

const EXAM_TYPES = [
  "BLOOD_TEST", "URINE_TEST", "X_RAY", "MRI", "CT_SCAN", "ULTRASOUND", "ECG", "OTHER",
] as const;

export default function OrdersPage() {
  const t = useTranslations("dashboard.orders");
  const walletAddress = useWalletAddress();
  const { wallets } = useWallets();
  const [tab, setTab] = useState<"create" | "lookup">("create");
  const [patientId, setPatientId] = useState("");
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [episodeId, setEpisodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ orderId: string; txHash: string } | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [patientEpisodes, setPatientEpisodes] = useState<OnChainEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [order, setOrder] = useState<{ orderId: string; patient: string; doctor: string; examType: string; status: number; episodeId: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [orders, setOrders] = useState<OrderRef[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRef | null>(null);

  const [lookupPatientId, setLookupPatientId] = useState("");
  const [lookupOrders, setLookupOrders] = useState<OrderRef[]>([]);
  const [loadingLookupOrders, setLoadingLookupOrders] = useState(false);

  async function handleCreate() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({ title: t("patientRequiredTitle"), description: t("patientRequiredDesc") });
      return;
    }
    if (!episodeId.trim()) {
      sileo.error({ title: t("episodeRequiredTitle"), description: t("episodeRequiredDesc") });
      return;
    }

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({ title: t("createError"), description: "No active wallet found" });
      return;
    }

    setLoading(true);
    try {
      const viemWallet = await getViemWalletClient(activeWallet);
      const doctorAddress = (await viemWallet.getAddresses())[0];
      if (!doctorAddress) throw new Error("No wallet address");

      const orderId = keccak256(
        toHex(`${trimmed}-${examType}-${Date.now()}`),
      );
      const orderTypeBytes = stringToHex("EXAM", { size: 32 });
      const examTypeBytes = stringToHex(examType, { size: 32 });
      const episodeIdBytes =
        episodeId.trim().startsWith("0x") && episodeId.trim().length === 66
          ? (episodeId.trim() as `0x${string}`)
          : keccak256(toHex(episodeId.trim()));

      const request = await signGatewayMetaTx(
        viemWallet,
        "createMedicalOrder",
        [
          orderId,
          trimmed,
          ZERO_ADDRESS,
          episodeIdBytes,
          orderTypeBytes,
          examTypeBytes,
          doctorAddress,
        ],
        HealthProofGatewayAbi,
      );

      const res = await createMedicalOrderOnChain({
        request,
        patientWallet: trimmed,
        examType,
        orderId,
      });
      if (!res.success) {
        sileo.error({ title: t("createError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        setResult({ orderId, txHash: res.data.txHash });
        sileo.success({
          title: t("createSuccess"),
          description: `TX: ${res.data.txHash.slice(0, 16)}…`,
        });
        await fetchOrders();
      }
    } catch (e) {
      sileo.error({ title: t("createError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setPatientId("");
    setEpisodeId("");
    setPatientEpisodes([]);
  }

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingOrders(true);
    try {
      const res = await listOrdersByDoctor({ doctorWallet: walletAddress });
      if (res.success && res.data) {
        setOrders(res.data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (tab === "lookup") {
      fetchOrders();
    }
  }, [tab, fetchOrders]);

  const fetchLookupOrders = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingLookupOrders(true);
    try {
      if (!lookupPatientId.trim()) {
        const res = await listOrdersByDoctor({ doctorWallet: walletAddress });
        if (res.success && res.data) {
          setLookupOrders(res.data.orders);
        } else {
          setLookupOrders([]);
        }
      } else {
        const res = await listOrdersByPatient({ patientWallet: lookupPatientId.trim() });
        if (res.success && res.data) {
          setLookupOrders(res.data.orders);
        } else {
          setLookupOrders([]);
        }
      }
    } catch (e) {
      console.error(e);
      setLookupOrders([]);
    } finally {
      setLoadingLookupOrders(false);
    }
  }, [lookupPatientId, walletAddress]);

  useEffect(() => {
    fetchLookupOrders();
  }, [fetchLookupOrders]);

  useEffect(() => {
    if (!patientId.trim()) {
      setPatientEpisodes([]);
      setEpisodeId("");
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingEpisodes(true);
      try {
        const res = await listEpisodesByPatient({ patientWallet: patientId.trim() });
        if (cancelled) return;
        if (res.success && res.data) {
          setPatientEpisodes(res.data.episodes.filter((ep) => ep.active));
        } else {
          setPatientEpisodes([]);
        }
      } catch {
        if (!cancelled) setPatientEpisodes([]);
      } finally {
        if (!cancelled) setLoadingEpisodes(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [patientId]);

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

      {tab === "create" && !result && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <UserSelect
              value={patientId}
              onChange={setPatientId}
              label={t("patientLabel")}
              placeholder={t("patientPlaceholder")}
              filterRole="patient"
              excludeWallet={walletAddress ?? undefined}
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
            <select
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none disabled:opacity-50"
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              disabled={!patientId.trim() || loadingEpisodes || patientEpisodes.length === 0}
            >
              <option value="">{t("episodePlaceholder")}</option>
              {patientEpisodes.map((ep) => (
                <option key={ep.episodeId} value={ep.episodeId}>
                  {ep.episodeType} — {ep.classification} ({new Date(ep.openedAt * 1000).toLocaleDateString()})
                </option>
              ))}
            </select>
            {!patientId.trim() && (
              <p className="mt-1 text-[11px] text-slate-400">{t("patientRequiredDesc")}</p>
            )}
            {patientId.trim() && loadingEpisodes && (
              <p className="mt-1 text-[11px] text-slate-400">{t("episodeLoading")}</p>
            )}
            {patientId.trim() && !loadingEpisodes && patientEpisodes.length === 0 && (
              <p className="mt-1 text-[11px] text-slate-400">{t("episodeEmpty")}</p>
            )}
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={loading || !patientId.trim() || !episodeId.trim()}
            onClick={handleCreate}
            type="button"
          >
            {loading ? t("creating") : t("createButton")}
          </button>
        </div>
      )}

      {tab === "create" && result && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">{t("createSuccess")}</p>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div>
              <span className="font-medium">{t("orderIdLabel")}:</span>{" "}
              <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">{result.orderId}</code>
            </div>
            {episodeId.trim() && (
              <div>
                <span className="font-medium">{t("episodeLabel")}:</span>{" "}
                <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">{episodeId.trim()}</code>
              </div>
            )}
            <div>
              <span className="font-medium">TX:</span>{" "}
              <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">{result.txHash}</code>
            </div>
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all"
            onClick={handleReset}
            type="button"
          >
            {t("createAnother")}
          </button>
        </div>
      )}

      {tab === "lookup" && (
        <div className="space-y-4">
          {/* Auto-list */}
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{t("myOrders")}</h2>
            <div className="mb-4">
              <UserSelect
                value={lookupPatientId}
                onChange={(val) => {
                  setLookupPatientId(val);
                  setSelectedOrder(null);
                }}
                label={t("filterByPatient")}
                placeholder={t("filterByPatientPlaceholder")}
                filterRole="patient"
                excludeWallet={walletAddress ?? undefined}
              />
            </div>
            {loadingLookupOrders ? (
              <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
            ) : lookupOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {lookupOrders.map((o) => (
                  <button
                    key={o.orderId}
                    className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                      selectedOrder?.orderId === o.orderId
                        ? "neu-pressed border-l-4 border-l-sky-500"
                        : "neu-surface hover:neu-pressed"
                    }`}
                    onClick={() => {
                      setSelectedOrder(o);
                      setOrder(null);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{o.examType || t("orderCardTitle")}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        o.status === 0 ? "bg-amber-100 text-amber-700" :
                        o.status === 1 ? "bg-sky-100 text-sky-700" :
                        o.status === 2 ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {o.status === 0 ? t("statusPending") : o.status === 1 ? t("statusAssigned") : o.status === 2 ? t("statusCompleted") : t("statusCancelled")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>{t("patient")}: <span className="font-mono">{o.patient.slice(0, 8)}…{o.patient.slice(-4)}</span></span>
                      <span>{t("createdAt")}: {new Date(o.createdAt * 1000).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedOrder && !order && (
              <div className="mt-4 neu-inset rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{selectedOrder.examType}</p>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100"
                    onClick={() => setSelectedOrder(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500">{t("patient")}: {selectedOrder.patient.slice(0, 8)}…{selectedOrder.patient.slice(-4)}</p>
                <p className="text-xs text-slate-500">{t("doctor")}: {selectedOrder.doctor.slice(0, 8)}…{selectedOrder.doctor.slice(-4)}</p>
                <p className="text-xs text-slate-500">{t("status")}: {selectedOrder.status === 0 ? t("statusPending") : selectedOrder.status === 1 ? t("statusAssigned") : selectedOrder.status === 2 ? t("statusCompleted") : t("statusCancelled")}</p>
              </div>
            )}
          </div>

          {/* Manual lookup */}
          <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">{t("manualLookup")}</h2>
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
        </div>
      )}
    </main>
  );
}
