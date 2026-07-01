"use client";

import { useWallets } from "@privy-io/react-auth";
import { Copy, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import {
  createWalletClient,
  custom,
  keccak256,
  stringToHex,
  toHex,
} from "viem";
import {
  closeEpisodeOnChain,
  getEpisodeOnChain,
  openEpisodeOnChain,
} from "@/actions/clinical-episodes/clinical-episodes-onchain";
import { listEpisodesByDoctor } from "@/actions/clinical-episodes/list-episodes-by-doctor";
import { UserSelect } from "@/components/forms/UserSelect";
import { EmptyState, SkeletonList } from "@/components/ui";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { isVerifiedDoctor } from "@/lib/auth/permissions";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { signGatewayMetaTx } from "@/lib/metatx/forwarder";
import { truncateAddress } from "@/lib/utils";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const EPISODE_TYPES = [
  "CONSULTATION",
  "EMERGENCY",
  "SURGERY",
  "FOLLOW_UP",
  "DIAGNOSTIC",
  "OTHER",
] as const;

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

export default function EpisodesPage() {
  const t = useTranslations("dashboard.episodes");
  const walletAddress = useWalletAddress();
  const { wallets } = useWallets();
  const [tab, setTab] = useState<"open" | "lookup" | "close">("open");
  const [patientId, setPatientId] = useState("");
  const [episodeType, setEpisodeType] = useState<string>(EPISODE_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    episodeId: string;
    txHash: string;
  } | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [episode, setEpisode] = useState<OnChainEpisode | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [episodes, setEpisodes] = useState<OnChainEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<OnChainEpisode | null>(
    null,
  );

  async function handleOpen() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({
        title: t("patientRequiredTitle"),
        description: t("patientRequiredDesc"),
      });
      return;
    }

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({
        title: t("openError"),
        description: "No active wallet found",
      });
      return;
    }

    setLoading(true);
    console.log(
      "[handleOpen] Starting open episode for patient:",
      trimmed,
      "type:",
      episodeType,
    );
    try {
      const viemWallet = await getViemWalletClient(activeWallet);
      const doctorAddress = (await viemWallet.getAddresses())[0];
      if (!doctorAddress) throw new Error("No wallet address");
      console.log("[handleOpen] Doctor address:", doctorAddress);

      const verifiedDoctor = await isVerifiedDoctor(doctorAddress);
      if (!verifiedDoctor) {
        console.error(
          "[handleOpen] Wallet is not a verified doctor:",
          doctorAddress,
        );
        sileo.error({
          title: t("openError"),
          description: "The connected wallet is not a verified doctor",
        });
        setLoading(false);
        return;
      }

      const episodeId = keccak256(
        toHex(`${trimmed}-${episodeType}-${Date.now()}`),
      );
      const episodeTypeBytes = stringToHex(episodeType, { size: 32 });
      console.log("[handleOpen] Generated episodeId:", episodeId);

      const request = await signGatewayMetaTx(
        viemWallet,
        "createEpisode",
        [
          episodeId,
          trimmed,
          ZERO_ADDRESS,
          episodeTypeBytes,
          ZERO_BYTES32,
          doctorAddress,
        ],
        HealthProofGatewayAbi,
      );
      console.log(
        "[handleOpen] Meta-tx signed. request.to:",
        request.to,
        "request.from:",
        request.from,
      );

      const res = await openEpisodeOnChain({
        request,
        patientWallet: trimmed,
        episodeType,
        episodeId,
      });
      console.log("[handleOpen] Server action result:", res);
      if (!res.success) {
        sileo.error({
          title: t("openError"),
          description: (res.error ?? "").slice(0, 120),
        });
      } else {
        setResult({ episodeId, txHash: res.data.txHash });
        sileo.success({
          title: t("openSuccess"),
          description: `TX: ${res.data.txHash.slice(0, 16)}…`,
        });
        await fetchEpisodes();
      }
    } catch (e) {
      console.error("[handleOpen] Error:", e);
      sileo.error({
        title: t("openError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }

  const fetchEpisodes = useCallback(async () => {
    if (!walletAddress) return;
    console.log("[fetchEpisodes] Loading episodes for wallet:", walletAddress);
    setLoadingEpisodes(true);
    try {
      const res = await listEpisodesByDoctor({ doctorWallet: walletAddress });
      console.log("[fetchEpisodes] Server response:", res);
      if (res.success && res.data) {
        setEpisodes(res.data.episodes);
      } else if (!res.success) {
        console.error("[fetchEpisodes] Server action failed:", res.error);
      }
    } catch (e) {
      console.error("[fetchEpisodes] Exception:", e);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  useEffect(() => {
    if (tab === "lookup") {
      fetchEpisodes();
    }
  }, [tab, fetchEpisodes]);

  async function handleLookup() {
    if (!lookupId.trim()) return;
    console.log("[handleLookup] Looking up episodeId:", lookupId.trim());
    setLookupLoading(true);
    setEpisode(null);
    try {
      const res = await getEpisodeOnChain({ episodeId: lookupId.trim() });
      console.log("[handleLookup] Server response:", res);
      if (res.success) {
        setEpisode(res.data);
        if (!res.data) {
          sileo.error({ title: t("notFound"), description: t("notFoundDesc") });
        }
      } else {
        sileo.error({
          title: t("lookupError"),
          description: (res.error ?? "").slice(0, 120),
        });
      }
    } catch (e) {
      console.error("[handleLookup] Exception:", e);
      sileo.error({
        title: t("lookupError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLookupLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setPatientId("");
  }

  async function handleClose() {
    const id = lookupId.trim();
    if (!id) return;

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({
        title: t("closeError"),
        description: "No active wallet found",
      });
      return;
    }

    setLoading(true);
    console.log("[handleClose] Closing episode:", id);
    try {
      const viemWallet = await getViemWalletClient(activeWallet);
      const doctorAddress = (await viemWallet.getAddresses())[0];
      if (!doctorAddress) throw new Error("No wallet address");

      // Pre-validate: fetch episode on-chain before sending meta-tx
      const episodeIdBytes =
        id.startsWith("0x") && id.length === 66
          ? (id as `0x${string}`)
          : keccak256(toHex(id));

      const lookupRes = await getEpisodeOnChain({ episodeId: id });
      console.log("[handleClose] Pre-validation lookup:", lookupRes);

      if (!lookupRes.success || !lookupRes.data) {
        sileo.error({ title: t("closeError"), description: t("notFound") });
        setLoading(false);
        return;
      }

      const ep = lookupRes.data;
      if (!ep.active) {
        sileo.error({
          title: t("closeError"),
          description: t("alreadyClosed"),
        });
        setLoading(false);
        return;
      }

      if (ep.openedBy.toLowerCase() !== doctorAddress.toLowerCase()) {
        sileo.error({
          title: t("closeError"),
          description: t("notOwner", {
            openedBy: truncateAddress(ep.openedBy),
          }),
        });
        setLoading(false);
        return;
      }

      const request = await signGatewayMetaTx(
        viemWallet,
        "closeEpisodeViaGateway",
        [episodeIdBytes, doctorAddress],
        HealthProofGatewayAbi,
      );
      console.log("[handleClose] Meta-tx signed. request.to:", request.to);

      const res = await closeEpisodeOnChain({ request, episodeId: id });
      console.log("[handleClose] Server response:", res);
      if (!res.success) {
        sileo.error({
          title: t("closeError"),
          description: (res.error ?? "").slice(0, 120),
        });
      } else {
        sileo.success({
          title: t("closeSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setLookupId("");
        setEpisode(null);
      }
    } catch (e) {
      console.error("[handleClose] Exception:", e);
      sileo.error({
        title: t("closeError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          {(["open", "lookup", "close"] as const).map((tKey) => (
            <button
              key={tKey}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === tKey
                  ? "neu-pressed text-slate-800"
                  : "neu-surface text-slate-500"
              }`}
              onClick={() => setTab(tKey)}
              type="button"
            >
              {t(`tab${tKey.charAt(0).toUpperCase() + tKey.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "open" && !result && (
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
            <span className="mb-1.5 block text-xs font-medium text-slate-700">
              {t("typeLabel")}
            </span>
            <select
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              value={episodeType}
              onChange={(e) => setEpisodeType(e.target.value)}
            >
              {EPISODE_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={loading || !patientId.trim()}
            onClick={handleOpen}
            type="button"
          >
            {loading ? t("opening") : t("openButton")}
          </button>
        </div>
      )}

      {tab === "open" && result && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">{t("openSuccess")}</p>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t("episodeIdLabel")}:</span>{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono">
                {truncateAddress(result.episodeId)}
              </code>
              <button
                className="text-slate-400 hover:text-sky-600 transition"
                onClick={() => navigator.clipboard.writeText(result.episodeId)}
                type="button"
                title={t("copy")}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">TX:</span>{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono">
                {truncateAddress(result.txHash)}
              </code>
              <button
                className="text-slate-400 hover:text-sky-600 transition"
                onClick={() => navigator.clipboard.writeText(result.txHash)}
                type="button"
                title={t("copy")}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
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
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              {t("myEpisodes")}
            </h2>
            {loadingEpisodes ? (
              <SkeletonList count={3} />
            ) : episodes.length === 0 ? (
              <EmptyState icon={FolderOpen} title={t("empty")} />
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {episodes.map((ep) => (
                  <button
                    key={ep.episodeId}
                    className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                      selectedEpisode?.episodeId === ep.episodeId
                        ? "neu-pressed border-l-4 border-l-sky-500"
                        : "neu-surface hover:neu-pressed"
                    }`}
                    onClick={() => {
                      setSelectedEpisode(ep);
                      setEpisode(null);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {ep.episodeType || t("episodeCardTitle")}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          ep.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ep.active ? t("active") : t("inactive")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>
                        {t("patient")}:{" "}
                        {ep.patientName ||
                          `${ep.patient.slice(0, 8)}…${ep.patient.slice(-4)}`}
                      </span>
                      <span>
                        {t("doctor")}:{" "}
                        {ep.openedByName ||
                          `${ep.openedBy.slice(0, 8)}…${ep.openedBy.slice(-4)}`}
                      </span>
                      <span>
                        {t("createdAt")}:{" "}
                        {new Date(ep.openedAt * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedEpisode && !episode && (
              <div className="mt-4 neu-inset rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    {t("episodeDetails")}
                  </p>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100"
                    onClick={() => setSelectedEpisode(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <DetailRow
                  label={t("episodeId")}
                  value={selectedEpisode.episodeId}
                />
                <DetailRow
                  label={t("patient")}
                  value={
                    selectedEpisode.patientName ||
                    `${selectedEpisode.patient.slice(0, 8)}…${selectedEpisode.patient.slice(-4)}`
                  }
                />
                <DetailRow
                  label={t("doctor")}
                  value={
                    selectedEpisode.openedByName ||
                    `${selectedEpisode.openedBy.slice(0, 8)}…${selectedEpisode.openedBy.slice(-4)}`
                  }
                />
                <DetailRow
                  label={t("type")}
                  value={selectedEpisode.episodeType}
                />
                <DetailRow
                  label={t("active")}
                  value={selectedEpisode.active ? t("yes") : t("no")}
                />
                <DetailRow
                  label={t("createdAt")}
                  value={new Date(
                    selectedEpisode.openedAt * 1000,
                  ).toLocaleString()}
                />
                {selectedEpisode.active && (
                  <button
                    className="mt-2 w-full rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-all hover:bg-red-100"
                    onClick={async () => {
                      setLookupLoading(true);
                      try {
                        const activeWallet = wallets.find((w) => w.address);
                        if (!activeWallet) {
                          sileo.error({
                            title: t("closeError"),
                            description: "No active wallet found",
                          });
                          return;
                        }
                        const viemWallet =
                          await getViemWalletClient(activeWallet);
                        const doctorAddress = (
                          await viemWallet.getAddresses()
                        )[0];
                        if (!doctorAddress)
                          throw new Error("No wallet address");

                        const episodeIdBytes =
                          selectedEpisode.episodeId.startsWith("0x") &&
                          selectedEpisode.episodeId.length === 66
                            ? (selectedEpisode.episodeId as `0x${string}`)
                            : keccak256(toHex(selectedEpisode.episodeId));

                        const request = await signGatewayMetaTx(
                          viemWallet,
                          "closeEpisodeViaGateway",
                          [episodeIdBytes, doctorAddress],
                          HealthProofGatewayAbi,
                        );

                        const res = await closeEpisodeOnChain({
                          request,
                          episodeId: selectedEpisode.episodeId,
                        });
                        if (!res.success) {
                          sileo.error({
                            title: t("closeError"),
                            description: (res.error ?? "").slice(0, 120),
                          });
                        } else {
                          sileo.success({
                            title: t("closeSuccess"),
                            description: `TX: ${res.data.txHash.slice(0, 16)}…`,
                          });
                          const updatedRes = await getEpisodeOnChain({
                            episodeId: selectedEpisode.episodeId,
                          });
                          const updated = updatedRes.success
                            ? updatedRes.data
                            : null;
                          setSelectedEpisode(updated);
                          await fetchEpisodes();
                        }
                      } finally {
                        setLookupLoading(false);
                      }
                    }}
                    type="button"
                  >
                    {lookupLoading ? t("closing") : t("closeButton")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Manual lookup */}
          <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">
              {t("manualLookup")}
            </h2>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                {t("episodeIdLabel")}
              </span>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                placeholder={t("episodeIdPlaceholder")}
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
              {lookupLoading ? t("lookingUp") : t("lookupButton")}
            </button>

            {episode && (
              <div className="neu-inset rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {t("episodeDetails")}
                </p>
                <DetailRow label={t("episodeId")} value={episode.episodeId} />
                <DetailRow
                  label={t("patient")}
                  value={`${episode.patient.slice(0, 8)}…${episode.patient.slice(-4)}`}
                />
                <DetailRow
                  label={t("doctor")}
                  value={`${episode.openedBy.slice(0, 8)}…${episode.openedBy.slice(-4)}`}
                />
                <DetailRow label={t("type")} value={episode.episodeType} />
                <DetailRow
                  label={t("active")}
                  value={episode.active ? t("yes") : t("no")}
                />
                <DetailRow
                  label={t("createdAt")}
                  value={new Date(episode.openedAt * 1000).toLocaleString()}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "close" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700">
              {t("episodeIdLabel")}
            </span>
            <input
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              placeholder={t("episodeIdPlaceholder")}
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-all disabled:opacity-50"
            disabled={loading || !lookupId.trim()}
            onClick={handleClose}
            type="button"
          >
            {loading ? t("closing") : t("closeButton")}
          </button>
        </div>
      )}
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
      <span className="text-xs font-medium text-slate-500 shrink-0 w-24">
        {label}
      </span>
      <span className="text-sm text-slate-800 break-all font-mono">
        {value}
      </span>
    </div>
  );
}
