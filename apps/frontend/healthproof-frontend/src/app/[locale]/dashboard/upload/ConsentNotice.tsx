"use client";

import { useTranslations } from "next-intl";
import { Bot, FileText, Hand } from "lucide-react";

interface ConsentNoticeProps {
  onAccept: () => void;
  onManual: () => void;
  disabled?: boolean;
}

export function ConsentNotice({ onAccept, onManual, disabled }: ConsentNoticeProps) {
  const t = useTranslations("fhirReview");
  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {t("consentTitle")}
      </h3>
      <p className="text-sm text-slate-600">{t("consentBody")}</p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("consentConsequenceTitle")}
        </p>
        <p>{t("consentConsequenceOcr")}</p>
        <p>{t("consentConsequenceFhir")}</p>
        <p className="text-xs text-amber-700">{t("consentNoStorage")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="neu-surface hover:neu-pressed flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <Bot className="h-4 w-4" />
          {t("consentAccept")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onManual}
          className="neu-inset hover:brightness-95 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
        >
          <Hand className="h-4 w-4" />
          {t("consentManual")}
        </button>
      </div>
    </div>
  );
}
