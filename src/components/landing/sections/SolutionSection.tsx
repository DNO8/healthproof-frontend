"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function SolutionSection() {
  const t = useTranslations("solution");
  const features = t.raw("features") as string[];

  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />

        <div className="mx-auto mt-6 max-w-3xl space-y-4 text-center">
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            {t("description")}{" "}
            <strong className="text-slate-800">{t("descriptionBold")}</strong>
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("enablesTitle")}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                className="neu-inset flex items-center gap-3 p-4"
                key={feature}
              >
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-success)" />
                <span className="text-sm font-medium text-slate-700">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-slate-500">
            {t("footer")}{" "}
            <strong className="text-slate-700">{t("footerBold")}</strong>.
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}
