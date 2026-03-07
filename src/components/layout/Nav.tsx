"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import { usePrivy } from "@privy-io/react-auth";
import { useLocale, useTranslations } from "next-intl";
import {
  Link,
  useRouter as useIntlRouter,
  usePathname as useIntlPathname,
} from "@/i18n/navigation";
import { clearDbUserCache } from "@/hooks/useDbUser";

export function Nav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { ready, authenticated, logout } = usePrivy();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const intlRouter = useIntlRouter();
  const intlPathname = useIntlPathname();

  function switchLocale(next: "en" | "es") {
    intlRouter.replace(intlPathname, { locale: next });
  }

  const loading = !ready;

  // biome-ignore lint/correctness/useExhaustiveDependencies: close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [intlPathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    sessionStorage.setItem("hp_logging_out", "true");
    await logout();
    setMenuOpen(false);
    clearDbUserCache();
    sessionStorage.removeItem("hp_upserted");
    sessionStorage.removeItem("hp_wallet_synced");
    sessionStorage.removeItem("hp_welcome_shown");
    sessionStorage.removeItem("hp_logging_out");
    sileo.success({
      title: t("signedOut"),
      description: t("signedOutDescription"),
    });
    router.replace("/");
  }

  // Hide nav on auth page
  if (intlPathname === "/auth") return null;

  const linkClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "neu-pressed text-sky-700"
        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
    }`;

  const localePill = (
    <div className="flex items-center rounded-full border border-white/60 bg-white/40 p-0.5">
      <button
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
          locale === "en"
            ? "neu-pressed text-sky-700"
            : "text-slate-400 hover:text-slate-600"
        }`}
        onClick={() => switchLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
          locale === "es"
            ? "neu-pressed text-sky-700"
            : "text-slate-400 hover:text-slate-600"
        }`}
        onClick={() => switchLocale("es")}
        type="button"
      >
        ES
      </button>
    </div>
  );

  return (
    <div
      className="sticky top-0 z-50 flex w-full justify-center px-4 pt-4"
      ref={menuRef}
    >
      <nav className="neu-shell relative w-full max-w-5xl rounded-full border border-white/70 px-5 py-2.5 sm:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link className="flex shrink-0 items-center gap-2" href="/">
            <Image
              alt="HealthProof"
              height={28}
              src="/images/logo/healthproof-logo.png"
              width={28}
            />
            <span className="text-sm font-bold tracking-tight sm:text-base">
              <span className="bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Health
              </span>
              <span className="text-slate-800">Proof</span>
            </span>
          </Link>

          {/* Center label — desktop only */}
          <span className="hidden items-center gap-2 text-xs font-medium tracking-wide text-slate-400 md:flex">
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 12h4l2-6 3 12 2-8 2 4h7"
                stroke="#60A5FA"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            {t("protocol")}
          </span>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            <Link className={linkClass(intlPathname === "/")} href="/">
              {t("home")}
            </Link>
            <Link
              className={linkClass(intlPathname === "/contact")}
              href="/contact"
            >
              {t("contact")}
            </Link>

            {!loading && (
              <>
                {authenticated ? (
                  <>
                    <Link
                      className={linkClass(
                        intlPathname === "/dashboard" ||
                          (intlPathname.startsWith("/dashboard") &&
                            !intlPathname.startsWith("/dashboard/profile")),
                      )}
                      href="/dashboard"
                    >
                      {t("dashboard")}
                    </Link>
                    <Link
                      className={linkClass(
                        intlPathname === "/dashboard/profile",
                      )}
                      href="/dashboard/profile"
                    >
                      {t("profile")}
                    </Link>
                    <button
                      className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-white/50 hover:text-slate-800"
                      onClick={handleLogout}
                      type="button"
                    >
                      {t("logout")}
                    </button>
                  </>
                ) : (
                  <Link
                    className={linkClass(intlPathname === "/auth")}
                    href="/auth"
                  >
                    {t("login")}
                  </Link>
                )}
              </>
            )}

            {localePill}
          </div>

          {/* Mobile: locale pill + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {localePill}

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white/50"
              onClick={() => setMenuOpen((prev) => !prev)}
              type="button"
              aria-label="Toggle menu"
            >
              <svg
                fill="none"
                height="20"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="20"
              >
                <title>{menuOpen ? t("closeMenu") : t("openMenu")}</title>
                {menuOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 flex flex-col gap-1 rounded-2xl border border-white/70 bg-(--hp-bg) p-3 shadow-lg md:hidden">
            <Link className={linkClass(intlPathname === "/")} href="/">
              {t("home")}
            </Link>
            <Link
              className={linkClass(intlPathname === "/contact")}
              href="/contact"
            >
              {t("contact")}
            </Link>

            {!loading && (
              <>
                {authenticated ? (
                  <>
                    <Link
                      className={linkClass(
                        intlPathname === "/dashboard" ||
                          (intlPathname.startsWith("/dashboard") &&
                            !intlPathname.startsWith("/dashboard/profile")),
                      )}
                      href="/dashboard"
                    >
                      {t("dashboard")}
                    </Link>
                    <Link
                      className={linkClass(
                        intlPathname === "/dashboard/profile",
                      )}
                      href="/dashboard/profile"
                    >
                      {t("profile")}
                    </Link>
                    <button
                      className="rounded-full px-4 py-1.5 text-left text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-white/50 hover:text-slate-800"
                      onClick={handleLogout}
                      type="button"
                    >
                      {t("logout")}
                    </button>
                  </>
                ) : (
                  <Link
                    className={linkClass(intlPathname === "/auth")}
                    href="/auth"
                  >
                    {t("login")}
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
