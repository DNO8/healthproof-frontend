"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const i18n = {
  en: {
    title: "Page not found",
    description:
      "The route you\u2019re looking for doesn\u2019t exist or has been moved. This may be an invalid URL or a page that hasn\u2019t been built yet.",
    goHome: "Back to Home",
    hint: "If you believe this is an error, please contact our team.",
  },
  es: {
    title: "P\u00e1gina no encontrada",
    description:
      "La ruta que buscas no existe o fue movida. Puede ser una URL inv\u00e1lida o una p\u00e1gina que a\u00fan no ha sido construida.",
    goHome: "Volver al Inicio",
    hint: "Si crees que esto es un error, por favor contacta a nuestro equipo.",
  },
} as const;

type Locale = keyof typeof i18n;

export function GlobalNotFoundClient() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const segment = window.location.pathname.split("/")[1];
    if (segment === "es") setLocale("es");
  }, []);

  const t = i18n[locale];
  const homeHref = locale === "es" ? "/es" : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute -top-16 -right-16 opacity-[0.07]"
          height={320}
          viewBox="0 0 100 100"
          width={320}
        >
          <circle cx="50" cy="50" fill="#93C5FD" r="50" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute -bottom-12 -left-12 opacity-[0.05]"
          height={260}
          viewBox="0 0 100 100"
          width={260}
        >
          <circle cx="50" cy="50" fill="#BFDBFE" r="50" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute top-1/3 left-8 opacity-[0.08]"
          height={28}
          viewBox="0 0 24 24"
          width={28}
        >
          <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#93C5FD" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute right-12 bottom-1/4 opacity-[0.06]"
          height={22}
          viewBox="0 0 24 24"
          width={22}
        >
          <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#BFDBFE" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {/* Logo */}
        <Link className="mb-10 flex items-center gap-2.5" href={homeHref}>
          <Image
            alt="HealthProof"
            height={36}
            src="/images/logo/healthproof-logo.png"
            width={36}
          />
          <span className="text-lg font-bold tracking-tight">
            <span className="bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Health
            </span>
            <span className="text-slate-800">Proof</span>
          </span>
        </Link>

        {/* Error code */}
        <div className="neu-shell mb-8 inline-flex h-28 w-28 items-center justify-center">
          <span className="bg-linear-to-br from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
            404
          </span>
        </div>

        {/* Neumorphic card */}
        <div className="neu-surface w-full px-8 py-10 sm:px-12">
          <h1 className="mb-3 text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            {t.description}
          </p>

          <Link
            className="neu-focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/60 bg-(--hp-primary) px-6 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px"
            href={homeHref}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {t.goHome}
          </Link>
        </div>

        {/* Hint */}
        <p className="mt-6 text-xs text-slate-400">{t.hint}</p>
      </div>
    </div>
  );
}
