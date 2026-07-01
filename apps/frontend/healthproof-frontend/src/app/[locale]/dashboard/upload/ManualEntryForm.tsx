"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ManualExamRow, ManualHeader } from "@/services/fhir-rag/schema";

interface ManualEntryFormProps {
  header: ManualHeader;
  exams: ManualExamRow[];
  onHeaderChange: (header: ManualHeader) => void;
  onExamsChange: (exams: ManualExamRow[]) => void;
  onProceed: () => void;
  disabled?: boolean;
}

function newExam(): ManualExamRow {
  return {
    id: crypto.randomUUID(),
    rawName: "",
    value: "",
    unit: "",
    refRange: "",
    method: "",
  };
}

export function ManualEntryForm({
  header,
  exams,
  onHeaderChange,
  onExamsChange,
  onProceed,
  disabled,
}: ManualEntryFormProps) {
  const t = useTranslations("uploadModal");
  const [localExams, setLocalExams] = useState<ManualExamRow[]>(
    exams.length > 0 ? exams : [newExam()],
  );

  function updateExam(
    index: number,
    field: keyof ManualExamRow,
    value: string,
  ) {
    const next = localExams.map((exam, i) =>
      i === index ? { ...exam, [field]: value } : exam,
    );
    setLocalExams(next);
    onExamsChange(next);
  }

  function addExam() {
    const next = [...localExams, newExam()];
    setLocalExams(next);
    onExamsChange(next);
  }

  function removeExam(index: number) {
    const next = localExams.filter((_, i) => i !== index);
    setLocalExams(next.length > 0 ? next : [newExam()]);
    onExamsChange(next.length > 0 ? next : [newExam()]);
  }

  const validExams = localExams.filter(
    (e) => e.rawName.trim() && e.value.trim(),
  );
  const canProceed = validExams.length > 0;

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {t("manualEntryTitle")}
      </h3>
      <p className="text-sm text-slate-600">{t("manualEntryDesc")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("manualPatientName")}
          </span>
          <input
            type="text"
            value={header.patientName ?? ""}
            onChange={(e) =>
              onHeaderChange({ ...header, patientName: e.target.value })
            }
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
            value={header.patientRut ?? ""}
            onChange={(e) =>
              onHeaderChange({ ...header, patientRut: e.target.value })
            }
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
            value={header.patientBirthDate ?? ""}
            onChange={(e) =>
              onHeaderChange({ ...header, patientBirthDate: e.target.value })
            }
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
            value={header.issuedDate ?? ""}
            onChange={(e) =>
              onHeaderChange({ ...header, issuedDate: e.target.value })
            }
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
            value={header.issuerName ?? ""}
            onChange={(e) =>
              onHeaderChange({ ...header, issuerName: e.target.value })
            }
            className="neu-pressed w-full rounded-lg px-3 py-2 text-sm"
            disabled={disabled}
          />
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">
          {t("completeFields")}
        </p>
        {localExams.map((exam, index) => (
          <div
            key={exam.id ?? `manual-exam-${index}`}
            className="neu-inset rounded-lg p-3 space-y-2"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder={t("manualExamName")}
                value={exam.rawName}
                onChange={(e) => updateExam(index, "rawName", e.target.value)}
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs sm:col-span-2"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={t("manualExamValue")}
                value={exam.value}
                onChange={(e) => updateExam(index, "value", e.target.value)}
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={t("manualExamUnit")}
                value={exam.unit}
                onChange={(e) => updateExam(index, "unit", e.target.value)}
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={t("manualExamRefRange")}
                value={exam.refRange}
                onChange={(e) => updateExam(index, "refRange", e.target.value)}
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder={t("manualExamMethod")}
                value={exam.method}
                onChange={(e) => updateExam(index, "method", e.target.value)}
                className="neu-pressed rounded-lg px-3 py-1.5 text-xs"
                disabled={disabled}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeExam(index)}
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
          onClick={addExam}
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
