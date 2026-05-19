"use client";

import { useState, useEffect, useCallback } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import {
  openEpisodeOnChain,
  closeEpisodeOnChain,
  getEpisodeOnChain,
} from "@/actions/clinical-episodes-onchain";
import { listEpisodesByDoctor } from "@/actions/list-episodes-by-doctor";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { UserSelect } from "@/components/forms/UserSelect";

const EPISODE_TYPES = [
  "CONSULTATION", "EMERGENCY", "SURGERY", "FOLLOW_UP", "DIAGNOSTIC", "OTHER",
] as const;

export default function EpisodesPage() {
  const t = useTranslations("dashboard.episodes");
  const walletAddress = useWalletAddress();
  const [tab, setTab] = useState<"open" | "lookup" | "close">("open");
  const [patientId, setPatientId] = useState("");
  const [episodeType, setEpisodeType] = useState<string>(EPISODE_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ episodeId: string; txHash: string } | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [episode, setEpisode] = useState<OnChainEpisode | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [episodes, setEpisodes] = useState<OnChainEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<OnChainEpisode | null>(null);

  async function handleOpen() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({ title: t("patientRequiredTitle"), description: t("patientRequiredDesc") });
      return;
    }
    setLoading(true);
    try {
      const res = await openEpisodeOnChain({
        patientWallet: trimmed,
        episodeType,
      });
      if (!res.success) {
        sileo.error({ title: t("openError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        setResult({ episodeId: res.data.episodeId, txHash: res.data.txHash });
        sileo.success({
          title: t("openSuccess"),
          description: `TX: ${res.data.txHash.slice(0, 16)}…`,
        });
      }
    } catch (e) {
      sileo.error({ title: t("openError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  const fetchEpisodes = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingEpisodes(true);
    try {
      const res = await listEpisodesByDoctor({ doctorWallet: walletAddress });
      if (res.success && res.data) {
        setEpisodes(res.data.episodes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setEpisode(null);
    try {
      const res = await getEpisodeOnChain({ episodeId: lookupId.trim() });
      if (res.success) {
        setEpisode(res.data);
        if (!res.data) {
          sileo.error({ title: t("notFound"), description: t("notFoundDesc") });
        }
      } else {
        sileo.error({ title: t("lookupError"), description: (res.error ?? "").slice(0, 120) });
      }
    } catch (e) {
      sileo.error({ title: t("lookupError"), description: String(e).slice(0, 120) });
    } finally {
      setLookupLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setPatientId("");
  }

  async function handleClose() {
    if (!lookupId.trim()) return;
    setLoading(true);
    try {
      const res = await closeEpisodeOnChain({ episodeId: lookupId.trim() });
      if (!res.success) {
        sileo.error({ title: t("closeError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({
          title: t("closeSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setLookupId("");
        setEpisode(null);
      }
    } catch (e) {
      sileo.error({ title: t("closeError"), description: String(e).slice(0, 120) });
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
                tab === tKey ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"
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
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("typeLabel")}</label>
            <select
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              value={episodeType}
              onChange={(e) => setEpisodeType(e.target.value)}
            >
              {EPISODE_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
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
            <div>
              <span className="font-medium">{t("episodeIdLabel")}:</span>{" "}
              <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">{result.episodeId}</code>
            </div>
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
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{t("myEpisodes")}</h2>
            {loadingEpisodes ? (
              <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
            ) : episodes.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
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
                      <p className="text-sm font-semibold text-slate-800">{ep.episodeType || t("episodeCardTitle")}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        ep.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {ep.active ? t("active") : t("inactive")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>{t("patient")}: <span className="font-mono">{ep.patient.slice(0, 8)}…{ep.patient.slice(-4)}</span></span>
                      <span>{t("createdAt")}: {new Date(ep.openedAt * 1000).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedEpisode && !episode && (
              <div className="mt-4 neu-inset rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800">{t("episodeDetails")}</p>
                <DetailRow label={t("episodeId")} value={selectedEpisode.episodeId} />
                <DetailRow label={t("patient")} value={`${selectedEpisode.patient.slice(0, 8)}…${selectedEpisode.patient.slice(-4)}`} />
                <DetailRow label={t("doctor")} value={`${selectedEpisode.openedBy.slice(0, 8)}…${selectedEpisode.openedBy.slice(-4)}`} />
                <DetailRow label={t("type")} value={selectedEpisode.episodeType} />
                <DetailRow label={t("active")} value={selectedEpisode.active ? t("yes") : t("no")} />
                <DetailRow label={t("createdAt")} value={new Date(selectedEpisode.openedAt * 1000).toLocaleString()} />
                {selectedEpisode.active && (
                  <button
                    className="mt-2 w-full rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-all hover:bg-red-100"
                    onClick={async () => {
                      setLookupLoading(true);
                      try {
                        const res = await closeEpisodeOnChain({ episodeId: selectedEpisode.episodeId });
                        if (!res.success) {
                          sileo.error({ title: t("closeError"), description: (res.error ?? "").slice(0, 120) });
                        } else {
                          sileo.success({ title: t("closeSuccess"), description: `TX: ${res.data.txHash.slice(0, 16)}…` });
                          const updatedRes = await getEpisodeOnChain({ episodeId: selectedEpisode.episodeId });
                          const updated = updatedRes.success ? updatedRes.data : null;
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
            <h2 className="text-sm font-semibold text-slate-700">{t("manualLookup")}</h2>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("episodeIdLabel")}</label>
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
                <p className="text-sm font-semibold text-slate-800">{t("episodeDetails")}</p>
                <DetailRow label={t("episodeId")} value={episode.episodeId} />
                <DetailRow label={t("patient")} value={`${episode.patient.slice(0, 8)}…${episode.patient.slice(-4)}`} />
                <DetailRow label={t("doctor")} value={`${episode.openedBy.slice(0, 8)}…${episode.openedBy.slice(-4)}`} />
                <DetailRow label={t("type")} value={episode.episodeType} />
                <DetailRow label={t("active")} value={episode.active ? t("yes") : t("no")} />
                <DetailRow label={t("createdAt")} value={new Date(episode.openedAt * 1000).toLocaleString()} />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "close" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("episodeIdLabel")}</label>
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
      <span className="text-xs font-medium text-slate-500 shrink-0 w-24">{label}</span>
      <span className="text-sm text-slate-800 break-all font-mono">{value}</span>
    </div>
  );
}
