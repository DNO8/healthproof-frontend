"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/domain.types";

// Frontend role → DB CHECK constraint value
const ROLE_TO_DB: Record<UserRole, string> = {
  patient: "PATIENT",
  laboratory: "LAB",
  medical_center: "DOCTOR",
};

export async function upsertUser(data: {
  id: string;
  email: string;
  role: UserRole;
  roleExplicit: boolean;
  wallet_address: string | null;
  full_name: string | null;
}) {
  const supabase = createAdminClient();

  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id, role, full_name, wallet_address")
    .eq("id", data.id)
    .single();

  if (existing) {
    const updates: Record<string, string | boolean> = {};
    if (data.email) updates.email = data.email;
    // If the user explicitly selected a role during signup, always apply it
    if (data.roleExplicit) updates.role = ROLE_TO_DB[data.role];
    if (!existing.full_name && data.full_name)
      updates.full_name = data.full_name;
    if (!existing.wallet_address && data.wallet_address)
      updates.wallet_address = data.wallet_address;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", data.id);

      if (error) {
        console.error("upsertUser update error:", error);
        return { error: error.message };
      }
    }

    return { success: true };
  }

  // New user — insert with all fields
  const { error } = await supabase.from("users").insert({
    id: data.id,
    email: data.email,
    role: ROLE_TO_DB[data.role],
    wallet_address: data.wallet_address ?? "",
    full_name: data.full_name,
    is_verified: false,
  });

  if (error) {
    console.error("upsertUser insert error:", error);
    return { error: error.message };
  }

  return { success: true };
}
