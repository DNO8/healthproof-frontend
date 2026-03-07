"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getDbUser(privyId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, wallet_address, full_name, is_verified, created_at")
    .eq("id", privyId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    email: data.email as string,
    role: (data.role as string).toLowerCase(),
    wallet_address: data.wallet_address as string | null,
    full_name: data.full_name as string | null,
    is_verified: data.is_verified as boolean,
    created_at: data.created_at as string,
  };
}
