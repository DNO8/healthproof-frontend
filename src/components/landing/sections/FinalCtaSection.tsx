"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";

export function FinalCtaSection() {
  const t = useTranslations("finalCta");
  const bullets = t.raw("bullets") as string[];

  return (
    <div className="neu-shell mt-10 border border-white/70 p-7 text-center sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {t("eyebrow")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">
        {t("title")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
        {t("description")}
      </p>
      <ul className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
        {bullets.map((bullet) => (
          <li key={bullet}>
            <span className="neu-chip inline-flex px-4 py-2 text-xs font-semibold text-slate-600">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 sm:text-base">
        {t("footer")}{" "}
        <strong className="text-slate-700">{t("footerBold")}</strong>
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/contact">
          <Button
            className="min-w-[260px] cursor-pointer"
            size="lg"
            variant="primary"
          >
            {t("button")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
