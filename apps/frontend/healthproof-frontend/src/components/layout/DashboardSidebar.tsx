"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { sileo } from "sileo";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { clearDbUserCache } from "@/hooks/useDbUser";

interface DashboardSidebarProps {
  role: UserRole | null;
  walletAddress: string | null;
}

interface SidebarLink {
  id: string;
  labelKey: string;
  icon: string;
  href: string;
}

const LINKS_BY_ROLE: Record<UserRole, SidebarLink[]> = {
  patient: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "my-orders", labelKey: "myOrders", icon: "📋", href: "/dashboard/my-orders" },
    { id: "documents", labelKey: "documents", icon: "📄", href: "/dashboard/documents" },
    { id: "permissions", labelKey: "permissions", icon: "🔐", href: "/dashboard/permissions" },
    { id: "guardians", labelKey: "guardians", icon: "👤", href: "/dashboard/guardians" },
    { id: "share", labelKey: "share", icon: "📤", href: "/dashboard/share" },
  ],
  doctor: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "orders", labelKey: "orders", icon: "📝", href: "/dashboard/orders" },
    { id: "episodes", labelKey: "episodes", icon: "🏥", href: "/dashboard/episodes" },
    { id: "shared", labelKey: "shared", icon: "📂", href: "/dashboard/shared" },
    { id: "scan", labelKey: "scan", icon: "📷", href: "/dashboard/scan" },
  ],
  lab: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "lab-orders", labelKey: "labOrders", icon: "📋", href: "/dashboard/lab-orders" },
    { id: "upload", labelKey: "upload", icon: "📤", href: "/dashboard/upload" },
    { id: "scan", labelKey: "scan", icon: "📷", href: "/dashboard/scan" },
  ],
  institution: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "networks", labelKey: "networks", icon: "🌐", href: "/dashboard/networks" },
  ],
  certifier: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "entities", labelKey: "entities", icon: "🧑‍⚕️", href: "/dashboard/entities" },
  ],
  admin: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "entities", labelKey: "entities", icon: "🧑‍⚕️", href: "/dashboard/entities" },
    { id: "networks", labelKey: "networks", icon: "🌐", href: "/dashboard/networks" },
    { id: "kernel", labelKey: "kernel", icon: "⚙️", href: "/dashboard/kernel" },
    { id: "protocol", labelKey: "protocol", icon: "🔒", href: "/dashboard/protocol" },
  ],
};

export function DashboardSidebar({ role, walletAddress }: DashboardSidebarProps) {
  const t = useTranslations("dashboard.sidebar");
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = usePrivy();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveRole: UserRole = role ?? "patient";
  const links = LINKS_BY_ROLE[effectiveRole] ?? LINKS_BY_ROLE.patient;

  async function handleLogout() {
    sessionStorage.setItem("hp_logging_out", "true");
    await logout();
    clearDbUserCache();
    sessionStorage.removeItem("hp_upserted");
    sessionStorage.removeItem("hp_wallet_synced");
    sessionStorage.removeItem("hp_welcome_shown");
    sessionStorage.removeItem("hp_logging_out");
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
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-3 z-60 md:hidden neu-surface rounded-xl p-2.5"
        onClick={() => setMobileOpen(!mobileOpen)}
        type="button"
      >
        <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-55 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-56 h-screen flex-col border-r border-white/70 bg-[#F8F5F0] ${sidebarClasses} ${mobileOpen ? "flex translate-x-0" : "-translate-x-full md:translate-x-0"} transition-transform duration-200`}
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

        {/* Collapse button (desktop) */}
        <button
          className="hidden md:flex mx-3 mt-3 mb-1 items-center justify-center rounded-xl p-1.5 neu-surface hover:neu-pressed transition-all"
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="text-xs text-slate-500">{collapsed ? "→" : "←"}</span>
        </button>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <button
                key={link.id}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                  active
                    ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                    : "neu-surface hover:neu-pressed text-slate-600"
                }`}
                onClick={() => {
                  router.push(link.href);
                  setMobileOpen(false);
                }}
                type="button"
                title={t(link.labelKey)}
              >
                <span className="text-lg shrink-0">{link.icon}</span>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{t(link.labelKey)}</span>
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
            <span className="text-lg shrink-0">🚪</span>
            {!collapsed && (
              <span className="text-sm font-medium">{t("logout")}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
