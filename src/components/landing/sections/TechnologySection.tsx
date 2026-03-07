"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TechnologySection() {
  const t = useTranslations("technology");
  const guarantees = t.raw("guarantees") as string[];
  const ensures = t.raw("ensures") as string[];

  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />

        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("guaranteesTitle")}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {guarantees.map((item) => (
                <li
                  className="neu-inset flex items-center gap-3 p-4"
                  key={item}
                >
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-success)" />
                  <span className="text-sm font-medium text-slate-700">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("offChain")}{" "}
              <strong className="text-slate-800">{t("offChainBold1")}</strong>
              {t("offChainMid")}{" "}
              <strong className="text-slate-800">{t("offChainBold2")}</strong>{" "}
              {t("offChainEnd")}
            </p>
          </div>

          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("ensuresTitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {ensures.map((item) => (
                <span
                  className="neu-chip px-4 py-2 text-xs font-semibold text-slate-600"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 sm:text-base">
            {t("l1")} <strong className="text-slate-800">{t("l1Bold")}</strong>{" "}
            {t("l1End")}
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}
