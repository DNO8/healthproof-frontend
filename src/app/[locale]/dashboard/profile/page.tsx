"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { useDbUser } from "@/hooks/useDbUser";
import { ProfileForm } from "./ProfileForm";

export default function ProfilePage() {
  const t = useTranslations("dashboard.profile");
  const tRoles = useTranslations("roles");
  const tDash = useTranslations("dashboard");
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { dbUser } = useDbUser();

  useEffect(() => {
    if (ready && !authenticated) {
      const loggingOut = sessionStorage.getItem("hp_logging_out");
      if (!loggingOut) router.replace("/auth");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated || !user) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p className="text-sm text-slate-400">{tDash("loading")}</p>
      </main>
    );
  }

  const email =
    user.email?.address ?? user.google?.email ?? dbUser?.email ?? "";
  const role: UserRole = dbUser?.role ?? "patient";
  const roleConfig = ROLES.find((r) => r.key === role);

  const roleLabel =
    role === "patient"
      ? tRoles("patient")
      : role === "laboratory"
        ? tRoles("laboratory")
        : tRoles("medicalCenter");

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  // Fallback: extract from user.linkedAccounts (available before useWallets resolves)
  const linkedWalletAddress = (() => {
    const accounts = user?.linkedAccounts;
    if (!accounts) return null;
    for (const a of accounts) {
      const raw = a as unknown as {
        type: string;
        walletClientType?: string;
        address?: string;
      };
      if (
        raw.type === "wallet" &&
        raw.walletClientType === "privy" &&
        raw.address
      ) {
        return raw.address;
      }
    }
    return null;
  })();

  const walletAddress =
    dbUser?.wallet_address ||
    embeddedWallet?.address ||
    linkedWalletAddress ||
    "";

  const fullName = dbUser?.full_name ?? user.google?.name ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleConfig?.icon}</span>
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
          role={role}
          roleLabel={roleLabel}
          walletAddress={walletAddress}
        />
      </div>
    </main>
  );
}
