"use client";

import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { useDbUser } from "@/hooks/auth/useDbUser";
import { useOnChainRole } from "@/hooks/healthcare-networks/useOnChainRole";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useDashboardStats } from "@/hooks/dashboard/useDashboardStats";
import { WelcomeToast } from "../WelcomeToast";
import { ProfileBanner } from "../ProfileBanner";
import { DashboardActions } from "../DashboardActions";
import { usePrivy } from "@privy-io/react-auth";
import { ROLE_ICONS } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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

const ROLE_DESC_KEYS: Partial<Record<UserRole, "patient" | "laboratory" | "doctor">> = {
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
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const { user } = usePrivy();
  const { dbUser } = useDbUser();
  const walletAddress = useWalletAddress();
  const { role, loading: roleLoading } = useOnChainRole(walletAddress);
  const { stats, loading: statsLoading } = useDashboardStats(walletAddress, role);

  if (roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  const email = user?.email?.address ?? user?.google?.email ?? dbUser?.email ?? "";

  // Fallback chain: on-chain role → DB role → localStorage intended role → patient
  const intendedRole = typeof window !== "undefined"
    ? (localStorage.getItem("hp_intended_role") as UserRole | null)
    : null;
  const dbRole = dbUser?.role?.toLowerCase() as UserRole | null;
  const effectiveRole: UserRole = role ?? dbRole ?? intendedRole ?? "patient";
  const roleConfig = ROLES.find((r) => r.key === effectiveRole);
  const metricKeys = ROLE_METRIC_KEYS[effectiveRole] ?? ROLE_METRIC_KEYS.patient!;
  const descKey = ROLE_DESC_KEYS[effectiveRole] ?? "patient";
  const roleLabel = tRoles(effectiveRole === "lab" ? "laboratory" : effectiveRole);

  const displayName = dbUser?.full_name ?? user?.google?.name ?? null;
  const isProfileComplete = Boolean(displayName && walletAddress);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <WelcomeToast email={email} roleLabel={roleLabel} />

      {/* Header */}
      <div className="neu-shell border border-white/70 p-8 sm:p-10">
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
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
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
                  stats[key] ?? 0
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

      <ProfileBanner isComplete={isProfileComplete} />

      <DashboardActions role={effectiveRole} />
    </main>
  );
}
