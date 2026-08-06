"use client";

import { Baby } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AuditReport, ObstetricReport } from "@/services/fhir-rag/schema";

interface ObstetricReviewPanelProps {
  report: ObstetricReport;
  audit: AuditReport;
  filledFields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function ObstetricReviewPanel({
  report,
  audit,
  filledFields,
  onChange,
  onGenerate,
  generating,
}: ObstetricReviewPanelProps) {
  const t = useTranslations("obstetricReview");

  function setField(key: string, value: string) {
    onChange({ ...filledFields, [key]: value });
  }

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-sky-50 text-sky-600">
          <Baby className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          {t("reviewTitle")}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="gestationalAgeWeeks"
            className="text-xs font-semibold text-slate-600"
          >
            {t("gestationalAgeWeeks")}
          </label>
          <input
            id="gestationalAgeWeeks"
            type="number"
            value={
              filledFields.gestationalAgeWeeks ??
              report.gestationalAgeWeeks ??
              ""
            }
            onChange={(e) => setField("gestationalAgeWeeks", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="gestationalAgeDays"
            className="text-xs font-semibold text-slate-600"
          >
            {t("gestationalAgeDays")}
          </label>
          <input
            id="gestationalAgeDays"
            type="number"
            value={
              filledFields.gestationalAgeDays ?? report.gestationalAgeDays ?? ""
            }
            onChange={(e) => setField("gestationalAgeDays", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="amnioticFluidIndex"
            className="text-xs font-semibold text-slate-600"
          >
            {t("amnioticFluidIndex")}
          </label>
          <input
            id="amnioticFluidIndex"
            type="text"
            value={
              filledFields.amnioticFluidIndex ?? report.amnioticFluidIndex ?? ""
            }
            onChange={(e) => setField("amnioticFluidIndex", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="placenta"
            className="text-xs font-semibold text-slate-600"
          >
            {t("placenta")}
          </label>
          <input
            id="placenta"
            type="text"
            value={filledFields.placenta ?? report.placenta ?? ""}
            onChange={(e) => setField("placenta", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="observations"
          className="text-xs font-semibold text-slate-600"
        >
          {t("observations")}
        </label>
        <textarea
          id="observations"
          value={filledFields.observations ?? report.observations ?? ""}
          onChange={(e) => setField("observations", e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent min-h-[80px]"
        />
      </div>

      {audit.warnings.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">{t("auditWarnings")}</p>
          <ul className="list-disc pl-4 space-y-1">
            {audit.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">
          {t("measurements")}
        </h4>
        {report.measurements.map((measurement, index) => (
          <div
            key={`${measurement.name}-${index}`}
            className="neu-inset rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="space-y-1 sm:col-span-1">
              <label
                htmlFor={`measurement-${index}-name`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("measurementName")}
              </label>
              <input
                id={`measurement-${index}-name`}
                type="text"
                value={measurement.name}
                readOnly
                className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent opacity-70"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`measurement-${index}-value`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("value")}
              </label>
              <input
                id={`measurement-${index}-value`}
                type="text"
                value={
                  filledFields[`${index}.value`] ?? measurement.value ?? ""
                }
                onChange={(e) => setField(`${index}.value`, e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`measurement-${index}-unit`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("unit")}
              </label>
              <input
                id={`measurement-${index}-unit`}
                type="text"
                value={filledFields[`${index}.unit`] ?? measurement.unit ?? ""}
                onChange={(e) => setField(`${index}.unit`, e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`measurement-${index}-loinc`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("loincCode")}
              </label>
              <input
                id={`measurement-${index}-loinc`}
                type="text"
                value={
                  filledFields[`${index}.loincCode`] ??
                  measurement.loincCode ??
                  ""
                }
                onChange={(e) => setField(`${index}.loincCode`, e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={generating}
        onClick={onGenerate}
        className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {generating ? t("generating") : t("generateButton")}
      </button>
    </div>
  );
}
