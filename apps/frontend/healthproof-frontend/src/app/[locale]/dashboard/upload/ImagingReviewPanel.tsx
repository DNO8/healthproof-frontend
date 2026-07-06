"use client";

import { Scan, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { searchLoincCodes } from "@/actions/fhir/search-loinc";
import type {
  AuditReport,
  AuditSuggestions,
  ImagingReport,
} from "@/services/fhir-rag/schema";
import { mapRegionToBodySite } from "@/services/fhir-rag/snomed-body-site";
import type { LoincEntry } from "@/services/loinc/types";

interface ImagingReviewPanelProps {
  report: ImagingReport;
  audit: AuditReport;
  suggestions: AuditSuggestions | null;
  sessionId: string;
  filledFields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  onGenerate: () => void;
  generating: boolean;
}

const LATERALITY_OPTIONS = [
  "left",
  "right",
  "bilateral",
  "unspecified",
] as const;

export function ImagingReviewPanel({
  report,
  audit,
  suggestions,
  sessionId,
  filledFields,
  onChange,
  onGenerate,
  generating,
}: ImagingReviewPanelProps) {
  const t = useTranslations("imagingReview");
  const [loincResults, setLoincResults] = useState<
    Record<number, LoincEntry[]>
  >({});
  const [loincSearching, setLoincSearching] = useState<Record<number, boolean>>(
    {},
  );
  const loincApiFailed = Object.keys(suggestions ?? {}).some((key) =>
    key.endsWith(".apiFailed"),
  );

  function setField(key: string, value: string) {
    onChange({ ...filledFields, [key]: value });
  }

  async function searchLoincForMeasurement(index: number, query: string) {
    if (!query.trim()) return;
    setLoincSearching(
      (prev) => ({ ...prev, [index]: true }) as Record<number, boolean>,
    );
    try {
      const response = await searchLoincCodes({ query, sessionId });
      if ("results" in response) {
        setLoincResults(
          (prev) =>
            ({ ...prev, [index]: response.results }) as Record<
              number,
              LoincEntry[]
            >,
        );
      }
    } finally {
      setLoincSearching(
        (prev) => ({ ...prev, [index]: false }) as Record<number, boolean>,
      );
    }
  }

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-sky-50 text-sky-600">
          <Scan className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          {t("reviewTitle")}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="studyType"
            className="text-xs font-semibold text-slate-600"
          >
            {t("studyType")}
          </label>
          <input
            id="studyType"
            type="text"
            value={filledFields.studyType ?? report.studyType ?? ""}
            onChange={(e) => setField("studyType", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="indication"
            className="text-xs font-semibold text-slate-600"
          >
            {t("indication")}
          </label>
          <input
            id="indication"
            type="text"
            value={filledFields.indication ?? report.indication ?? ""}
            onChange={(e) => setField("indication", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="technique"
          className="text-xs font-semibold text-slate-600"
        >
          {t("technique")}
        </label>
        <textarea
          id="technique"
          value={filledFields.technique ?? report.technique ?? ""}
          onChange={(e) => setField("technique", e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="findings"
          className="text-xs font-semibold text-slate-600"
        >
          {t("findings")}
        </label>
        <textarea
          id="findings"
          value={filledFields.findings ?? report.findings ?? ""}
          onChange={(e) => setField("findings", e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent min-h-[80px]"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="impression"
          className="text-xs font-semibold text-slate-600"
        >
          {t("impression")}
        </label>
        <textarea
          id="impression"
          value={filledFields.impression ?? report.impression ?? ""}
          onChange={(e) => setField("impression", e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent min-h-[80px]"
        />
      </div>

      {loincApiFailed && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">{t("loincApiFailedTitle")}</p>
          <p>{t("loincApiFailedDesc")}</p>
        </div>
      )}

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
            className="neu-inset rounded-xl p-3 grid grid-cols-1 sm:grid-cols-6 gap-3"
          >
            <div className="space-y-1 sm:col-span-2">
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
                htmlFor={`measurement-${index}-laterality`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("laterality")}
              </label>
              <select
                id={`measurement-${index}-laterality`}
                value={
                  filledFields[`${index}.laterality`] ??
                  measurement.laterality ??
                  "unspecified"
                }
                onChange={(e) =>
                  setField(`${index}.laterality`, e.target.value)
                }
                className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
              >
                {LATERALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`laterality_${option}`)}
                  </option>
                ))}
              </select>
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
                htmlFor={`measurement-${index}-region`}
                className="text-xs font-semibold text-slate-600"
              >
                {t("region")}
              </label>
              <input
                id={`measurement-${index}-region`}
                type="text"
                value={
                  filledFields[`${index}.region`] ?? measurement.region ?? ""
                }
                onChange={(e) => {
                  const region = e.target.value;
                  const bodySite = mapRegionToBodySite(region);
                  onChange({
                    ...filledFields,
                    [`${index}.region`]: region,
                    [`${index}.bodySiteSnomed`]: bodySite?.snomedCode ?? "",
                  });
                }}
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
              <div className="flex gap-2">
                <input
                  id={`measurement-${index}-loinc`}
                  type="text"
                  value={
                    filledFields[`${index}.loincCode`] ??
                    measurement.loincCode ??
                    ""
                  }
                  onChange={(e) =>
                    setField(`${index}.loincCode`, e.target.value)
                  }
                  className="w-full rounded-xl px-3 py-2 text-sm neu-inset bg-transparent"
                />
                <button
                  type="button"
                  disabled={loincSearching[index] || generating}
                  onClick={() =>
                    searchLoincForMeasurement(index, measurement.name)
                  }
                  className="neu-surface hover:neu-pressed rounded-xl px-2 py-2 text-slate-600 disabled:opacity-50"
                  title={t("loincSearch")}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <LoincSuggestions
                options={suggestions?.[measurement.name]?.options}
                searchResults={loincResults[index]}
                selected={
                  filledFields[`${index}.loincCode`] ??
                  measurement.loincCode ??
                  ""
                }
                onSelect={(code: string) =>
                  setField(`${index}.loincCode`, code)
                }
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

interface LoincSuggestionItem {
  code: string;
  display: string;
}

function LoincSuggestions({
  options,
  searchResults,
  selected,
  onSelect,
}: {
  options?: LoincSuggestionItem[];
  searchResults?: LoincSuggestionItem[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const items = [...(options ?? []), ...(searchResults ?? [])].filter(
    (item, index, self) =>
      item.code && self.findIndex((i) => i.code === item.code) === index,
  );
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {items.map((item) => {
        const isSelected = item.code === selected;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => onSelect(item.code)}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${
              isSelected
                ? "bg-sky-100 text-sky-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.code} — {item.display}
          </button>
        );
      })}
    </div>
  );
}
