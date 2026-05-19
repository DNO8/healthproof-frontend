"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { SectionTitle } from "@/components/ui";

const VIDEO_IDS: Record<string, string> = {
  es: "WXJC6E67o-4",
  en: "W6QedLx2mL4",
};

export function DemoVideoSection() {
  const locale = useLocale();
  const t = useTranslations("demoVideo");
  const videoId = VIDEO_IDS[locale] ?? VIDEO_IDS["en"];

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-10">
      <SectionTitle
        centered
        eyebrow={t("eyebrow")}
        subtitle={t("subtitle")}
        title={t("title")}
      />

      <div className="mx-auto mt-8 max-w-4xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-lg">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={t("title")}
          />
        </div>
      </div>
    </div>
  );
}
