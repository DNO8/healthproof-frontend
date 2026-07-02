"use client";

import { useTranslations } from "next-intl";
import { Bot, ChevronDown, Hand } from "lucide-react";
import { useState } from "react";

interface ConsentNoticeProps {
  onAccept: () => void;
  onManual: () => void;
  disabled?: boolean;
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-amber-700 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-amber-800 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function ConsentNotice({ onAccept, onManual, disabled }: ConsentNoticeProps) {
  const t = useTranslations("fhirReview");
  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {t("consentTitle")}
      </h3>
      <p className="text-sm text-slate-600">{t("consentBody")}</p>

      <div className="space-y-2">
        <Accordion title={t("consentAiTitle")} defaultOpen>
          <ul className="list-disc pl-4 space-y-1">
            <li>{t("consentAiItem1")}</li>
            <li>{t("consentAiItem2")}</li>
            <li>{t("consentAiItem3")}</li>
            <li className="text-xs text-amber-700">{t("consentAiItem4")}</li>
          </ul>
        </Accordion>

        <Accordion title={t("consentManualTitle")}>
          <ul className="list-disc pl-4 space-y-1">
            <li>{t("consentManualItem1")}</li>
            <li>{t("consentManualItem2")}</li>
            <li>{t("consentManualItem3")}</li>
          </ul>
        </Accordion>
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
