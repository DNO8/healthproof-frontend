"use client";

import { useTranslations } from "next-intl";
import type {
  AuditReport,
  ExtractedDoc,
  LabFilledFields,
} from "@/services/fhir-rag/schema";

interface FhirReviewPanelProps {
  doc: ExtractedDoc;
  audit: AuditReport;
  labFilledFields: LabFilledFields;
  onChange: (fields: LabFilledFields) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function FhirReviewPanel({
  doc,
  audit,
  labFilledFields,
  onChange,
  onGenerate,
  generating,
}: FhirReviewPanelProps) {
  const t = useTranslations("fhirReview");
  const remaining =
    (audit.missing?.length ?? 0) + (audit.warnings?.length ?? 0);

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          {t("reviewTitle")}
        </h3>
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
          {t("missingCount", { count: remaining })}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {doc.exams.map((exam, index) => (
          <div
            key={`${index}-${exam.rawName}`}
            className="neu-inset rounded-lg p-3 text-sm"
          >
            <p className="font-semibold text-slate-700">{exam.rawName}</p>
            <p className="text-slate-500">
              {exam.value} {exam.unit ?? ""}
            </p>
            {audit.mappings.find((m) => m.rawName === exam.rawName) && (
              <p className="text-xs text-slate-400 mt-1">
                LOINC:{" "}
                {audit.mappings.find((m) => m.rawName === exam.rawName)
                  ?.loincCode ?? t("unconfirmed")}{" "}
                —{" "}
                {audit.mappings.find((m) => m.rawName === exam.rawName)
                  ?.display ?? exam.rawName}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          {t("completeFields")}
        </p>
        {audit.missing?.map((item) => {
          const fieldId = `${item.examIndex}-${item.field}`;
          return (
            <div key={fieldId} className="flex gap-2 items-center">
              <label
                htmlFor={`missing-field-${fieldId}`}
                className="text-xs text-slate-600 min-w-[120px]"
              >
                {item.examIndex + 1}.{item.field}
              </label>
              <input
                id={`missing-field-${fieldId}`}
                type="text"
                value={labFilledFields[`${item.examIndex}.${item.field}`] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...labFilledFields,
                    [`${item.examIndex}.${item.field}`]: e.target.value,
                  })
                }
                placeholder={item.reason}
                className="neu-pressed flex-1 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={generating}
        onClick={onGenerate}
        className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {generating ? t("generating") : t("generateFhir")}
      </button>
    </div>
  );
}
