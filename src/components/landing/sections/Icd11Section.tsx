"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function Icd11Section() {
  const t = useTranslations("icd11");
  const features = t.raw("features") as string[];

  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />

        <div className="mx-auto mt-6 max-w-3xl space-y-6">
          <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            {t("intro")}{" "}
            <strong className="text-slate-800">{t("introBold")}</strong>{" "}
            {t("introEnd")}
          </p>

          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("featuresTitle")}
            </p>
            <ul className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  className="neu-inset flex items-center gap-3 p-4"
                  key={feature}
                >
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-primary)" />
                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("adapt")}
            </p>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("accelerate")}{" "}
              <strong className="text-slate-800">{t("accelerateBold")}</strong>
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
