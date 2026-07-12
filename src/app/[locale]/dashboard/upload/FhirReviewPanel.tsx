"use client";

import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { searchLoincCodes } from "@/actions/fhir/search-loinc";
import { useDriverTour } from "@/hooks/use-driver-tour";
import {
  ANALYTICAL_METHODS,
  OBSERVATION_INTERPRETATIONS,
  UCUM_UNITS,
} from "@/services/fhir-rag/fhir-options";
import type {
  AuditReport,
  DocumentCategory,
  ExtractedDoc,
  LabFilledFields,
} from "@/services/fhir-rag/schema";
import type { LoincEntry, LoincSearchResult } from "@/services/loinc/types";
import { LoincSelector } from "./LoincSelector";

interface FhirReviewPanelProps {
  doc: ExtractedDoc;
  audit: AuditReport;
  labFilledFields: LabFilledFields;
  onChange: (fields: LabFilledFields) => void;
  onGenerate: () => void;
  generating: boolean;
  documentType?: DocumentCategory;
  sessionId: string;
  withPrivyToken: <T extends Record<string, unknown>>(data: T) => Promise<T & { _privyToken?: string }>;
}

const NA_VALUE = "N/A";

function setField(
  fields: LabFilledFields,
  key: string,
  value: string | undefined | null,
): LabFilledFields {
  const next = { ...fields };
  if (value === undefined || value === null || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

function FieldLabel({
  field,
  children,
}: {
  field: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("fhirReview");
  const helpText = t.has(`fieldHelp.${field}` as "fieldHelp.unit")
    ? t(`fieldHelp.${field}` as "fieldHelp.unit")
    : null;
  return (
    <span className="text-xs text-slate-600 min-w-[140px] flex items-center gap-1">
      {children}
      {helpText && (
        <button
          type="button"
          className="text-slate-400 hover:text-sky-600 transition-colors"
          aria-label={helpText}
          title={helpText}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export function FhirReviewPanel({
  doc,
  audit,
  labFilledFields,
  onChange,
  onGenerate,
  generating,
  documentType,
  sessionId,
  withPrivyToken,
}: FhirReviewPanelProps) {
  void documentType;

  const t = useTranslations("fhirReview");
  const [step, setStep] = useState<"loinc" | "fields">("loinc");
  const [loincResults, setLoincResults] = useState<Record<number, LoincEntry[]>>(
    {},
  );

  // Auto-search LOINC for each exam on mount
  useEffect(() => {
    doc.exams.forEach((exam, index) => {
      const proposed = audit.mappings.find((m) => m.rawName === exam.rawName);
      const query = proposed?.loincCode ?? exam.rawName;
      if (!query?.trim()) return;
      withPrivyToken({ query, sessionId }).then((tokenData) =>
        searchLoincCodes(tokenData)
      ).then((response) => {
        const res = response as LoincSearchResult | { error: string };
        if ("results" in res && res.results.length > 0) {
          setLoincResults((prev) => ({ ...prev, [index]: res.results }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.exams, audit.mappings, sessionId]);

  const naCount =
    audit.missing?.filter(
      (item) => labFilledFields[`${item.examIndex}.${item.field}`] === NA_VALUE,
    ).length ?? 0;
  const remaining =
    (audit.missing?.length ?? 0) + (audit.warnings?.length ?? 0) - naCount;

  const tourSteps = useMemo(
    () => [
      {
        element: "#review-exams-list",
        popover: {
          title: t("tourExamsTitle"),
          description: t("tourExamsDesc"),
          side: "bottom" as const,
        },
      },
      {
        element: "#review-missing-fields",
        popover: {
          title: t("tourMissingTitle"),
          description: t("tourMissingDesc"),
          side: "top" as const,
        },
      },
      {
        element: "#review-generate-button",
        popover: {
          title: t("tourGenerateTitle"),
          description: t("tourGenerateDesc"),
          side: "top" as const,
        },
      },
    ],
    [t],
  );

  const { start } = useDriverTour(tourSteps, { startWhen: false });

  const groupedMissing = useMemo(() => {
    return (
      audit.missing?.reduce<Record<number, typeof audit.missing>>(
        (acc, item) => {
          if (!acc[item.examIndex]) acc[item.examIndex] = [];
          acc[item.examIndex].push(item);
          return acc;
        },
        {},
      ) ?? {}
    );
  }, [audit.missing]);

  const hasMissingFields = audit.missing && audit.missing.length > 0;

  function renderFieldControl(item: {
    examIndex: number;
    field: string;
    reason: string;
  }) {
    const fieldKey = `${item.examIndex}.${item.field}`;
    const isNa = labFilledFields[fieldKey] === NA_VALUE;
    const currentValue = isNa ? "" : (labFilledFields[fieldKey] ?? "");
    const disabled = isNa;

    const baseWrapper =
      "flex flex-col gap-1 sm:flex-row sm:gap-2 sm:items-start";
    const baseSelect =
      "neu-pressed flex-1 rounded-lg px-3 py-2 text-sm text-slate-700 disabled:opacity-50 bg-white";
    const baseInput =
      "neu-pressed flex-1 rounded-lg px-3 py-2 text-sm text-slate-700 disabled:opacity-50";

    switch (item.field) {
      case "unit":
        return (
          <div className={baseWrapper}>
            <FieldLabel field={item.field}>
              {t.has(`fieldLabel.${item.field}` as "fieldLabel.unit")
                ? t(`fieldLabel.${item.field}` as "fieldLabel.unit")
                : item.field}
            </FieldLabel>
            <select
              value={currentValue}
              disabled={disabled}
              onChange={(e) =>
                onChange(setField(labFilledFields, fieldKey, e.target.value))
              }
              className={baseSelect}
            >
              <option value="">{t("selectOption")}</option>
              {UCUM_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <NaCheckbox
              checked={isNa}
              onChange={(v) =>
                onChange(setField(labFilledFields, fieldKey, v ? NA_VALUE : ""))
              }
            />
          </div>
        );
      case "method":
        return (
          <div className={baseWrapper}>
            <FieldLabel field={item.field}>
              {t.has(`fieldLabel.${item.field}` as "fieldLabel.unit")
                ? t(`fieldLabel.${item.field}` as "fieldLabel.unit")
                : item.field}
            </FieldLabel>
            <select
              value={currentValue}
              disabled={disabled}
              onChange={(e) =>
                onChange(setField(labFilledFields, fieldKey, e.target.value))
              }
              className={baseSelect}
            >
              <option value="">{t("selectOption")}</option>
              {ANALYTICAL_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <NaCheckbox
              checked={isNa}
              onChange={(v) =>
                onChange(setField(labFilledFields, fieldKey, v ? NA_VALUE : ""))
              }
            />
          </div>
        );
      case "interpretation":
        return (
          <div className={baseWrapper}>
            <FieldLabel field={item.field}>
              {t.has(`fieldLabel.${item.field}` as "fieldLabel.unit")
                ? t(`fieldLabel.${item.field}` as "fieldLabel.unit")
                : item.field}
            </FieldLabel>
            <select
              value={currentValue}
              disabled={disabled}
              onChange={(e) =>
                onChange(setField(labFilledFields, fieldKey, e.target.value))
              }
              className={baseSelect}
            >
              <option value="">{t("selectOption")}</option>
              {OBSERVATION_INTERPRETATIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
            <NaCheckbox
              checked={isNa}
              onChange={(v) =>
                onChange(setField(labFilledFields, fieldKey, v ? NA_VALUE : ""))
              }
            />
          </div>
        );
      case "referenceRange":
        return (
          <div className={baseWrapper}>
            <FieldLabel field={item.field}>
              {t.has(`fieldLabel.${item.field}` as "fieldLabel.unit")
                ? t(`fieldLabel.${item.field}` as "fieldLabel.unit")
                : item.field}
            </FieldLabel>
            <input
              type="text"
              value={currentValue}
              disabled={disabled}
              onChange={(e) =>
                onChange(setField(labFilledFields, fieldKey, e.target.value))
              }
              placeholder={t("referenceRangePlaceholder")}
              className={baseInput}
            />
            <NaCheckbox
              checked={isNa}
              onChange={(v) =>
                onChange(setField(labFilledFields, fieldKey, v ? NA_VALUE : ""))
              }
            />
          </div>
        );
      default:
        return (
          <div className={baseWrapper}>
            <FieldLabel field={item.field}>
              {t.has(`fieldLabel.${item.field}` as "fieldLabel.unit")
                ? t(`fieldLabel.${item.field}` as "fieldLabel.unit")
                : item.field}
            </FieldLabel>
            <input
              type="text"
              value={isNa ? NA_VALUE : currentValue}
              disabled={disabled}
              onChange={(e) =>
                onChange(setField(labFilledFields, fieldKey, e.target.value))
              }
              placeholder={item.reason}
              className={baseInput}
            />
            <NaCheckbox
              checked={isNa}
              onChange={(v) =>
                onChange(setField(labFilledFields, fieldKey, v ? NA_VALUE : ""))
              }
            />
          </div>
        );
    }
  }

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          {t("reviewTitle")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
            {step === "loinc"
              ? t("stepLoinc")
              : t("stepFields")}
          </span>
          <button
            type="button"
            onClick={start}
            className="text-slate-400 hover:text-sky-600 transition-colors"
            aria-label={t("tourStart")}
            title={t("tourStart")}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 h-1 rounded-full transition-colors ${
            step === "loinc" ? "bg-sky-500" : "bg-sky-200"
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full transition-colors ${
            step === "fields" ? "bg-sky-500" : "bg-sky-200"
          }`}
        />
      </div>

      {/* STEP 1: LOINC Codes */}
      {step === "loinc" && (
        <>
          <div
            id="review-exams-list"
            className="space-y-3 max-h-[60vh] overflow-y-auto"
          >
            {doc.exams.map((exam, index) => {
              const proposed = audit.mappings.find(
                (m) => m.rawName === exam.rawName,
              );
              const loincKey = `${index}.loinc`;
              const confirmedLoinc = labFilledFields[loincKey] ?? null;
              return (
                <div
                  key={`${index}-${exam.rawName}`}
                  className="neu-inset rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-700">
                        {exam.rawName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {exam.value ?? t("noValue")} {exam.unit ?? ""}
                      </p>
                    </div>
                    {proposed && !proposed.confirmed && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
                        {t("unconfirmed")}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-600">
                      {t("loincLabel")}
                    </p>
                    <LoincSelector
                      value={confirmedLoinc}
                      onChange={(code) =>
                        onChange(setField(labFilledFields, loincKey, code))
                      }
                      placeholder={t("loincPlaceholder")}
                      disabled={generating}
                      noMatchesLabel={t("loincNoMatches")}
                      clearLabel={t("loincClear")}
                      extraOptions={loincResults[index] ?? []}
                    />
                    {proposed && !confirmedLoinc && (
                      <p className="text-xs text-slate-400">
                        {t("loincProposed")}:{" "}
                        {proposed.loincCode ?? t("unconfirmed")} —{" "}
                        {proposed.display ?? exam.rawName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStep("fields")}
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2"
          >
            {hasMissingFields
              ? t("continueToFields")
              : t("generateFhir")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* STEP 2: Missing Fields */}
      {step === "fields" && (
        <>
          <div id="review-missing-fields" className="space-y-3 max-h-[60vh] overflow-y-auto">
            {hasMissingFields ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {t("completeFields")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("missingCount", { count: remaining })}
                  </p>
                </div>
                {Object.entries(groupedMissing).map(([examIndex, items]) => {
                  const index = Number(examIndex);
                  const exam = doc.exams[index];
                  return (
                    <div
                      key={examIndex}
                      className="neu-inset rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-700">
                          {exam?.rawName ??
                            t("unknownExam", { index: index + 1 })}
                        </span>
                        <span className="text-slate-500">
                          {exam?.value ?? t("noValue")} {exam?.unit ?? ""}
                        </span>
                      </div>
                      {items.map((item) => (
                        <div key={`${item.examIndex}-${item.field}`}>
                          {renderFieldControl(item)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                {t("noMissingFields")}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("loinc")}
              className="neu-surface hover:neu-pressed rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("backToLoinc")}
            </button>
            <button
              id="review-generate-button"
              type="button"
              disabled={generating}
              onClick={onGenerate}
              className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {generating ? t("generating") : t("generateFhir")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NaCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations("fhirReview");
  return (
    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer select-none min-w-[80px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />
      {t("naLabel")}
    </label>
  );
}
