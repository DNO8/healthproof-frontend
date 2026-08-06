"use client";

<<<<<<< HEAD
import { HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
=======
import { usePrivy } from "@privy-io/react-auth";
import { HeartPulse, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
>>>>>>> feature/prevent-ia-integration
import type { ScenarioKey } from "@/actions/prevent-ia/analyze-document";
import { ClinicalSummaryPanel } from "@/components/prevent-ia/ClinicalSummaryPanel";
import { DemoDataBanner } from "@/components/prevent-ia/DemoDataBanner";
import { LongitudinalComparisonChart } from "@/components/prevent-ia/LongitudinalComparisonChart";
import { PatientPanel } from "@/components/prevent-ia/PatientPanel";
import { PatientRankingTable } from "@/components/prevent-ia/PatientRankingTable";
import { ScenarioSwitcher } from "@/components/prevent-ia/ScenarioSwitcher";
import { ScoreGauge } from "@/components/prevent-ia/ScoreGauge";
<<<<<<< HEAD
=======
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useDbUser } from "@/hooks/auth/useDbUser";
>>>>>>> feature/prevent-ia-integration
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useOnChainRole } from "@/hooks/healthcare-networks/useOnChainRole";
import { usePatientRanking } from "@/hooks/prevent-ia/usePatientRanking";
import { usePreventIaAnalysis } from "@/hooks/prevent-ia/usePreventIaAnalysis";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";
const RANKING_ROLES = new Set(["doctor", "certifier"]);
<<<<<<< HEAD

export default function PreventIaPage() {
  const t = useTranslations("dashboard.preventIa");
=======
/** Tiempo mínimo del paso "calculando" — aunque el mock ya haya resuelto,
 * la pausa evita que el Estado Preventivo aparezca de forma instantánea/falsa. */
const MIN_CALCULATING_MS = 1800;
const SHARE_TARGETS = ["cesfam", "hospital", "clinica", "medico"] as const;
type ShareTarget = (typeof SHARE_TARGETS)[number];

/**
 * Prevent IA no es un dashboard: es un agente que conversa con el paciente
 * resultado por resultado. Esta máquina de pasos reordena la MISMA data y los
 * MISMOS componentes ya implementados (ScoreGauge, PatientPanel,
 * ClinicalSummaryPanel, LongitudinalComparisonChart, ScenarioSwitcher,
 * PatientRankingTable) detrás de una narrativa conversacional, sin tocar su
 * lógica interna ni crear nuevos módulos.
 */
type Step =
  | "greeting"
  | "analyzing"
  | "consentAge"
  | "questionSmoking"
  | "questionFamilyDiabetes"
  | "calculating"
  | "result"
  | "recommendations"
  | "shareConsent"
  | "shareSelect"
  | "shareConfirmed";

function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first || null;
}

/** Avatar + burbuja de texto del agente — el mismo "cuerpo" en cada paso de la conversación. */
function AgentBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100">
        <HeartPulse className="h-5 w-5 text-sky-600" />
      </div>
      <div className="neu-surface flex-1 rounded-3xl rounded-tl-md px-5 py-4 text-base leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}

function AgentActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-3 pl-14">
      {children}
    </div>
  );
}

