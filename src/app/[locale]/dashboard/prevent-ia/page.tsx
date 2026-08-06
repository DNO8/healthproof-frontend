"use client";

import { HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ScenarioKey } from "@/actions/prevent-ia/analyze-document";
import { ClinicalSummaryPanel } from "@/components/prevent-ia/ClinicalSummaryPanel";
import { DemoDataBanner } from "@/components/prevent-ia/DemoDataBanner";
import { LongitudinalComparisonChart } from "@/components/prevent-ia/LongitudinalComparisonChart";
import { PatientPanel } from "@/components/prevent-ia/PatientPanel";
import { PatientRankingTable } from "@/components/prevent-ia/PatientRankingTable";
import { ScenarioSwitcher } from "@/components/prevent-ia/ScenarioSwitcher";
import { ScoreGauge } from "@/components/prevent-ia/ScoreGauge";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useOnChainRole } from "@/hooks/healthcare-networks/useOnChainRole";
import { usePatientRanking } from "@/hooks/prevent-ia/usePatientRanking";
import { usePreventIaAnalysis } from "@/hooks/prevent-ia/usePreventIaAnalysis";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";
const RANKING_ROLES = new Set(["doctor", "certifier"]);

export default function PreventIaPage() {
  const t = useTranslations("dashboard.preventIa");
  const walletAddress = useWalletAddress();
  const { role, loading: roleLoading } = useOnChainRole(walletAddress);
  const [scenario, setScenario] = useState<ScenarioKey>(DEFAULT_SCENARIO);
  const { data, loading, error } = usePreventIaAnalysis(scenario);

  const canSeeRanking = Boolean(role && RANKING_ROLES.has(role));
  const { patients, loading: rankingLoading } =
    usePatientRanking(canSeeRanking);

  if (roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="neu-shell border border-white/70 p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-sky-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
              Prevent IA
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              {t("title")}
            </h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">{t("subtitle")}</p>

        <div className="mt-6">
          <DemoDataBanner />
        </div>
      </div>

      {/* Mi análisis — disponible para todos los roles */}
      <section className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">
          {t("myAnalysisTitle")}
        </h2>

        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <ScenarioSwitcher
            active={scenario}
            loading={loading}
            onSelect={setScenario}
          />

          {error ? (
            <p className="mt-8 py-8 text-center text-sm text-red-600">
              {error}
            </p>
          ) : loading || !data ? (
            <p className="mt-8 py-8 text-center text-sm text-slate-400">
              {t("loading")}
            </p>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="flex justify-center">
                <ScoreGauge
                  score={data.result.healthScore}
                  riskLevel={data.result.riskLevel}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PatientPanel result={data.result} />
                <ClinicalSummaryPanel
                  result={data.result}
                  current={data.current}
                  history={data.history}
                />
                <div className="sm:col-span-2">
                  <LongitudinalComparisonChart points={data.scoreTimeline} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ranking de pacientes — solo doctor/certifier */}
      {canSeeRanking && (
        <section className="mt-8">
          <PatientRankingTable patients={patients} loading={rankingLoading} />
        </section>
      )}
    </main>
  );
}
