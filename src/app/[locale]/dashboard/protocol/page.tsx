"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { sileo } from "sileo";
import {
  isProtocolPaused,
  pauseProtocol,
  resumeProtocol,
} from "@/actions/admin/admin-onchain";

export default function ProtocolPage() {
  const t = useTranslations("dashboard.protocol");
  const [paused, setPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isProtocolPaused()
      .then(setPaused)
      .catch(() => setPaused(false));
  }, []);

  async function handlePause() {
    setLoading(true);
    try {
      const res = await pauseProtocol({});
      if (!res.success)
        sileo.error({
          title: t("pauseError"),
          description: (res.error ?? "").slice(0, 120),
        });
      else {
        sileo.success({
          title: t("pauseSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setPaused(true);
      }
    } catch (e) {
      sileo.error({
        title: t("pauseError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    try {
      const res = await resumeProtocol({});
      if (!res.success)
        sileo.error({
          title: t("resumeError"),
          description: (res.error ?? "").slice(0, 120),
        });
      else {
        sileo.success({
          title: t("resumeSuccess"),
          description: `TX: ${res.data?.txHash?.slice(0, 16)}…`,
        });
        setPaused(false);
      }
    } catch (e) {
      sileo.error({
        title: t("resumeError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t("statusLabel")}
            </p>
            <p className="text-xs text-slate-500">{t("statusDesc")}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${paused === true ? "bg-red-50 text-red-700" : paused === false ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
          >
            {paused === true
              ? t("paused")
              : paused === false
                ? t("active")
                : t("loading")}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 neu-surface hover:neu-pressed rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-all disabled:opacity-50"
            disabled={loading || paused === true || paused === null}
            onClick={handlePause}
            type="button"
          >
            {loading ? t("processing") : t("pauseButton")}
          </button>
          <button
            className="flex-1 neu-surface hover:neu-pressed rounded-xl px-4 py-3 text-sm font-semibold text-green-600 transition-all disabled:opacity-50"
            disabled={loading || paused === false || paused === null}
            onClick={handleResume}
            type="button"
          >
            {loading ? t("processing") : t("resumeButton")}
          </button>
        </div>
      </div>
    </main>
  );
}
