"use client";

import { useTranslations } from "next-intl";
import type { GenerateResult } from "@/services/fhir-rag/schema";

interface FhirBundlePreviewProps {
  result: GenerateResult;
  onPublish: () => void;
  publishing: boolean;
}

export function FhirBundlePreview({
  result,
  onPublish,
  publishing,
}: FhirBundlePreviewProps) {
  const t = useTranslations("fhirReview");
  const score = Math.round(result.compliance.score * 100);

  return (
    <div className="neu-surface rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          {t("previewTitle")}
        </h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-lg ${
            score >= 80
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {t("complianceScore", { score })}
        </span>
      </div>

      <div className="neu-inset rounded-lg p-3 max-h-80 overflow-y-auto">
        <pre className="text-xs text-slate-600 whitespace-pre-wrap">
          {JSON.stringify(result.bundle, null, 2)}
        </pre>
      </div>

      <button
        type="button"
        disabled={publishing}
        onClick={onPublish}
        className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {publishing ? t("publishing") : t("publishFhir")}
      </button>
    </div>
  );
}
