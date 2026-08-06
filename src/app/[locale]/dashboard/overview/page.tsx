"use client";

import { usePrivy } from "@privy-io/react-auth";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  FolderOpen,
  Globe,
  HeartPulse,
  LayoutDashboard,
  Lock,
  Mail,
  ScanLine,
  Settings,
  Share2,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useDbUser } from "@/hooks/auth/useDbUser";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useDashboardStats } from "@/hooks/dashboard/useDashboardStats";
import { useOnChainRole } from "@/hooks/healthcare-networks/useOnChainRole";
import { useOnboardingTour } from "@/hooks/onboarding/useOnboardingTour";
import { useRouter } from "@/i18n/navigation";
import { ROLE_ICONS } from "@/lib/icons";
import { LINKS_BY_ROLE } from "@/lib/navigation";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { DashboardActions } from "../DashboardActions";
import { ProfileBanner } from "../ProfileBanner";
import { WelcomeToast } from "../WelcomeToast";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
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

type MetricKey =
  | "myDocuments"
  | "activePermissions"
  | "verifications"
  | "testsPerformed"
  | "resultsUploaded"
  | "pendingOrders"
  | "ordersIssued"
  | "verifiedResults"
  | "activePatients";

const ROLE_METRIC_KEYS: Partial<Record<UserRole, MetricKey[]>> = {
  patient: ["myDocuments", "activePermissions", "verifications"],
  lab: ["testsPerformed", "resultsUploaded", "pendingOrders"],
  doctor: ["ordersIssued", "verifiedResults", "activePatients"],
  admin: ["ordersIssued", "verifiedResults", "activePatients"],
};

const ROLE_DESC_KEYS: Partial<
  Record<UserRole, "patient" | "laboratory" | "doctor">
> = {
  patient: "patient",
  lab: "laboratory",
  doctor: "doctor",
  admin: "doctor",
};

const METRIC_ROUTES: Record<MetricKey, string> = {
  myDocuments: "/dashboard/documents",
  activePermissions: "/dashboard/permissions",
  verifications: "/dashboard/scan",
  testsPerformed: "/dashboard/lab-orders",
  resultsUploaded: "/dashboard/upload",
  pendingOrders: "/dashboard/lab-orders",
  ordersIssued: "/dashboard/orders",
  verifiedResults: "/dashboard/shared",
  activePatients: "/dashboard/episodes",
};

export default function OverviewPage() {
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("dashboard.sidebar");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const { user } = usePrivy();
  const { dbUser } = useDbUser();
  const walletAddress = useWalletAddress();
  const { role, loading: roleLoading } = useOnChainRole(walletAddress);
  const { stats, loading: statsLoading } = useDashboardStats(
    walletAddress,
    role,
  );
  useOnboardingTour(role, user?.id ?? null);

  if (roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  const email =
    user?.email?.address ?? user?.google?.email ?? dbUser?.email ?? "";

  // Fallback chain: on-chain role → DB role → localStorage intended role → patient
  const intendedRole =
    typeof window !== "undefined"
      ? (localStorage.getItem("hp_intended_role") as UserRole | null)
      : null;
  const dbRole = dbUser?.role?.toLowerCase() as UserRole | null;
  const effectiveRole: UserRole = role ?? dbRole ?? intendedRole ?? "patient";
  const _roleConfig = ROLES.find((r) => r.key === effectiveRole);
  const metricKeys =
    ROLE_METRIC_KEYS[effectiveRole] ?? ROLE_METRIC_KEYS.patient ?? [];
  const descKey = ROLE_DESC_KEYS[effectiveRole] ?? "patient";
  const roleLabel = tRoles(
    effectiveRole === "lab" ? "laboratory" : effectiveRole,
  );

  const displayName = dbUser?.full_name ?? user?.google?.name ?? null;
  const isProfileComplete = Boolean(displayName && walletAddress);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <WelcomeToast email={email} roleLabel={roleLabel} />

      {/* Header */}
      <div
        data-tour="role-header"
        className="neu-shell border border-white/70 p-8 sm:p-10"
      >
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = ROLE_ICONS[effectiveRole];
            return Icon ? <Icon className="h-6 w-6 text-sky-600" /> : null;
          })()}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
              {roleLabel} Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              {t("welcomeBack")}
            </h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">{email}</p>

        {walletAddress ? (
          <p className="mt-1 text-xs font-mono text-slate-400">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
            {t("walletProvisioning")}
          </p>
        )}

        {/* Metrics */}
        <div data-tour="metrics" className="mt-8 grid gap-5 sm:grid-cols-3">
          {metricKeys.map((key) => (
            <button
              className="neu-surface hover:neu-pressed cursor-pointer rounded-2xl p-6 text-left transition-all duration-200"
              key={key}
              onClick={() => router.push(METRIC_ROUTES[key])}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t(`metrics.${key}`)}
                </p>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-sky-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {statsLoading ? (
                  <span className="inline-block h-6 w-10 animate-pulse rounded-md bg-slate-200" />
                ) : (
                  (stats[key] ?? 0)
                )}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 neu-inset rounded-2xl p-6">
          <p className="text-sm text-slate-600">
            {t(`descriptions.${descKey}`)}
          </p>
        </div>
      </div>

      {/* Quick Navigation — replaces desktop sidebar */}
      <div data-tour="quick-nav" className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">
          {t("quickNavTitle") ?? "Navegación"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(LINKS_BY_ROLE[effectiveRole] ?? LINKS_BY_ROLE.patient)
            .filter((link) => link.id !== "overview")
            .map((link) => {
              const Icon = NAV_ICON_MAP[link.icon];
              return (
                <button
                  key={link.id}
                  className="neu-surface hover:neu-pressed flex cursor-pointer items-center gap-3 rounded-2xl p-5 text-left transition-all duration-200"
                  onClick={() => router.push(link.href)}
                  type="button"
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0 text-sky-600" />}
                  <span className="text-sm font-semibold text-slate-800">
                    {tSidebar(link.labelKey)}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      <ProfileBanner isComplete={isProfileComplete} />

      <DashboardActions role={effectiveRole} />
    </main>
  );
}
