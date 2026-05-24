"use client";

import { useWallets } from "@privy-io/react-auth";
import { useDbUser } from "@/hooks/auth/useDbUser";

/**
 * Returns the best available wallet address for the current user.
 * Priority: embedded Privy wallet > external connected wallet > DB fallback.
 */
export function useWalletAddress(): string | null {
  const { wallets } = useWallets();
  const { dbUser } = useDbUser();

  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (embedded?.address) return embedded.address;

  const external = wallets.find(
    (w) => w.walletClientType !== "privy" && w.address,
  );
  if (external?.address) return external.address;

  return dbUser?.wallet_address ?? null;
}
