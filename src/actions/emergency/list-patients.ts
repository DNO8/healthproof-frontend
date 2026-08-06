"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PatientOption {
  id: string;
  wallet_address: string;
  full_name: string | null;
  email: string | null;
}

async function handler(
  _data: unknown,
  _auth: AuthContext,
): Promise<PatientOption[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, wallet_address, full_name, email")
    .eq("role", "patient")
    .not("wallet_address", "is", null)
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("[listPatients] error:", error);
    return [];
  }

  return data as PatientOption[];
}

export const listPatients = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
