"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export async function listUsersByRole(
  dbRole: string,
): Promise<UserOption[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", dbRole.toUpperCase())
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("listUsersByRole error:", error);
    return [];
  }

  return data as UserOption[];
}
