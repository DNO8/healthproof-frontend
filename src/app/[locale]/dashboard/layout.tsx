"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { useOnChainRole } from "@/hooks/useOnChainRole";
import { useDbUser } from "@/hooks/useDbUser";
import type { UserRole } from "@/types/domain.types";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileSheet } from "@/components/layout/MobileSheet";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { dbUser, loading: dbLoading } = useDbUser();
  const walletAddress = useWalletAddress();
  const { role: onChainRole, loading: roleLoading } = useOnChainRole(walletAddress);

  // Fallback chain: on-chain role → DB role → localStorage intended role → patient
  const effectiveRole: UserRole = useMemo(() => {
    const intended = typeof window !== "undefined"
      ? (localStorage.getItem("hp_intended_role") as UserRole | null)
      : null;
    const dbRole = dbUser?.role?.toLowerCase() as UserRole | null;
    return onChainRole ?? dbRole ?? intended ?? "patient";
  }, [onChainRole, dbUser?.role]);

  useEffect(() => {
    if (ready && !authenticated) {
      const loggingOut = sessionStorage.getItem("hp_logging_out");
      if (!loggingOut) router.replace("/auth");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated || dbLoading || roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
          Loading…
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar role={effectiveRole} walletAddress={walletAddress} />
      <MobileSheet role={effectiveRole} walletAddress={walletAddress} />
      <main className="flex-1 md:ml-64 min-h-screen p-4 sm:p-6">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}
