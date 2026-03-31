"use server";

import { createPublicClient, http } from "viem";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import { ROLE_TO_CONTRACT, CONTRACT_TO_ROLE, type UserRole } from "@/types/domain.types";

// ─── Rate-limited RPC batch helper ───
// Queries on-chain role for each wallet with concurrency control.

const RPC_CONCURRENCY = 4;
const RPC_DELAY_MS = 80;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getPublicClient() {
  return createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
}

async function getOnChainRole(
  publicClient: ReturnType<typeof getPublicClient>,
  wallet: string,
): Promise<{ wallet: string; role: number | null; verified: boolean }> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "entities",
      args: [wallet as `0x${string}`],
    });

    const [, role, , , verified] = result as [
      string,
      number,
      string,
      string,
      boolean,
    ];

    return { wallet, role, verified };
  } catch {
    return { wallet, role: null, verified: false };
  }
}

export interface FilteredUserOption {
  id: string;
  wallet_address: string;
  full_name: string | null;
  email: string | null;
  onChainRole: UserRole | null;
  verified: boolean;
}

export async function listUsersByOnChainRole(
  filterRole?: UserRole,
  excludeWallet?: string,
): Promise<FilteredUserOption[]> {
  const supabase = createAdminClient();

  // 1. Fetch all users from DB that have a wallet
  let query = supabase
    .from("users")
    .select("id, wallet_address, full_name, email")
    .not("wallet_address", "is", null)
    .order("full_name", { ascending: true });

  if (excludeWallet) {
    query = query.neq("wallet_address", excludeWallet.toLowerCase());
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[listUsersByOnChainRole] DB error:", error);
    return [];
  }

  const users = data as {
    id: string;
    wallet_address: string;
    full_name: string | null;
    email: string | null;
  }[];

  if (users.length === 0) return [];

  // 2. Query on-chain role for each user with rate limiting
  const publicClient = getPublicClient();
  const results: FilteredUserOption[] = [];

  // Process in batches of RPC_CONCURRENCY
  for (let i = 0; i < users.length; i += RPC_CONCURRENCY) {
    const batch = users.slice(i, i + RPC_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map((u) => getOnChainRole(publicClient, u.wallet_address)),
    );

    for (let j = 0; j < batch.length; j++) {
      const user = batch[j];
      const chain = batchResults[j];
      const resolvedRole =
        chain.role !== null ? (CONTRACT_TO_ROLE[chain.role] ?? null) : null;

      results.push({
        id: user.id,
        wallet_address: user.wallet_address,
        full_name: user.full_name,
        email: user.email,
        onChainRole: resolvedRole,
        verified: chain.verified,
      });
    }

    // Rate limit between batches
    if (i + RPC_CONCURRENCY < users.length) {
      await delay(RPC_DELAY_MS);
    }
  }

  // 3. Filter by role if specified
  if (filterRole) {
    return results.filter((u) => u.onChainRole === filterRole);
  }

  return results;
}

