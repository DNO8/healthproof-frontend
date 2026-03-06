import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain.types";
import { ROLES } from "@/types/domain.types";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleConfig?.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
              Profile Settings
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
              Complete your profile
            </h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Fill in your details to unlock the full HealthProof experience.
          Wallet connection and verification will be required for on-chain
          features.
        </p>

        <ProfileForm
          email={user.email ?? ""}
          fullName={(meta.full_name as string) ?? ""}
          role={role}
          roleLabel={roleConfig?.label ?? "User"}
          walletAddress={(meta.wallet_address as string) ?? ""}
        />
      </div>
    </main>
  );
}
