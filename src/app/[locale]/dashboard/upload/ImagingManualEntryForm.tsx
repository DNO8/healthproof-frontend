"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ImagingMeasurement } from "@/services/fhir-rag/schema";

export interface ImagingManualEntry {
  patientName: string;
  patientRut: string;
  patientBirthDate: string;
  issuerName: string;
  issuedDate: string;
  studyType: string;
  indication: string;
  technique: string;
  findings: string;
  impression: string;
  measurements: ImagingMeasurement[];
}

interface ImagingManualEntryFormProps {
  value: ImagingManualEntry;
  onChange: (value: ImagingManualEntry) => void;
  onProceed: () => void;
  disabled?: boolean;
}

const LATERALITY_OPTIONS = [
  "left",
  "right",
  "bilateral",
  "unspecified",
] as const;

type LocalMeasurement = ImagingMeasurement & { clientId: string };

function newMeasurement(): LocalMeasurement {
  return {
    clientId: crypto.randomUUID(),
    name: "",
    value: null,
    unit: null,
    laterality: "unspecified",
    region: null,
    bodySiteSnomed: null,
    loincCode: null,
    confidence: 1,
  };
}

export function ImagingManualEntryForm({
  value,
  onChange,
  onProceed,
  disabled,
}: ImagingManualEntryFormProps) {
  const t = useTranslations("uploadModal");
  const ti = useTranslations("imagingReview");
  const [localMeasurements, setLocalMeasurements] = useState<
    LocalMeasurement[]
  >(
    value.measurements.length > 0
      ? value.measurements.map((m) => ({ ...m, clientId: crypto.randomUUID() }))
      : [newMeasurement()],
  );

  function updateMeasurement(
    index: number,
    field: keyof ImagingMeasurement | "clientId",
    raw: string,
  ) {
    const next = localMeasurements.map((m, i) => {
      if (i !== index) return m;
      if (field === "clientId") return m;
      if (
        field === "value" ||
        field === "unit" ||
        field === "region" ||
        field === "loincCode"
      ) {
        const trimmed = raw.trim() || null;
        return { ...m, [field]: trimmed };
      }
      if (field === "laterality") {
        return { ...m, laterality: raw as ImagingMeasurement["laterality"] };
      }
      return { ...m, [field]: raw };
    });
    setLocalMeasurements(next);
    onChange({ ...value, measurements: next });
  }

  function addMeasurement() {
    const next = [...localMeasurements, newMeasurement()];
    setLocalMeasurements(next);
    onChange({ ...value, measurements: next });
  }

  function removeMeasurement(index: number) {
    const next = localMeasurements.filter((_, i) => i !== index);
    const fallback = next.length > 0 ? next : [newMeasurement()];
    setLocalMeasurements(fallback);
    onChange({ ...value, measurements: fallback });
  }

  function updateHeader(field: keyof ImagingManualEntry, raw: string) {
    onChange({ ...value, [field]: raw });
  }

  const validMeasurements = localMeasurements.filter((m) => m.name.trim());
  const canProceed = validMeasurements.length > 0;

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {ti("reviewTitle")}
      </h3>
      <p className="text-sm text-slate-600">{t("manualEntryDesc")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("manualPatientName")}
          </span>
          <input
            type="text"
            value={value.patientName}
            onChange={(e) => updateHeader("patientName", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("manualPatientRut")}
          </span>
          <input
            type="text"
            value={value.patientRut}
            onChange={(e) => updateHeader("patientRut", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("manualPatientBirthDate")}
          </span>
          <input
            type="date"
            value={value.patientBirthDate}
            onChange={(e) => updateHeader("patientBirthDate", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("manualIssuedDate")}
          </span>
          <input
            type="date"
            value={value.issuedDate}
            onChange={(e) => updateHeader("issuedDate", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-slate-700">
            {t("manualIssuerName")}
          </span>
          <input
            type="text"
            value={value.issuerName}
            onChange={(e) => updateHeader("issuerName", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {ti("studyType")}
          </span>
          <input
            type="text"
            value={value.studyType}
            onChange={(e) => updateHeader("studyType", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {ti("indication")}
          </span>
          <input
            type="text"
            value={value.indication}
            onChange={(e) => updateHeader("indication", e.target.value)}
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-700">
          {ti("technique")}
        </span>
        <textarea
          value={value.technique}
          onChange={(e) => updateHeader("technique", e.target.value)}
          className="neu-pressed w-full rounded-lg px-3 py-2 text-sm min-h-[60px]"
          disabled={disabled}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-700">
          {ti("findings")}
        </span>
        <textarea
          value={value.findings}
          onChange={(e) => updateHeader("findings", e.target.value)}
          className="neu-pressed w-full rounded-lg px-3 py-2 text-sm min-h-[80px]"
          disabled={disabled}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-slate-700">
          {ti("impression")}
        </span>
        <textarea
          value={value.impression}
          onChange={(e) => updateHeader("impression", e.target.value)}
          className="neu-pressed w-full rounded-lg px-3 py-2 text-sm min-h-[80px]"
          disabled={disabled}
        />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">
          {ti("measurements")}
        </p>
        {localMeasurements.map((measurement, index) => (
          <div
            key={measurement.clientId}
            className="neu-inset rounded-lg p-3 space-y-2"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder={ti("measurementName")}
                value={measurement.name}
                onChange={(e) =>
                  updateMeasurement(index, "name", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={ti("value")}
                value={measurement.value ?? ""}
                onChange={(e) =>
                  updateMeasurement(index, "value", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={ti("unit")}
                value={measurement.unit ?? ""}
                onChange={(e) =>
                  updateMeasurement(index, "unit", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={ti("region")}
                value={measurement.region ?? ""}
                onChange={(e) =>
                  updateMeasurement(index, "region", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={ti("loincCode")}
                value={measurement.loincCode ?? ""}
                onChange={(e) =>
                  updateMeasurement(index, "loincCode", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <select
                value={measurement.laterality ?? "unspecified"}
                onChange={(e) =>
                  updateMeasurement(index, "laterality", e.target.value)
                }
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              >
                {LATERALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {ti(`laterality_${option}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeMeasurement(index)}
                disabled={disabled}
                className="text-xs text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                {t("manualRemoveExam")}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addMeasurement}
          disabled={disabled}
          className="neu-surface hover:neu-pressed w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          {t("manualAddExam")}
        </button>
      </div>

      <button
        type="button"
        disabled={disabled || !canProceed}
        onClick={onProceed}
        className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {disabled ? t("processing") : t("manualProceed")}
      </button>
    </div>
  );
}
