"use client";

import { useTranslations } from "next-intl";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="neu-shell border border-white/70 p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("intro")}
        </p>

        <ContactForm />
      </div>
    </main>
  );
}
