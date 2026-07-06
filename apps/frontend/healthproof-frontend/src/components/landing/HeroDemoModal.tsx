"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import {
  DoctorOrderStep,
  LabUploadStep,
  PatientSelectLabStep,
  PatientShareStep,
  StepIndicator,
  TimelineStep,
} from "./demo";

interface HeroDemoModalProps {
  onClose: () => void;
  onComplete?: () => void;
  onSummary?: () => void;
}

export function HeroDemoModal({
  onClose,
  onComplete,
  onSummary,
}: HeroDemoModalProps) {
  const t = useTranslations("demoFlow");
  const [step, setStep] = useState(0);
  const [stepsDone, setStepsDone] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  const labels = [
    t("stepOrder"),
    t("stepSelectLab"),
    t("stepLab"),
    t("stepPatient"),
    t("stepTimeline"),
  ];

  const handleStepComplete = (index: number) => {
    const next = [...stepsDone];
    next[index] = true;
    setStepsDone(next);
  };

  const handleNext = () => {
    if (step < labels.length - 1) {
      setStep(step + 1);
    } else {
      onComplete?.();
      onSummary?.();
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/70 bg-(--hp-bg) shadow-(--hp-shadow-raised)">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--hp-border) px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">
              {t("modalTitle")}
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

        {/* Step Indicator */}
        <StepIndicator current={step} labels={labels} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <DoctorOrderStep onComplete={() => handleStepComplete(0)} />
          )}
          {step === 1 && (
            <PatientSelectLabStep onComplete={() => handleStepComplete(1)} />
          )}
          {step === 2 && (
            <LabUploadStep onComplete={() => handleStepComplete(2)} />
          )}
          {step === 3 && (
            <PatientShareStep onComplete={() => handleStepComplete(3)} />
          )}
          {step === 4 && (
            <TimelineStep onComplete={() => handleStepComplete(4)} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-(--hp-border) px-6 py-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            {step === 0 ? t("close") : t("back")}
          </Button>
          <Button size="sm" onClick={handleNext} disabled={!stepsDone[step]}>
            {step === labels.length - 1 ? t("done") : t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