export default function PreventIaPage() {
  const t = useTranslations("dashboard.preventIa");
  const ta = useTranslations("dashboard.preventIa.agent");
  const { user } = usePrivy();
  const { dbUser } = useDbUser();
>>>>>>> feature/prevent-ia-integration
  const walletAddress = useWalletAddress();
  const { role, loading: roleLoading } = useOnChainRole(walletAddress);
  const [scenario, setScenario] = useState<ScenarioKey>(DEFAULT_SCENARIO);
  const { data, loading, error } = usePreventIaAnalysis(scenario);

  const canSeeRanking = Boolean(role && RANKING_ROLES.has(role));
  const { patients, loading: rankingLoading } =
    usePatientRanking(canSeeRanking);

<<<<<<< HEAD
=======
  const [step, setStep] = useState<Step>("greeting");
  const [analyzingRevealed, setAnalyzingRevealed] = useState(false);
  const [showClinicalDetail, setShowClinicalDetail] = useState(false);
  const [shareDecision, setShareDecision] = useState<
    "accepted" | "declined" | null
  >(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [calcStartedAt, setCalcStartedAt] = useState<number | null>(null);

  const name = firstName(dbUser?.full_name ?? user?.google?.name ?? null);

  // Simula el "despertar" del agente antes de mostrar el mensaje completo.
  useEffect(() => {
    if (step !== "analyzing") return;
    setAnalyzingRevealed(false);
    const timer = setTimeout(() => setAnalyzingRevealed(true), 900);
    return () => clearTimeout(timer);
  }, [step]);

  // Registra cuándo entramos a "calculando" para respetar el mínimo de la animación.
  useEffect(() => {
    if (step === "calculating") {
      setCalcStartedAt(Date.now());
    } else {
      setCalcStartedAt(null);
    }
  }, [step]);

  // Avanza al resultado apenas el análisis esté listo Y haya pasado el mínimo narrativo.
  useEffect(() => {
    if (step !== "calculating" || calcStartedAt === null || loading) return;
    const elapsed = Date.now() - calcStartedAt;
    const remaining = Math.max(MIN_CALCULATING_MS - elapsed, 0);
    const timer = setTimeout(() => setStep("result"), remaining);
    return () => clearTimeout(timer);
  }, [step, calcStartedAt, loading]);

  function restart() {
    setStep("greeting");
    setShowClinicalDetail(false);
    setShareDecision(null);
    setShareTarget(null);
  }

>>>>>>> feature/prevent-ia-integration
  if (roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  return (
<<<<<<< HEAD
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
=======
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-600">
          Prevent IA
        </span>
      </div>
      <div className="mb-6">
        <DemoDataBanner />
      </div>

      <ScrollReveal key={step} y={16} duration={0.45}>
        {step === "greeting" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>
              <p className="font-semibold text-slate-800">
                {name ? ta("greetingNamed", { name }) : ta("greetingGeneric")}
              </p>
              <p className="mt-2">{ta("greetingBody")}</p>
            </AgentBubble>

            <div className="mt-6 pl-14">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {ta("demoLabel")}
              </p>
              <ScenarioSwitcher
                active={scenario}
                loading={loading}
                onSelect={setScenario}
              />
            </div>

            <AgentActions>
              <Button onClick={() => setStep("analyzing")}>
                {ta("startButton")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "analyzing" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>
              <p className="font-semibold text-slate-800">
                {name ? ta("analyzingNamed", { name }) : ta("analyzingGeneric")}
              </p>
              {!analyzingRevealed ? (
                <p className="mt-2 flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {ta("wakingUp")}
                </p>
              ) : (
                <p className="mt-2">{ta("analyzingBody")}</p>
              )}
            </AgentBubble>
            {analyzingRevealed && (
              <AgentActions>
                <Button onClick={() => setStep("consentAge")}>
                  {ta("continueButton")}
                </Button>
              </AgentActions>
            )}
          </div>
        )}

        {step === "consentAge" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("consentAgeQuestion")}</AgentBubble>
            <AgentActions>
              <Button
                variant="secondary"
                onClick={() => setStep("questionSmoking")}
              >
                {ta("cancel")}
              </Button>
              <Button onClick={() => setStep("questionSmoking")}>
                {ta("accept")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "questionSmoking" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("smokingQuestion")}</AgentBubble>
            <AgentActions>
              <Button
                variant="secondary"
                onClick={() => setStep("questionFamilyDiabetes")}
              >
                {ta("no")}
              </Button>
              <Button onClick={() => setStep("questionFamilyDiabetes")}>
                {ta("yes")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "questionFamilyDiabetes" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("familyDiabetesQuestion")}</AgentBubble>
            <AgentActions>
              <Button
                variant="secondary"
                onClick={() => setStep("calculating")}
              >
                {ta("no")}
              </Button>
              <Button onClick={() => setStep("calculating")}>
                {ta("yes")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "calculating" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>
              <p>{ta("thanksMessage")}</p>
              <p className="mt-2 flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ta("calculatingMessage")}
              </p>
            </AgentBubble>
          </div>
        )}

        {step === "result" &&
          (data ? (
            <div className="neu-shell border border-white/70 p-6 sm:p-8">
              <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-600">
                {ta("resultTitle")}
              </p>
              <div className="mt-4 flex justify-center">
>>>>>>> feature/prevent-ia-integration
                <ScoreGauge
                  score={data.result.healthScore}
                  riskLevel={data.result.riskLevel}
                />
              </div>
<<<<<<< HEAD
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
=======
              <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-slate-400">
                {ta("resultBrand")}
              </p>
              <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-slate-700">
                {ta(`resultNarrative.${data.result.riskLevel}`)}
              </p>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-xs font-medium text-sky-600 underline-offset-2 hover:underline"
                  onClick={() => setShowClinicalDetail((v) => !v)}
                >
                  {showClinicalDetail
                    ? ta("hideClinicalDetail")
                    : ta("viewClinicalDetail")}
                </button>
              </div>

              {showClinicalDetail && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ClinicalSummaryPanel
                    result={data.result}
                    current={data.current}
                    history={data.history}
                  />
                  <div className="sm:col-span-2">
                    <LongitudinalComparisonChart points={data.scoreTimeline} />
                  </div>
                </div>
              )}

              <AgentActions>
                <Button onClick={() => setStep("recommendations")}>
                  {ta("continueButton")}
                </Button>
              </AgentActions>
            </div>
          ) : (
            <div className="neu-shell border border-white/70 p-6 sm:p-8">
              <AgentBubble>{error ?? t("loading")}</AgentBubble>
              <AgentActions>
                <Button variant="secondary" onClick={restart}>
                  {ta("restart")}
                </Button>
              </AgentActions>
            </div>
          ))}

        {step === "recommendations" && data && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("recommendationsTitle")}</AgentBubble>
            <div className="mt-4 pl-14">
              <PatientPanel result={data.result} />
            </div>
            <AgentActions>
              <Button onClick={() => setStep("shareConsent")}>
                {ta("continueButton")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "shareConsent" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("shareQuestion")}</AgentBubble>
            <AgentActions>
              <Button
                variant="secondary"
                onClick={() => {
                  setShareDecision("declined");
                  setStep("shareConfirmed");
                }}
              >
                {ta("shareNo")}
              </Button>
              <Button
                onClick={() => {
                  setShareDecision("accepted");
                  setStep("shareSelect");
                }}
              >
                {ta("shareYes")}
              </Button>
            </AgentActions>
          </div>
        )}

        {step === "shareSelect" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>{ta("shareSelectTitle")}</AgentBubble>
            <div className="mt-5 flex flex-wrap gap-3 pl-14">
              {SHARE_TARGETS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setShareTarget(option);
                    setStep("shareConfirmed");
                  }}
                  className="neu-chip rounded-2xl px-5 py-3 font-medium text-slate-800 transition-all hover:neu-pressed"
                >
                  {ta(`shareOptions.${option}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "shareConfirmed" && (
          <div className="neu-shell border border-white/70 p-6 sm:p-8">
            <AgentBubble>
              {shareDecision === "accepted" && shareTarget
                ? ta("shareConfirmed", {
                    target: ta(`shareOptions.${shareTarget}`),
                  })
                : ta("shareDeclined")}
            </AgentBubble>
            <AgentActions>
              <Button variant="secondary" onClick={restart}>
                {ta("restart")}
              </Button>
            </AgentActions>
          </div>
        )}
      </ScrollReveal>

      {canSeeRanking && (
        <section className="mt-10">
          <p className="mb-4 text-sm text-slate-500">{ta("rankingIntro")}</p>
>>>>>>> feature/prevent-ia-integration
          <PatientRankingTable patients={patients} loading={rankingLoading} />
        </section>
      )}
    </main>
  );
}
