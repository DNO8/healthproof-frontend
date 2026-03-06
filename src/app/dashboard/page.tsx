import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/types/domain.types";
import type { UserRole } from "@/types/domain.types";
import { WelcomeToast } from "./WelcomeToast";
import { DashboardActions } from "./DashboardActions";
import { ProfileBanner } from "./ProfileBanner";

const ROLE_METRICS: Record<UserRole, { label: string; value: string }[]> = {
  patient: [
    { label: "My Documents", value: "0" },
    { label: "Active Permissions", value: "0" },
    { label: "Verifications", value: "0" },
  ],
  laboratory: [
    { label: "Tests Performed", value: "0" },
    { label: "Results Uploaded", value: "0" },
    { label: "Pending Orders", value: "0" },
  ],
  medical_center: [
    { label: "Orders Issued", value: "0" },
    { label: "Verified Results", value: "0" },
    { label: "Active Patients", value: "0" },
  ],
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  patient:
    "Manage your medical documents, grant or revoke access permissions, and verify the integrity of your clinical records.",
  laboratory:
    "Perform tests linked to medical orders, upload verifiable results, and manage your laboratory workflow.",
  medical_center:
    "Issue medical orders, verify laboratory results, and manage your institution's clinical workflows.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const meta = user.user_metadata ?? {};
  const role = (meta.role as UserRole) ?? "patient";
  const roleConfig = ROLES.find((r) => r.key === role);
  const metrics = ROLE_METRICS[role];
  const description = ROLE_DESCRIPTIONS[role];

  const isProfileComplete = Boolean(meta.full_name && meta.wallet_address);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <WelcomeToast
        email={user.email ?? ""}
        roleLabel={roleConfig?.label ?? "User"}
      />

      {/* Header */}
      <div className="neu-shell border border-white/70 p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleConfig?.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
              {roleConfig?.label} Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Welcome back
            </h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">{user.email}</p>

        {/* Metrics */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div className="neu-surface rounded-2xl p-6" key={metric.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 neu-inset rounded-2xl p-6">
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>

      <ProfileBanner isComplete={isProfileComplete} />

      <DashboardActions role={role} userId={user.id} />
    </main>
  );
}
