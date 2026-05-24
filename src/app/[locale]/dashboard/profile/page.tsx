"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { useDbUser } from "@/hooks/auth/useDbUser";
import { useOnChainRole } from "@/hooks/healthcare-networks/useOnChainRole";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { getEntityOnChain } from "@/actions/healthcare-networks/register-entity-onchain";
import { ProfileForm } from "./ProfileForm";
import { ROLE_ICONS } from "@/lib/icons";

const ROLE_LABEL_KEYS: Partial<
  Record<UserRole, "patient" | "laboratory" | "doctor">
> = {
  patient: "patient",
  lab: "laboratory",
  doctor: "doctor",
};

export default function ProfilePage() {
  const t = useTranslations("dashboard.profile");
  const tRoles = useTranslations("roles");
  const tDash = useTranslations("dashboard");
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { dbUser } = useDbUser();
  const walletAddress = useWalletAddress() ?? "";

  const { role: onChainRole } = useOnChainRole(walletAddress || null);
  const [entity, setEntity] = useState<{ specialty: string; institution: string } | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      const loggingOut = sessionStorage.getItem("hp_logging_out");
      if (!loggingOut) router.replace("/auth");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!walletAddress) return;
    getEntityOnChain({ wallet: walletAddress }).then((res) => {
      if (res.success && res.data) {
        setEntity({ specialty: res.data.specialty, institution: res.data.institution });
      }
    });
  }, [walletAddress]);

  if (!ready || !authenticated || !user) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p className="text-sm text-slate-400">{tDash("loading")}</p>
      </main>
    );
  }

  const email =
    user.email?.address ?? user.google?.email ?? dbUser?.email ?? "";

  // Fallback chain: on-chain role → DB role → localStorage intended role → patient
  const intendedRole = typeof window !== "undefined"
    ? (localStorage.getItem("hp_intended_role") as UserRole | null)
    : null;
  const dbRole = dbUser?.role?.toLowerCase() as UserRole | null;
  const effectiveRole: UserRole = onChainRole ?? dbRole ?? intendedRole ?? "patient";
  const roleConfig = ROLES.find((r) => r.key === effectiveRole);
  const roleLabel = tRoles(ROLE_LABEL_KEYS[effectiveRole] ?? "patient");
  const fullName = dbUser?.full_name ?? user.google?.name ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = ROLE_ICONS[effectiveRole];
            return Icon ? <Icon className="h-6 w-6 text-sky-600" /> : null;
          })()}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
              {t("heading")}
            </h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500">{t("intro")}</p>

        <ProfileForm
          userId={user.id}
          email={email}
          fullName={fullName}
          role={effectiveRole}
          roleLabel={roleLabel}
          walletAddress={walletAddress}
          specialty={entity?.specialty ?? ""}
          institution={entity?.institution ?? ""}
        />
      </div>
    </main>
  );
}
