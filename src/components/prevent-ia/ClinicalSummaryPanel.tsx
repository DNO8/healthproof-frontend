"use client";

import { useTranslations } from "next-intl";
import type {
  ClinicalResult,
  PatientHistoryEntry,
  PreventIaResult,
} from "@/services/prevent-ia/types";

interface ClinicalSummaryPanelProps {
  result: PreventIaResult;
  current: ClinicalResult;
  history: PatientHistoryEntry[];
}

export function ClinicalSummaryPanel({
  result,
  current,
  history,
}: ClinicalSummaryPanelProps) {
  const t = useTranslations("dashboard.preventIa");

  return (
    <div className="neu-surface p-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-600">
        {t("clinicalSummaryTitle")}
      </h3>
      <p className="text-sm leading-relaxed text-slate-600">
        {result.clinicalSummary}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="neu-inset p-3">
          <div className="text-xs text-slate-400">{t("exam")}</div>
          <div className="font-medium text-slate-800">{current.examType}</div>
          <div className="text-xs text-slate-400">
            LOINC {current.loincCode}
          </div>
        </div>
        <div className="neu-inset p-3">
          <div className="text-xs text-slate-400">{t("currentValue")}</div>
          <div className="font-medium text-slate-800">
            {current.value} {current.unit}
          </div>
          <div className="text-xs text-slate-400">
            {t("referenceRange")}: {current.referenceRange}
          </div>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("patientHistory")}
          </div>
          <ul className="space-y-1 text-sm text-slate-600">
            {history.map((h) => (
              <li key={h.date} className="flex justify-between">
                <span className="text-slate-400">{h.date}</span>
                <span>
                  {h.value} {h.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-xs text-amber-600">{t("historyMissing")}</p>
      )}
    </div>
  );
}
