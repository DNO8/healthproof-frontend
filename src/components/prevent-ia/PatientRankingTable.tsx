"use client";

import { useTranslations } from "next-intl";
import type { RankedPatient } from "@/services/prevent-ia/patients";
import { RISK_BADGE_CLASS, RISK_DOT_CLASS } from "./risk-styles";

interface PatientRankingTableProps {
  patients: RankedPatient[];
  loading: boolean;
}

export function PatientRankingTable({
  patients,
  loading,
}: PatientRankingTableProps) {
  const t = useTranslations("dashboard.preventIa.ranking");
  const followUpCount = patients.filter(
    (p) => p.result.followUp.suggested,
  ).length;

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t("summary", { count: patients.length, followUp: followUpCount })}
        </p>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {t("loading")}
        </p>
      ) : patients.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {patients.map((p) => (
            <div key={p.patientId} className="neu-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold ${RISK_BADGE_CLASS[p.result.riskLevel]}`}
                  >
                    {p.result.healthScore}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{p.nombre}</div>
                    <div className="text-xs text-slate-400">
                      {t("patientMeta", {
                        edad: p.edad,
                        sexo: p.sexo,
                        comuna: p.comuna,
                      })}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${RISK_BADGE_CLASS[p.result.riskLevel]}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${RISK_DOT_CLASS[p.result.riskLevel]}`}
                  />
                  {t(`risk.${p.result.riskLevel}`)}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                <span className="text-slate-400">
                  {t("patientNotification")}:{" "}
                </span>
                {p.result.patientRecommendation}
              </p>

              {p.result.followUp.suggested && (
                <p className="mt-1 text-xs text-amber-600">
                  {t("followUpIn", { when: p.result.followUp.when ?? "" })} —{" "}
                  {p.result.followUp.reason}.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
