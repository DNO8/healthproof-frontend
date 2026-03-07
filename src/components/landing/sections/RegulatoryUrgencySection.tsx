"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function RegulatoryUrgencySection() {
  const t = useTranslations("regulatory");
  const drivers = t.raw("drivers") as string[];
  const riskExamples = t.raw("riskExamples") as string[];

  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />

        <div className="mx-auto mt-6 max-w-3xl space-y-6">
          <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            {t("intro")}
          </p>

          <ul className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            {drivers.map((driver) => (
              <li
                className="neu-inset flex items-center gap-3 p-4"
                key={driver}
              >
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-primary)" />
                <span className="text-sm font-medium text-slate-700">
                  {driver}
                </span>
              </li>
            ))}
          </ul>

          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("riskIntro")}{" "}
              <strong className="text-slate-800">{t("riskBold")}</strong>
            </p>
            <p className="text-sm text-slate-600 sm:text-base">
              {t("alteredPdf")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {riskExamples.map((risk) => (
                <span
                  className="neu-chip px-4 py-2 text-xs font-semibold text-slate-600"
                  key={risk}
                >
                  {risk}
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700 sm:text-base">
              {t("conclusion")}{" "}
              <span className="text-sky-600">{t("conclusionHighlight")}</span>
              {t("conclusionEnd")}
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
