"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { env } from "@/lib/env";

const HYGIEIA_CHAIN_ID = `0x${env.CHAIN_ID.toString(16)}`;

const HYGIEIA_NETWORK_PARAMS = {
  chainId: HYGIEIA_CHAIN_ID,
  chainName: "Hygieia",
  nativeCurrency: {
    name: "HVE",
    symbol: "HVE",
    decimals: 18,
  },
  rpcUrls: [
    typeof window !== "undefined"
      ? `${window.location.origin}/api/rpc`
      : env.RPC_URL,
  ],
  blockExplorerUrls: [] as string[],
} as const;

/**
 * Auto-switches external wallets (MetaMask, Core, etc.) to the Hygieia network.
 * For embedded Privy wallets this is not needed — they use the wagmiConfig chain.
 */
export function useSwitchToHygieia() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || attemptedRef.current) return;

    const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
    if (!externalWallet) return;

    attemptedRef.current = true;

    (async () => {
      try {
        const provider = await externalWallet.getEthereumProvider();
        const currentChainId: string = await provider.request({
          method: "eth_chainId",
        });

        if (currentChainId.toLowerCase() === HYGIEIA_CHAIN_ID.toLowerCase()) {
          return;
        }

        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HYGIEIA_CHAIN_ID }],
          });
        } catch (switchError) {
          const code = (switchError as { code?: number }).code;
          if (code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [HYGIEIA_NETWORK_PARAMS],
            });
          } else {
            throw switchError;
          }
        }
      } catch (err) {
        console.warn("[useSwitchToHygieia] Could not switch network:", err);
        attemptedRef.current = false;
      }
    })();
  }, [ready, authenticated, wallets]);
}
