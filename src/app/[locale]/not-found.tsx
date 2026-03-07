import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { DecorativeCross, DecorativeCircle } from "@/components/ui";
import { GoBackButton } from "@/components/feedback/GoBackButton";

export default function NotFound() {
  const t = useTranslations("errors.notFound");

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 py-20">
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <DecorativeCircle
          className="absolute -top-16 -right-16 opacity-[0.07]"
          color="#93C5FD"
          size={320}
        />
        <DecorativeCircle
          className="absolute -bottom-12 -left-12 opacity-[0.05]"
          color="#BFDBFE"
          size={260}
        />
        <DecorativeCross
          className="absolute top-1/3 left-8 opacity-[0.08]"
          size={28}
        />
        <DecorativeCross
          className="absolute right-12 bottom-1/4 opacity-[0.06]"
          color="#BFDBFE"
          size={22}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {/* Logo */}
        <Link className="mb-10 flex items-center gap-2.5" href="/">
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

        {/* Error code — neumorphic badge */}
        <div className="neu-shell mb-8 inline-flex h-28 w-28 items-center justify-center">
          <span className="bg-linear-to-br from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
            {t("code")}
          </span>
        </div>

        {/* Main card */}
        <div className="neu-surface w-full px-8 py-10 sm:px-12">
          <h1 className="mb-3 text-2xl font-bold text-slate-800">
            {t("title")}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            {t("description")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              className="neu-focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/60 bg-(--hp-primary) px-6 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px"
              href="/"
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
              {t("goHome")}
            </Link>

            <GoBackButton label={t("goBack")} />
          </div>
        </div>

        {/* Hint */}
        <p className="mt-6 text-xs text-slate-400">{t("hint")}</p>
      </div>
    </div>
  );
}
