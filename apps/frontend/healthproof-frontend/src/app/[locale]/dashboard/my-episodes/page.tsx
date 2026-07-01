"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { listEpisodesByPatient } from "@/actions/clinical-episodes/list-episodes-by-patient";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { truncateAddress } from "@/lib/utils";

export default function MyEpisodesPage() {
  const t = useTranslations("dashboard.myEpisodesPage");
  const walletAddress = useWalletAddress();
  const [episodes, setEpisodes] = useState<OnChainEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    listEpisodesByPatient({ patientWallet: walletAddress })
      .then((result) => {
        if (result.success) {
          setEpisodes(result.data.episodes);
        }
      })
      .catch((e) => {
        sileo.error({
          title: t("loadError"),
          description: String(e).slice(0, 120),
        });
      })
      .finally(() => setLoading(false));
  }, [walletAddress, t]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>
      <div className="neu-shell border border-white/70 p-6 sm:p-8">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {t("loading")}
          </p>
        ) : episodes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => (
              <div
                key={ep.episodeId}
                className="neu-inset rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {ep.episodeType || t("unknownType")}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("doctor")}:{" "}
                    {ep.openedByName || truncateAddress(ep.openedBy)}
                    {" · "}
                    {t("institution")}:{" "}
                    {ep.institutionName || truncateAddress(ep.institution)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(ep.openedAt * 1000).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge variant={ep.active ? "active" : "closed"}>
                  {ep.active ? t("active") : t("closed")}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
