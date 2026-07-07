"use client";

import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GenerateResult } from "@/services/fhir-rag/schema";

interface FhirBundlePreviewProps {
	result: GenerateResult;
	onPublish: () => void;
	publishing: boolean;
	onReviewAgain?: () => void;
}

export function FhirBundlePreview({
	result,
	onPublish,
	publishing,
	onReviewAgain,
}: FhirBundlePreviewProps) {
	const t = useTranslations("fhirReview");
	const score = Math.round(result.compliance.score * 100);

	return (
		<div className="neu-surface rounded-xl p-5 space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-slate-800">
					{t("previewTitle")}
				</h3>
				<div className="flex items-center gap-2">
					<span
						className={`text-xs font-medium px-2 py-1 rounded-lg ${
							score >= 80
								? "bg-emerald-50 text-emerald-600"
								: "bg-amber-50 text-amber-600"
						}`}
					>
						{t("complianceScore", { score })}
					</span>
					<span
						className="text-slate-400 hover:text-sky-600 transition-colors cursor-help"
						role="img"
						aria-label={t("scoreTooltip")}
						title={t("scoreTooltip")}
					>
						<HelpCircle className="h-4 w-4" />
					</span>
				</div>
			</div>

			<p className="text-xs text-slate-500">{t("previewLocalNote")}</p>

			<div className="neu-inset rounded-lg p-3 max-h-80 overflow-y-auto">
				<pre className="text-xs text-slate-600 whitespace-pre-wrap">
					{JSON.stringify(result.bundle, null, 2)}
				</pre>
			</div>

			{score < 100 && onReviewAgain && (
				<div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 space-y-2">
					<p>{t("scoreNotPerfect", { score })}</p>
					<button
						type="button"
						onClick={onReviewAgain}
						className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-2 text-sm font-semibold text-sky-700"
					>
						{t("reviewAgain")}
					</button>
				</div>
			)}

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
