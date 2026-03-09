"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function upsertUser(data: {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
}): Promise<
  | { success: true }
  | { success?: undefined; error: string; code?: string }
> {
  const supabase = createAdminClient();

  // 1. Check if this Privy ID already has a row
  const { data: existingById } = await supabase
    .from("users")
    .select("id, full_name, wallet_address")
    .eq("id", data.id)
    .single();

  if (existingById) {
    const updates: Record<string, string> = {};
    if (data.email) updates.email = data.email;
    if (!existingById.full_name && data.full_name)
      updates.full_name = data.full_name;
    if (!existingById.wallet_address && data.wallet_address)
      updates.wallet_address = data.wallet_address.toLowerCase();

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

  // 2. Check if an account with this email already exists under a different Privy ID
  if (data.email) {
    const { data: existingByEmail } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", data.email)
      .single();

    if (existingByEmail) {
      return {
        error: "ACCOUNT_EXISTS",
        code: "ACCOUNT_EXISTS",
      };
    }
  }

  // 3. New user — insert (role lives on-chain via IdentityRegistry)
  const { error } = await supabase.from("users").insert({
    id: data.id,
    email: data.email,
    wallet_address: data.wallet_address?.toLowerCase() ?? "",
    full_name: data.full_name,
  });

  if (error) {
    console.error("upsertUser insert error:", error);
    return { error: error.message };
  }

  return { success: true };
}
