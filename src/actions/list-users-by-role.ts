"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface UserOption {
  id: string;
  wallet_address: string;
  full_name: string | null;
  email: string | null;
}

export async function listAllUsers(
  excludeId?: string,
): Promise<UserOption[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("id, wallet_address, full_name, email")
    .order("full_name", { ascending: true });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("listAllUsers error:", error);
    return [];
  }

  return data as UserOption[];
}
