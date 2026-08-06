"use client";

import { useTranslations } from "next-intl";
import type { PreventIaResult } from "@/services/prevent-ia/types";

/**
 * Los textos generados por el agente (`patientRecommendation`, explicaciones
 * de seguimiento) vienen siempre en español desde `services/prevent-ia/agent.ts`
 * — traducirlos dinámicamente al vuelo queda fuera de alcance de este MVP.
 */
export function PatientPanel({ result }: { result: PreventIaResult }) {
  const t = useTranslations("dashboard.preventIa");

  return (
    <div className="neu-surface p-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
        {t("patientPanelTitle")}
      </h3>
      <p className="text-base leading-relaxed text-slate-700">
        {result.patientRecommendation}
      </p>

      {result.followUp.suggested && (
        <div className="neu-inset mt-4 px-4 py-3 text-sm text-amber-700">
          <span className="font-semibold">{t("followUpSuggested")}:</span>{" "}
          {t("followUpRepeatIn", { when: result.followUp.when ?? "" })} —{" "}
          {result.followUp.reason}.
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">{t("clinicalDisclaimer")}</p>
    </div>
  );
}
