"use client";

import { Check, FileText, FlaskConical, Shield, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import {
  BlockchainConfirmation,
  EncryptionDemo,
  DEMO_EXAM_TYPE,
  DEMO_LABS,
  DEMO_ORDER_ID,
  DEMO_PATIENTS,
} from "./demo";

export type DemoActor = "doctor" | "patient" | "lab";

export type DemoSteps = {
  doctor: boolean;
  patient: boolean;
  lab: boolean;
};

type HeroDemoModalProps = {
  actor: DemoActor;
  steps: DemoSteps;
  onComplete: () => void;
  onClose: () => void;
  onSummary?: () => void;
};

const ACTOR_ICONS: Record<DemoActor, React.ReactNode> = {
  doctor: <User className="h-5 w-5 text-sky-600" />,
  patient: <Shield className="h-5 w-5 text-emerald-600" />,
  lab: <FlaskConical className="h-5 w-5 text-indigo-600" />,
};

export function HeroDemoModal({
  actor,
  steps,
  onComplete,
  onClose,
  onSummary,
}: HeroDemoModalProps) {
  const t = useTranslations("heroDemo");
  const [step, setStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState(0);
  const [selectedLab, setSelectedLab] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const isDone = steps[actor];
  const totalSteps = 3;

  const handleNext = () => {
    if (step === totalSteps - 1 && !confirmed) return;
    if (step < totalSteps - 1) {
      setStep(step + 1);
      setConfirmed(false);
    } else {
      if (!isDone) onComplete();
      if (steps.doctor && steps.patient && steps.lab) {
        onSummary?.();
      }
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setConfirmed(false);
    }
  };

  const titleKey: Record<DemoActor, string> = {
    doctor: t("doctorTitle"),
    patient: t("patientTitle"),
    lab: t("labTitle"),
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-(--hp-bg) shadow-(--hp-shadow-raised)">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--hp-border) px-6 py-4">
          <div className="flex items-center gap-2">
            {ACTOR_ICONS[actor]}
            <h2 className="text-lg font-semibold text-slate-800">
              {titleKey[actor]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
            aria-label={t("close")}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 px-6 pt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-sky-400" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isDone && step === 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              {t("alreadyDone")}
            </div>
          )}

          {actor === "doctor" && (
            <DoctorFlow
              step={step}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              confirmed={confirmed}
              onConfirmed={() => setConfirmed(true)}
              t={t}
            />
          )}
          {actor === "patient" && (
            <PatientFlow
              step={step}
              selectedLab={selectedLab}
              onSelectLab={setSelectedLab}
              confirmed={confirmed}
              onConfirmed={() => setConfirmed(true)}
              t={t}
            />
          )}
          {actor === "lab" && (
            <LabFlow
              step={step}
              confirmed={confirmed}
              onConfirmed={() => setConfirmed(true)}
              t={t}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-(--hp-border) px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 0 ? onClose : handleBack}
          >
            {step === 0 ? t("close") : t("back")}
          </Button>
          <Button size="sm" onClick={handleNext} disabled={step === totalSteps - 1 && !confirmed}>
            {step === totalSteps - 1 ? t("done") : t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function DoctorFlow({
  step,
  selectedPatient,
  onSelectPatient,
  confirmed,
  onConfirmed,
  t,
}: {
  step: number;
  selectedPatient: number;
  onSelectPatient: (i: number) => void;
  confirmed: boolean;
  onConfirmed: () => void;
  t: (key: string) => string;
}) {
  if (step === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          {t("doctorStep1Title")}
        </h3>
        <p className="text-sm text-slate-500">{t("doctorStep1Desc")}</p>
        <div className="space-y-2">
          {DEMO_PATIENTS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelectPatient(i)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                selectedPatient === i
                  ? "border-sky-300 bg-sky-50 shadow-(--hp-shadow-raised)"
                  : "border-(--hp-border) bg-(--hp-layer) hover:bg-white"
              }`}
              type="button"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                {p.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{p.name}</p>
                <p className="text-xs text-slate-400">{p.wallet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          {t("doctorStep2Title")}
        </h3>
        <p className="text-sm text-slate-500">{t("doctorStep2Desc")}</p>
        <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Patient
          </p>
          <p className="text-sm text-slate-700">
            {DEMO_PATIENTS[selectedPatient].name}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Exam
          </p>
          <p className="text-sm text-slate-700">{DEMO_EXAM_TYPE}</p>
        </div>
      </div>
    );
  }

  return (
    <BlockchainConfirmation
      action="doctor"
      onComplete={onConfirmed}
    />
  );
}

function PatientFlow({
  step,
  selectedLab,
  onSelectLab,
  confirmed,
  onConfirmed,
  t,
}: {
  step: number;
  selectedLab: number;
  onSelectLab: (i: number) => void;
  confirmed: boolean;
  onConfirmed: () => void;
  t: (key: string) => string;
}) {
  if (step === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          {t("patientStep1Title")}
        </h3>
        <p className="text-sm text-slate-500">{t("patientStep1Desc")}</p>
        <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-sky-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                {DEMO_EXAM_TYPE}
              </p>
              <p className="text-xs text-slate-400">
                {DEMO_ORDER_ID} — Dr. Silva
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          {t("patientStep2Title")}
        </h3>
        <p className="text-sm text-slate-500">{t("patientStep2Desc")}</p>
        <div className="space-y-2">
          {DEMO_LABS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => onSelectLab(i)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                selectedLab === i
                  ? "border-sky-300 bg-sky-50 shadow-(--hp-shadow-raised)"
                  : "border-(--hp-border) bg-(--hp-layer) hover:bg-white"
              }`}
              type="button"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{l.name}</p>
                <p className="text-xs text-slate-400">{l.wallet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <BlockchainConfirmation
      action="patient"
      onComplete={onConfirmed}
    />
  );
}

function LabFlow({
  step,
  confirmed,
  onConfirmed,
  t,
}: {
  step: number;
  confirmed: boolean;
  onConfirmed: () => void;
  t: (key: string) => string;
}) {
  if (step === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">{t("labStep1Title")}</h3>
        <p className="text-sm text-slate-500">{t("labStep1Desc")}</p>
        <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Order
          </p>
          <p className="text-sm text-slate-700">{DEMO_ORDER_ID}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Patient
          </p>
          <p className="text-sm text-slate-700">{DEMO_PATIENTS[0].name}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Exam
          </p>
          <p className="text-sm text-slate-700">{DEMO_EXAM_TYPE}</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">{t("labStep2Title")}</h3>
        <p className="text-sm text-slate-500">{t("labStep2Desc")}</p>
        <EncryptionDemo />
      </div>
    );
  }

  return (
    <BlockchainConfirmation
      action="lab"
      onComplete={onConfirmed}
    />
  );
}
