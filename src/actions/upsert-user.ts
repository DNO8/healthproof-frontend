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
}): Promise<
  | { success: true; existingRole?: string }
  | { success?: undefined; error: string; code?: string }
> {
  const supabase = createAdminClient();

  // 1. Check if this Privy ID already has a row
  const { data: existingById } = await supabase
    .from("users")
    .select("id, role, full_name, wallet_address")
    .eq("id", data.id)
    .single();

  if (existingById) {
    // Existing user by Privy ID — NEVER overwrite role.
    // Only fill in missing non-role fields.
    const updates: Record<string, string | boolean> = {};
    if (data.email) updates.email = data.email;
    if (!existingById.full_name && data.full_name)
      updates.full_name = data.full_name;
    if (!existingById.wallet_address && data.wallet_address)
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

    return { success: true, existingRole: existingById.role as string };
  }

  // 2. Check if an account with this email already exists under a different Privy ID
  if (data.email) {
    const { data: existingByEmail } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", data.email)
      .single();

    if (existingByEmail) {
      return {
        error: "ACCOUNT_EXISTS",
        code: "ACCOUNT_EXISTS",
      };
    }
  }

  // 3. New user — insert with all fields
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
