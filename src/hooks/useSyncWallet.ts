"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { updateWalletAddress } from "@/actions/update-wallet";
import { clearDbUserCache } from "@/hooks/useDbUser";

const SYNCED_KEY = "hp_wallet_synced";

export function useSyncWallet() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const syncedRef = useRef(false);
  const creatingRef = useRef(false);

  const userId = user?.id;

  const hasEmbeddedWallet = wallets.some((w) => w.walletClientType === "privy");

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

  // Effect 1: Create embedded wallet if user doesn't have one
  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (hasEmbeddedWallet || hasLinkedWallet) return;
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
    hasLinkedWallet,
    createWallet,
  ]);

  // Effect 2: Once embedded wallet exists, sync its address to Supabase
  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (syncedRef.current) return;

    const alreadySynced = sessionStorage.getItem(SYNCED_KEY);
    if (alreadySynced === userId) return;

    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded?.address) return;

    syncedRef.current = true;
    syncToSupabase(embedded.address);
  }, [ready, authenticated, userId, wallets, syncToSupabase]);
}
