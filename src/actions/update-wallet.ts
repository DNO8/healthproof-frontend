"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

const publicClient = createPublicClient({
  chain: HEALTHPROOF_CHAIN,
  transport: http(),
});

export async function updateWalletAddress(data: {
  id: string;
  wallet_address: string;
}) {
  const supabase = createAdminClient();

  // 1. Check current wallet in DB
  const { data: existingUser } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", data.id)
    .single();

  const currentWallet = existingUser?.wallet_address;
  const newWallet = data.wallet_address.toLowerCase();

  // 2. If current wallet is already registered on-chain with a role, BLOCK overwrite
  if (currentWallet && currentWallet.toLowerCase() !== newWallet) {
    try {
      const entity = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "getEntity",
        args: [currentWallet.toLowerCase()],
      }) as { role: number; isActive: boolean };

      if (entity.role !== 0) {
        console.warn("[updateWalletAddress] Blocked: current wallet", currentWallet, "has on-chain role", entity.role);
        return {
          error: "Cannot change wallet: your current wallet is already registered on-chain. Contact support.",
          code: 409,
        };
      }
    } catch (err) {
      console.error("[updateWalletAddress] On-chain check failed:", err);
      // Allow update if on-chain check fails (network issue)
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ wallet_address: newWallet })
    .eq("id", data.id);

  if (error) {
    console.error("updateWalletAddress error:", error);
    return { error: error.message };
  }

  return { success: true };
}
