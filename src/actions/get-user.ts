"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// DB role value → frontend UserRole
const DB_TO_ROLE: Record<string, string> = {
  PATIENT: "patient",
  LAB: "laboratory",
  DOCTOR: "medical_center",
  ADMIN: "patient",
};

export async function getDbUser(privyId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, role, wallet_address, full_name, is_verified, created_at, public_key",
    )
    .eq("id", privyId)
    .single();

  if (error || !data) {
    return null;
  }

  const dbRole = (data.role as string).toUpperCase();

  return {
    id: data.id as string,
    email: data.email as string,
    role: DB_TO_ROLE[dbRole] ?? "patient",
    wallet_address: data.wallet_address as string | null,
    full_name: data.full_name as string | null,
    is_verified: data.is_verified as boolean,
    created_at: data.created_at as string,
    public_key: (data.public_key as string | null) ?? null,
  };
}
