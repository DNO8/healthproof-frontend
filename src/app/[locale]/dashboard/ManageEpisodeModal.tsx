"use client";

import { useState } from "react";
import { sileo } from "sileo";
import {
  openEpisodeOnChain,
  closeEpisodeOnChain,
  getEpisodeOnChain,
} from "@/actions/clinical-episodes-onchain";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { UserSelect } from "@/components/forms/UserSelect";

type ManageEpisodeModalProps = {
  onClose: () => void;
  doctorId: string;
};

const EPISODE_TYPES = [
  "CONSULTATION",
  "EMERGENCY",
  "SURGERY",
  "FOLLOW_UP",
  "DIAGNOSTIC",
  "OTHER",
] as const;

type Tab = "open" | "lookup";

export function ManageEpisodeModal({
  onClose,
  doctorId,
}: ManageEpisodeModalProps) {
  const [tab, setTab] = useState<Tab>("open");
  const [patientId, setPatientId] = useState("");
  const [episodeType, setEpisodeType] = useState<string>(EPISODE_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    episodeId: string;
    txHash: string;
  } | null>(null);

  // Lookup state
  const [lookupId, setLookupId] = useState("");
  const [episode, setEpisode] = useState<OnChainEpisode | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function handleOpen() {
    const trimmed = patientId.trim();
    if (!trimmed) {
      sileo.error({ title: "Error", description: "Patient wallet is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await openEpisodeOnChain({
        patientWallet: trimmed,
        episodeType,
      });

      if ("error" in res) {
        sileo.error({
          title: "Episode creation failed",
          description: res.error.slice(0, 120),
          duration: 5000,
        });
        return;
      }

      setResult({ episodeId: res.episodeId, txHash: res.txHash });
      sileo.success({
        title: "Episode opened",
        description: `Episode registered on-chain.`,
        duration: 4000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setEpisode(null);
    try {
      const ep = await getEpisodeOnChain(lookupId.trim());
      setEpisode(ep);
      if (!ep) {
        sileo.error({
          title: "Not found",
          description: "Episode not found on-chain",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleClose(episodeId: string) {
    setLookupLoading(true);
    try {
      const res = await closeEpisodeOnChain({ episodeId });
      if ("error" in res) {
        sileo.error({
          title: "Close failed",
          description: res.error.slice(0, 120),
        });
      } else {
        sileo.success({
          title: "Episode closed",
          description: `TX: ${res.txHash.slice(0, 16)}…`,
        });
        const updated = await getEpisodeOnChain(episodeId);
        setEpisode(updated);
      }
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg rounded-3xl border border-white/70 p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Clinical Episodes
          </h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          {(["open", "lookup"] as const).map((t) => (
            <button
              key={t}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === t
                  ? "neu-pressed text-slate-800"
                  : "neu-surface text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab(t)}
              type="button"
            >
              {t === "open" ? "Open Episode" : "Lookup / Close"}
            </button>
          ))}
        </div>

        {/* Open Episode Tab */}
        {tab === "open" && !result && (
          <div className="space-y-4">
            <UserSelect
              value={patientId}
              onChange={setPatientId}
              label="Patient"
              placeholder="Select patient or paste wallet"
              filterRole="patient"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Episode Type
              </label>
              <select
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                value={episodeType}
                onChange={(e) => setEpisodeType(e.target.value)}
              >
                {EPISODE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
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
              {loading ? "Opening on-chain…" : "Open Episode"}
            </button>
          </div>
        )}

        {/* Success state */}
        {tab === "open" && result && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Episode opened successfully</p>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="font-medium">Episode ID:</span>{" "}
                <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                  {result.episodeId}
                </code>
              </div>
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

        {/* Lookup / Close Tab */}
        {tab === "lookup" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Episode ID (bytes32)
              </label>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                placeholder="0x..."
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
              {lookupLoading ? "Fetching…" : "Lookup Episode"}
            </button>

            {episode && (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
                <div>
                  <span className="font-medium">Patient:</span>{" "}
                  <code className="text-[11px]">{episode.patient}</code>
                </div>
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {episode.episodeType || "—"}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span
                    className={
                      episode.active ? "text-green-600" : "text-red-500"
                    }
                  >
                    {episode.active ? "Active" : "Closed"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Opened:</span>{" "}
                  {new Date(episode.openedAt * 1000).toLocaleString()}
                </div>
                {episode.active && (
                  <button
                    className="mt-2 w-full rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                    disabled={lookupLoading}
                    onClick={() => handleClose(lookupId.trim())}
                    type="button"
                  >
                    Close Episode
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
