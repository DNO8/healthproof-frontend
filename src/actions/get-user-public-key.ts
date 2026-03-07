"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getUserPublicKey(
  userId: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("public_key")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return (data.public_key as string | null) ?? null;
}
