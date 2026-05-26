"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { generateMockHash, getNextBlockNumber } from "./mock-data";

type ActionType = "doctor" | "patient" | "lab";

interface BlockchainConfirmationProps {
  action: ActionType;
  onComplete?: () => void;
}

const ACTION_LABELS: Record<ActionType, string> = {
  doctor: "doctorConfirmLabel",
  patient: "patientConfirmLabel",
  lab: "labConfirmLabel",
};

export function BlockchainConfirmation({ action, onComplete }: BlockchainConfirmationProps) {
  const t = useTranslations("heroDemo");
  const [stage, setStage] = useState<"confirming" | "done">("confirming");
  const [hash] = useState(() => generateMockHash());
  const [block] = useState(() => getNextBlockNumber());

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("done");
      onComplete?.();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (stage === "confirming") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
          <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{t(ACTION_LABELS[action])}</p>
          <p className="mt-1 text-xs text-slate-400">{t("confirmingOnChain")}</p>
        </div>
        <div className="w-full space-y-2 rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("txHashLabel")}</p>
          <p className="font-mono text-xs text-slate-600">{hash}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-7 w-7 text-emerald-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{t("confirmedOnChain")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("confirmedOnChainDesc")}</p>
      </div>
      <div className="w-full space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("txHashLabel")}</p>
        <p className="font-mono text-xs text-slate-700">{hash}</p>
        <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{t("blockLabel")}</p>
        <p className="font-mono text-xs text-slate-700">#{block}</p>
        <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{t("gasUsedLabel")}</p>
        <p className="font-mono text-xs text-slate-700">42,000 HVE</p>
      </div>
    </div>
  );
}
