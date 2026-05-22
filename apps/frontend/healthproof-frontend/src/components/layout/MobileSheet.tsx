"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations, useLocale } from "next-intl";
import { sileo } from "sileo";
import {
  Link,
  useRouter as useIntlRouter,
  usePathname as useIntlPathname,
} from "@/i18n/navigation";
import { useUiStore } from "@/state/ui.store";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { useOnChainRole } from "@/hooks/useOnChainRole";
import { useDbUser, clearDbUserCache } from "@/hooks/useDbUser";
import { LINKS_BY_ROLE } from "@/lib/navigation";
import type { UserRole } from "@/types/domain.types";

export function MobileSheet() {
  const t = useTranslations("nav");
  const tSidebar = useTranslations("dashboard.sidebar");
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, logout } = usePrivy();
  const sheetOpen = useUiStore((s) => s.mobileSheetOpen);
  const setSheetOpen = useUiStore((s) => s.setMobileSheetOpen);
  const locale = useLocale();
  const intlRouter = useIntlRouter();
  const intlPathname = useIntlPathname();
  const sheetRef = useRef<HTMLDivElement>(null);

  const walletAddress = useWalletAddress();
  const { role: onChainRole } = useOnChainRole(walletAddress ?? undefined);
  const { dbUser } = useDbUser();

  const isDashboard = pathname.startsWith("/dashboard");
  const dbRole = dbUser?.role?.toLowerCase() as UserRole | null;
  const intended = typeof window !== "undefined"
    ? (localStorage.getItem("hp_intended_role") as UserRole | null)
    : null;
  const effectiveRole: UserRole = onChainRole ?? dbRole ?? intended ?? "patient";
  const sidebarLinks = LINKS_BY_ROLE[effectiveRole] ?? LINKS_BY_ROLE.patient;

  useEffect(() => {
    setSheetOpen(false);
  }, [intlPathname, setSheetOpen]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    if (sheetOpen) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [sheetOpen, setSheetOpen]);

  async function handleLogout() {
    sessionStorage.setItem("hp_logging_out", "true");
    await logout();
    clearDbUserCache();
    sessionStorage.clear();
    localStorage.clear();
    sileo.success({ title: t("signedOut"), description: t("signedOutDescription") });
    window.location.href = "/";
  }

  function switchLocale(next: "en" | "es") {
    intlRouter.replace(intlPathname, { locale: next });
  }

  const linkClass = (active: boolean) =>
    `block rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      active ? "neu-pressed text-sky-700" : "text-slate-600 hover:neu-pressed"
    }`;

  if (!sheetOpen) return null;

  return (
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={() => setSheetOpen(false)}
      />
      <div
        ref={sheetRef}
        className="absolute left-0 top-0 h-full w-[min(320px,85vw)] translate-x-0 transform border-r border-white/70 bg-[#F8F5F0] p-5 shadow-2xl transition-transform duration-200 ease-out z-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-lg font-bold text-white">
              H
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">HealthProof</p>
              {walletAddress && (
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/50 hover:text-slate-600"
            onClick={() => setSheetOpen(false)}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><title>{t("closeMenu")}</title><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="mt-6 space-y-1">
          {isDashboard && (
            <>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {tSidebar("overview")}
              </p>
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  className={linkClass(pathname === link.href || pathname.startsWith(`${link.href}/`))}
                  onClick={() => {
                    router.push(link.href);
                    setSheetOpen(false);
                  }}
                  type="button"
                >
                  <span className="mr-2">{link.icon}</span>
                  {tSidebar(link.labelKey)}
                </button>
              ))}
              <div className="my-3 border-t border-slate-200/60" />
            </>
          )}

          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("protocol")}
          </p>
          <Link className={linkClass(intlPathname === "/")} href="/" onClick={() => setSheetOpen(false)}>
            {t("home")}
          </Link>
          <Link className={linkClass(intlPathname === "/contact")} href="/contact" onClick={() => setSheetOpen(false)}>
            {t("contact")}
          </Link>

          {authenticated && (
            <>
              {!isDashboard && (
                <Link className={linkClass(intlPathname === "/dashboard")} href="/dashboard" onClick={() => setSheetOpen(false)}>
                  {t("dashboard")}
                </Link>
              )}
              <Link className={linkClass(intlPathname === "/dashboard/profile")} href="/dashboard/profile" onClick={() => setSheetOpen(false)}>
                {t("profile")}
              </Link>
            </>
          )}

          <div className="my-3 border-t border-slate-200/60" />

          <div className="flex items-center gap-2 px-3">
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${locale === "en" ? "neu-pressed text-sky-700" : "text-slate-400"}`}
              onClick={() => switchLocale("en")}
              type="button"
            >
              EN
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${locale === "es" ? "neu-pressed text-sky-700" : "text-slate-400"}`}
              onClick={() => switchLocale("es")}
              type="button"
            >
              ES
            </button>
          </div>

          {ready && (
            <>
              {authenticated ? (
                <button className="mt-2 block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50" onClick={handleLogout} type="button">
                  {t("logout")}
                </button>
              ) : (
                <Link className={linkClass(intlPathname === "/auth")} href="/auth" onClick={() => setSheetOpen(false)}>
                  {t("login")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
