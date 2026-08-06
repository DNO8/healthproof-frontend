"use client";

import { Bot, ChevronDown, Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { DocumentCategory } from "@/services/fhir-rag/schema";

interface ConsentNoticeProps {
  documentType?: DocumentCategory;
  onAccept: () => void;
  onManual?: () => void;
  disabled?: boolean;
  aiStatus?: string | null;
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

export function ConsentNotice({
  documentType = "lab",
  onAccept,
  onManual,
  disabled,
  aiStatus,
}: ConsentNoticeProps) {
  const t = useTranslations("fhirReview");
  const isAiProcessing = !!aiStatus;
  const prefix =
    documentType === "obstetric-ultrasound"
      ? "obstetric"
      : documentType === "abdominal-ultrasound"
        ? "imaging"
        : "lab";
  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">
        {t(`${prefix}.consentTitle`)}
      </h3>
      <p className="text-sm text-slate-600">{t(`${prefix}.consentBody`)}</p>

      <div className="space-y-2">
        <Accordion title={t(`${prefix}.consentAiTitle`)} defaultOpen>
          <ul className="list-disc pl-4 space-y-1">
            <li>{t(`${prefix}.consentAiItem1`)}</li>
            <li>{t(`${prefix}.consentAiItem2`)}</li>
            <li>{t(`${prefix}.consentAiItem3`)}</li>
            <li className="text-xs text-amber-700">
              {t(`${prefix}.consentAiItem4`)}
            </li>
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

      <div
        className={`grid grid-cols-1 gap-3 ${onManual ? "sm:grid-cols-2" : ""}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="neu-surface hover:neu-pressed flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {isAiProcessing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              <span className="truncate">{aiStatus}</span>
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              {t("consentAccept")}
            </>
          )}
        </button>
        {onManual && (
          <button
            type="button"
            disabled={disabled}
            onClick={onManual}
            className="neu-inset hover:brightness-95 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            <Hand className="h-4 w-4" />
            {t("consentManual")}
          </button>
        )}
      </div>
    </div>
  );
}
