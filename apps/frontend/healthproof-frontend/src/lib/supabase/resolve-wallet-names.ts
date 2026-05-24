"use server";

import { createAdminClient } from "./admin";

export async function resolveWalletNames(
  wallets: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = [...new Set(wallets.map((w) => w.toLowerCase()))].filter(
    (w) => w && w !== "0x0000000000000000000000000000000000000000"
  );
  if (unique.length === 0) return map;

  const supabase = createAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select("wallet_address, full_name")
    .in("wallet_address", unique);

  if (users) {
    for (const u of users) {
      if (u.wallet_address) {
        map.set(u.wallet_address.toLowerCase(), (u.full_name as string) || null);
      }
    }
  }
  return map;
}
