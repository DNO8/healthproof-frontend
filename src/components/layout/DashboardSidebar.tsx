"use client";

import { usePrivy } from "@privy-io/react-auth";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Globe,
  HeartPulse,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  ScanLine,
  Settings,
  Share2,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { clearDbUserCache } from "@/hooks/auth/useDbUser";
import { usePathname, useRouter } from "@/i18n/navigation";
import { clearUserSession } from "@/lib/auth/clear-session";
import { LINKS_BY_ROLE } from "@/lib/navigation";
import type { UserRole } from "@/types/domain.types";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Shield,
  User,
  Mail,
  Share2,
  FolderOpen,
  ScanLine,
  Upload,
  Globe,
  Building2,
  HeartPulse,
  Settings,
  Lock,
};

interface DashboardSidebarProps {
  role: UserRole | null;
  walletAddress: string | null;
}

const COLLAPSE_KEY = "hp_sidebar_collapsed";

export function DashboardSidebar({
  role,
  walletAddress,
}: DashboardSidebarProps) {
  const t = useTranslations("dashboard.sidebar");
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = usePrivy();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  const effectiveRole: UserRole = role ?? "patient";
  const links = LINKS_BY_ROLE[effectiveRole] ?? LINKS_BY_ROLE.patient;

  async function handleLogout() {
    sessionStorage.setItem("hp_logging_out", "true");
    await logout();
    clearDbUserCache();
    clearUserSession();
    sileo.success({ title: t("signedOut"), description: t("signedOutDesc") });
    router.push("/auth");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebarClasses = collapsed
    ? "w-20 hidden md:flex"
    : "w-64 hidden md:flex";

  return (
    <aside
      className={`fixed left-0 top-0 z-10 h-screen flex-col border-r border-white/70 bg-[#F8F5F0] ${sidebarClasses} transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/70">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-lg font-bold text-white">
          H
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">HealthProof</p>
            {walletAddress && (
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        className="hidden md:flex mx-3 mt-3 mb-1 items-center justify-center rounded-xl p-1.5 neu-surface hover:neu-pressed transition-all"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = ICON_MAP[link.icon];
          return (
            <button
              key={link.id}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                active
                  ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                  : "neu-surface hover:neu-pressed text-slate-600"
              }`}
              onClick={() => router.push(link.href)}
              type="button"
              title={t(link.labelKey)}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {t(link.labelKey)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/70 px-3 py-3">
        <button
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 neu-surface hover:neu-pressed text-red-500 transition-all text-left"
          onClick={handleLogout}
          type="button"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">{t("logout")}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
