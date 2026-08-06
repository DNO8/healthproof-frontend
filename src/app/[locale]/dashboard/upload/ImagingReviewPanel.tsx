"use client";

import { Scan } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { searchLoincCodes } from "@/actions/fhir/search-loinc";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import type {
  AuditReport,
  AuditSuggestions,
  ImagingReport,
} from "@/services/fhir-rag/schema";
import { mapRegionToBodySite } from "@/services/fhir-rag/snomed-body-site";
import type { LoincEntry } from "@/services/loinc/types";
import { LoincSelector } from "./LoincSelector";

interface ImagingReviewPanelProps {
  report: ImagingReport;
  audit: AuditReport;
  suggestions: AuditSuggestions | null;
  sessionId: string;
  filledFields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  onGenerate: () => void;
  generating: boolean;
  withPrivyToken: <T extends Record<string, unknown>>(data: T) => Promise<T & { _privyToken?: string }>;
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
  withPrivyToken,
}: ImagingReviewPanelProps) {
  const t = useTranslations("imagingReview");
  const [loincResults, setLoincResults] = useState<Record<number, LoincEntry[]>>({});

  const loincApiFailed = Object.keys(suggestions ?? {}).some((key) =>
    key.endsWith(".apiFailed"),
  );

  // Auto-search LOINC for each measurement on mount
  useEffect(() => {
    report.measurements.forEach((measurement, index) => {
      const query = measurement.loincCode ?? measurement.name;
      if (!query?.trim()) return;
      withPrivyToken({ query, sessionId }).then((tokenData) =>
        searchLoincCodes(tokenData)
      ).then((response) => {
        if (isAuthSuccess(response)) {
          const res = response.data as { results?: LoincEntry[]; apiFailed?: boolean };
          if (res.results && res.results.length > 0) {
            setLoincResults((prev) => ({ ...prev, [index]: res.results! }));
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.measurements, sessionId]);

  function setField(key: string, value: string) {
    onChange({ ...filledFields, [key]: value });
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

      {/* Study header fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="studyType" className="text-xs font-semibold text-slate-600">
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
          <label htmlFor="indication" className="text-xs font-semibold text-slate-600">
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
        <label htmlFor="technique" className="text-xs font-semibold text-slate-600">
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
        <label htmlFor="findings" className="text-xs font-semibold text-slate-600">
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
        <label htmlFor="impression" className="text-xs font-semibold text-slate-600">
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

      {/* Measurements */}
      {report.measurements.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">{t("measurements")}</h4>
          {report.measurements.map((measurement, index) => {
            const currentLoinc =
              filledFields[`${index}.loincCode`] ?? measurement.loincCode ?? null;

            // Merge suggestions from audit + auto-search results
            const suggestionOptions = suggestions?.[measurement.name]?.options ?? [];
            const searchOptions = loincResults[index] ?? [];
            const allOptions: LoincEntry[] = [
              ...searchOptions,
              ...suggestionOptions
                .filter((s) => !searchOptions.some((r) => r.code === s.code))
                .map((s) => ({
                  code: s.code,
                  display: s.display,
                  spanishDisplay: s.display,
                  aliases: [],
                  component: s.display,
                  system: "http://loinc.org",
                  scale: "Qn",
                })),
            ].filter(
              (item, idx, self) =>
                item.code && self.findIndex((i) => i.code === item.code) === idx,
            );

            return (
              <div
                key={`${measurement.name}-${index}`}
                className="neu-inset rounded-xl p-4 space-y-3"
              >
                {/* Row 1: Measurement name (full width, read-only) */}
                <div className="space-y-1">
                  <label
                    htmlFor={`measurement-${index}-name`}
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {t("measurementName")}
                  </label>
                  <input
                    id={`measurement-${index}-name`}
                    type="text"
                    value={measurement.name}
                    readOnly
                    className="w-full rounded-xl px-3 py-2.5 text-sm neu-surface bg-transparent opacity-70 cursor-default"
                  />
                </div>

                {/* Row 2: Laterality, Value, Unit, Region — equal width */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      onChange={(e) => setField(`${index}.laterality`, e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm neu-inset bg-transparent"
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
                      value={filledFields[`${index}.value`] ?? measurement.value ?? ""}
                      onChange={(e) => setField(`${index}.value`, e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm neu-inset bg-transparent"
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
                      className="w-full rounded-xl px-3 py-2.5 text-sm neu-inset bg-transparent"
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
                      value={filledFields[`${index}.region`] ?? measurement.region ?? ""}
                      onChange={(e) => {
                        const region = e.target.value;
                        const bodySite = mapRegionToBodySite(region);
                        onChange({
                          ...filledFields,
                          [`${index}.region`]: region,
                          [`${index}.bodySiteSnomed`]: bodySite?.snomedCode ?? "",
                        });
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-sm neu-inset bg-transparent"
                    />
                  </div>
                </div>

                {/* Row 3: LOINC selector full width */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    {t("loincCode")}
                  </label>
                  <LoincSelector
                    value={currentLoinc}
                    onChange={(code) => setField(`${index}.loincCode`, code ?? "")}
                    disabled={generating}
                    placeholder={t("loincSearch")}
                    extraOptions={allOptions}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
