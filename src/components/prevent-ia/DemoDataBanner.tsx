"use client";

import { useTranslations } from "next-intl";

/** Texto/estilo de disclaimer para datos ficticios — mismo lenguaje que el resto del dashboard. */
export function DemoDataBanner() {
  const t = useTranslations("dashboard.preventIa");

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      {t("demoDataDisclaimer")}
    </div>
  );
}
