"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

interface UpsertUserData {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
}

async function upsertUserHandler(
  data: UpsertUserData,
  auth: AuthContext
): Promise<{ success: true } | { error: string; code?: number }> {
  // Verify caller can only update their own record
  // Dev fallback: auth.userId is "dev-user" when Privy cookies are blocked on HTTP localhost
  const isDevFallback = process.env.NODE_ENV === "development" && auth.userId === "dev-user";
  if (!isDevFallback && data.id !== auth.userId) {
    return { error: "Unauthorized", code: 403 };
  }

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
        error: "An account with this email is already registered. Please sign in instead.",
        code: 409,
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

export const upsertUser = withAuth(upsertUserHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
