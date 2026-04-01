"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { useDbUser } from "@/hooks/useDbUser";
import { useOnChainRole } from "@/hooks/useOnChainRole";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DashboardActions } from "./DashboardActions";
import { ProfileBanner } from "./ProfileBanner";
import { WelcomeToast } from "./WelcomeToast";

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
};

const ROLE_DESC_KEYS: Partial<
  Record<UserRole, "patient" | "laboratory" | "medicalCenter">
> = {
  patient: "patient",
  lab: "laboratory",
  doctor: "medicalCenter",
};

const ROLE_LABEL_KEYS: Partial<
  Record<UserRole, "patient" | "laboratory" | "medicalCenter">
> = {
  patient: "patient",
  lab: "laboratory",
  doctor: "medicalCenter",
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { dbUser, loading: dbLoading } = useDbUser();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress =
    dbUser?.wallet_address || embeddedWallet?.address || null;

  const { role, loading: roleLoading } = useOnChainRole(walletAddress);
  const { stats, loading: statsLoading } = useDashboardStats(walletAddress, role);

  useEffect(() => {
    if (ready && !authenticated) {
      const loggingOut = sessionStorage.getItem("hp_logging_out");
      if (!loggingOut) router.replace("/auth");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated || !user || dbLoading || roleLoading) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  const email =
    user.email?.address ?? user.google?.email ?? dbUser?.email ?? "";
  const effectiveRole: UserRole = role ?? "patient";
  const roleConfig = ROLES.find((r) => r.key === effectiveRole);
  const metricKeys = ROLE_METRIC_KEYS[effectiveRole] ?? ROLE_METRIC_KEYS.patient!;
  const descKey = ROLE_DESC_KEYS[effectiveRole] ?? "patient";
  const roleLabel = tRoles(ROLE_LABEL_KEYS[effectiveRole] ?? "patient");

  const displayName = dbUser?.full_name ?? null;
  const isProfileComplete = Boolean(displayName && walletAddress);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <WelcomeToast email={email} roleLabel={roleLabel} />

      {/* Header */}
      <div className="neu-shell border border-white/70 p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleConfig?.icon}</span>
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
            <div className="neu-surface rounded-2xl p-6" key={key}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t(`metrics.${key}`)}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {statsLoading ? (
                  <span className="inline-block h-6 w-10 animate-pulse rounded-md bg-slate-200" />
                ) : (
                  stats[key] ?? 0
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 neu-inset rounded-2xl p-6">
          <p className="text-sm text-slate-600">
            {t(`descriptions.${descKey}`)}
          </p>
        </div>
      </div>

      <ProfileBanner isComplete={isProfileComplete} />

      <DashboardActions role={effectiveRole} userId={user.id} />
    </main>
  );
}
