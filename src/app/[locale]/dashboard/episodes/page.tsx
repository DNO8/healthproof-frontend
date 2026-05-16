"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import {
  openEpisodeOnChain,
  closeEpisodeOnChain,
  getEpisodeOnChain,
} from "@/actions/clinical-episodes-onchain";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { useWalletAddress } from "@/hooks/useWalletAddress";

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
  const [lookupId, setLookupId] = useState("");
  const [episode, setEpisode] = useState<OnChainEpisode | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

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
        sileo.success({
          title: t("openSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setPatientId("");
      }
    } catch (e) {
      sileo.error({ title: t("openError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

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

      {tab === "open" && (
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

      {tab === "lookup" && (
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
