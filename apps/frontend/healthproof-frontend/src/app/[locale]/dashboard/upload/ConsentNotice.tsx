"use client";

import { useTranslations } from "next-intl";

interface ConsentNoticeProps {
  onAccept: () => void;
  disabled?: boolean;
}

export function ConsentNotice({ onAccept, disabled }: ConsentNoticeProps) {
  const t = useTranslations("fhirReview");
  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {t("consentTitle")}
      </h3>
      <p className="text-sm text-slate-600">{t("consentBody")}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onAccept}
        className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {t("consentAccept")}
      </button>
    </div>
  );
}
