"use client";

import { FileText, Stethoscope, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DEMO_PATIENTS } from "./mock-data";

interface DoctorOrderStepProps {
  onComplete: () => void;
}

export function DoctorOrderStep({ onComplete }: DoctorOrderStepProps) {
  const t = useTranslations("demoFlow");
  const [selectedPatient, setSelectedPatient] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const examTypes = [t("examCBC"), t("examRadiography"), t("examECG")];
  const [selectedExam, setSelectedExam] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sky-700">
        <Stethoscope className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t("doctorRole")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("doctorOrderDesc")}</p>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t("selectPatient")}
        </p>
        {DEMO_PATIENTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPatient(i);
              setConfirmed(false);
            }}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              selectedPatient === i
                ? "border-sky-300 bg-sky-50 shadow-(--hp-shadow-raised)"
                : "border-(--hp-border) bg-(--hp-layer) hover:bg-white"
            }`}
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{p.name}</p>
              <p className="text-xs text-slate-400">{p.wallet}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t("selectExam")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {examTypes.map((exam, i) => (
            <button
              key={exam}
              onClick={() => {
                setSelectedExam(i);
                setConfirmed(false);
              }}
              className={`rounded-xl border px-2 py-2 text-center text-xs font-medium transition ${
                selectedExam === i
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-(--hp-border) bg-(--hp-layer) text-slate-600 hover:bg-white"
              }`}
              type="button"
            >
              {exam}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <FileText className="h-4 w-4" />
          <p className="text-[10px] font-medium uppercase tracking-wide">
            {t("orderSummary")}
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-700">
          {DEMO_PATIENTS[selectedPatient].name} — {examTypes[selectedExam]}
        </p>
      </div>

      {!confirmed ? (
        <button
          type="button"
          onClick={() => {
            setConfirmed(true);
            onComplete();
          }}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white shadow-(--hp-shadow-raised) transition hover:bg-slate-700"
        >
          {t("createOrder")}
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm text-emerald-700">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {t("orderCreated")}
        </div>
      )}
    </div>
  );
}
