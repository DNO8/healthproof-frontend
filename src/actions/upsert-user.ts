"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/domain.types";

export async function upsertUser(data: {
  id: string;
  email: string;
  role: UserRole;
  wallet_address: string | null;
  full_name: string | null;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("users").upsert(
    {
      id: data.id,
      email: data.email,
      role: data.role.toUpperCase(),
      wallet_address: data.wallet_address ?? "",
      full_name: data.full_name,
      is_verified: false,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("upsertUser error:", error);
    return { error: error.message };
  }

  return { success: true };
}
