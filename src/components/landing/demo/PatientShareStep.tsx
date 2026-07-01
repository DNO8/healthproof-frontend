"use client";

import { Check, Eye, FileText, Share2, Shield, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MOCK_CLINICAL_TEXT_EN, MOCK_CLINICAL_TEXT_ES } from "./mock-data";

interface PatientShareStepProps {
  onComplete: () => void;
}

export function PatientShareStep({ onComplete }: PatientShareStepProps) {
  const t = useTranslations("demoFlow");
  const locale = useLocale();
  const plaintext =
    locale === "es" ? MOCK_CLINICAL_TEXT_ES : MOCK_CLINICAL_TEXT_EN;

  const [viewed, setViewed] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (shared) onComplete();
  }, [shared, onComplete]);

  const doctors = [
    { name: "Dr. Pérez", specialty: t("specialtyCardiology") },
    { name: "Dr. Silva", specialty: t("specialtyInternal") },
  ];
  const [selectedDoctor, setSelectedDoctor] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-700">
        <Shield className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t("patientRole")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("patientReceiveDesc")}</p>

      <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-sky-400" />
          <div>
            <p className="text-sm font-medium text-slate-700">{t("examCBC")}</p>
            <p className="text-xs text-slate-400">
              {t("uploadedBy")}: Lab Central · {t("date")}: 2026-05-25
            </p>
          </div>
        </div>
      </div>

      {!viewed ? (
        <button
          type="button"
          onClick={() => setViewed(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-50 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
        >
          <Eye className="h-4 w-4" />
          {t("viewResult")}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Eye className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">
                {t("decryptedResult")}
              </p>
            </div>
            <pre className="mt-2 max-h-40 overflow-auto text-[10px] font-mono leading-relaxed text-emerald-800">
              {plaintext}
            </pre>
          </div>

          {!shared ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("shareWith")}
              </p>
              {doctors.map((d, i) => (
                <button
                  key={d.name}
                  onClick={() => setSelectedDoctor(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    selectedDoctor === i
                      ? "border-sky-300 bg-sky-50 shadow-(--hp-shadow-raised)"
                      : "border-(--hp-border) bg-(--hp-layer) hover:bg-white"
                  }`}
                  type="button"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {d.name}
                    </p>
                    <p className="text-xs text-slate-400">{d.specialty}</p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShared(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white shadow-(--hp-shadow-raised) transition hover:bg-slate-700"
              >
                <Share2 className="h-4 w-4" />
                {t("shareAction")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              {t("sharedWith")}: {doctors[selectedDoctor].name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
