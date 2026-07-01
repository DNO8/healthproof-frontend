"use client";

import { Check, FileText, FlaskConical, Lock, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BlockchainConfirmation } from "./BlockchainConfirmation";
import { EncryptionDemo } from "./EncryptionDemo";
import { DEMO_PATIENTS } from "./mock-data";

interface LabUploadStepProps {
  onComplete: () => void;
}

export function LabUploadStep({ onComplete }: LabUploadStepProps) {
  const t = useTranslations("demoFlow");
  const [stage, setStage] = useState<
    "orders" | "upload" | "encrypt" | "confirm" | "done"
  >("orders");

  if (stage === "orders") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-700">
          <FlaskConical className="h-5 w-5" />
          <h3 className="text-sm font-semibold">{t("labRole")}</h3>
        </div>
        <p className="text-sm text-slate-600">{t("labPendingDesc")}</p>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t("pendingOrders")}
          </p>
          <button
            type="button"
            onClick={() => setStage("upload")}
            className="flex w-full items-center gap-3 rounded-2xl border border-(--hp-border) bg-(--hp-layer) px-4 py-3 text-left transition hover:bg-white hover:shadow-(--hp-shadow-raised)"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100">
              <FileText className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {t("examCBC")}
              </p>
              <p className="text-xs text-slate-400">
                {DEMO_PATIENTS[0].name} · {t("orderedBy")}: Dr. Silva
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (stage === "upload") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t("labUploadDesc")}</p>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-6">
          <Upload className="h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {t("uploadMockFile")}
          </p>
          <p className="text-xs text-slate-400">result_cbc.pdf · 1.2 MB</p>
        </div>
        <button
          type="button"
          onClick={() => setStage("encrypt")}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white shadow-(--hp-shadow-raised) transition hover:bg-slate-700"
        >
          {t("uploadAction")}
        </button>
      </div>
    );
  }

  if (stage === "encrypt") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t("labEncryptDesc")}</p>
        <EncryptionDemo onEncrypted={() => setStage("confirm")} />
      </div>
    );
  }

  if (stage === "confirm") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-700">
          <Lock className="h-4 w-4" />
          {t("encryptedReady")}
        </div>
        <BlockchainConfirmation action="lab" onComplete={onComplete} />
      </div>
    );
  }

  // done
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
        <Check className="h-4 w-4" />
        {t("labDone")}
      </div>
    </div>
  );
}
