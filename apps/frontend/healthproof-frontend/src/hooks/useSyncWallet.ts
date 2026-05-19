"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { updateWalletAddress } from "@/actions/update-wallet";
import { clearDbUserCache } from "@/hooks/useDbUser";

const SYNCED_KEY = "hp_wallet_synced";

function resolveActiveAddress(
  wallets: ReturnType<typeof useWallets>["wallets"],
): string | null {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (embedded?.address) return embedded.address;

  const external = wallets.find(
    (w) => w.walletClientType !== "privy" && w.address,
  );
  return external?.address ?? null;
}

export function useSyncWallet() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const syncedRef = useRef(false);
  const creatingRef = useRef(false);

  const userId = user?.id;

  const hasEmbeddedWallet = wallets.some((w) => w.walletClientType === "privy");
  const hasExternalWallet = wallets.some((w) => w.walletClientType !== "privy");

  const hasLinkedWallet =
    user?.linkedAccounts?.some((a) => a.type === "wallet") ?? false;

  const syncToSupabase = useCallback(
    async (address: string) => {
      if (!userId) return;
      try {
        const result = await updateWalletAddress({
          id: userId,
          wallet_address: address,
        });
        if (result.success) {
          sessionStorage.setItem(SYNCED_KEY, userId);
          clearDbUserCache();
          console.log("[useSyncWallet] Synced wallet address:", address);
        } else if (result.code === 409) {
          // Wallet change blocked by on-chain role — stop retrying
          console.warn("[useSyncWallet] Wallet change blocked:", result.error);
          sessionStorage.setItem(SYNCED_KEY, userId);
          syncedRef.current = false;
        } else {
          console.error("[useSyncWallet] Sync failed:", result.error);
          syncedRef.current = false;
        }
      } catch (err) {
        console.error("[useSyncWallet] Sync error:", err);
        syncedRef.current = false;
      }
    },
    [userId],
  );

  // Effect 1: Create embedded wallet only if user has no wallet at all
  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (hasEmbeddedWallet || hasExternalWallet || hasLinkedWallet) return;
    if (creatingRef.current) return;

    creatingRef.current = true;

    createWallet().catch((err) => {
      console.error("[useSyncWallet] Failed to create wallet:", err);
      creatingRef.current = false;
    });
  }, [
    ready,
    authenticated,
    userId,
    hasEmbeddedWallet,
    hasExternalWallet,
    hasLinkedWallet,
    createWallet,
  ]);

  // Effect 2: Sync best available wallet address to Supabase
  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (syncedRef.current) return;

    const alreadySynced = sessionStorage.getItem(SYNCED_KEY);
    if (alreadySynced === userId) return;

    const address = resolveActiveAddress(wallets);
    if (!address) return;

    syncedRef.current = true;
    syncToSupabase(address);
  }, [ready, authenticated, userId, wallets, syncToSupabase]);
}
