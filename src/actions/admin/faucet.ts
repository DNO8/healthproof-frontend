"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AuthContext } from "@/lib/auth/with-auth";
import { getDeployerPrivateKey, withAuth } from "@/lib/auth/with-auth";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";

const FAUCET_AMOUNT = BigInt(1e18); // 1 HVE
const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const FAUCET_KEY = "hp_faucet_last_request";

// Type extension for globalThis
declare global {
  var hp_faucet_last_request: Record<string, number> | undefined;
}

async function getRelayerClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    walletClient: createWalletClient({
      account,
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    account,
  };
}

async function faucetHandler(
  data: { wallet: string },
  _auth: AuthContext,
): Promise<{ txHash: string; amount: string }> {
  const { publicClient, walletClient } = await getRelayerClients();

  // Check if user has enough balance already
  const balance = await publicClient.getBalance({
    address: data.wallet as `0x${string}`,
  });
  if (balance >= BigInt(5e18)) {
    throw new Error("Wallet already has sufficient balance (>= 5 HVE)");
  }

  // Check cooldown (simple in-memory check via localStorage key pattern)
  // For production, use Redis or database
  const lastRequest = (globalThis[FAUCET_KEY] as Record<string, number>) || {};
  const now = Date.now();
  const lastTime = lastRequest[data.wallet.toLowerCase()] || 0;
  if (now - lastTime < FAUCET_COOLDOWN_MS) {
    const hoursLeft = Math.ceil(
      (FAUCET_COOLDOWN_MS - (now - lastTime)) / (60 * 60 * 1000),
    );
    throw new Error(`Faucet cooldown: please wait ${hoursLeft} hours`);
  }

  // Send tokens
  const txHash = await walletClient.sendTransaction({
    to: data.wallet as `0x${string}`,
    value: FAUCET_AMOUNT,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Update cooldown
  if (!globalThis[FAUCET_KEY]) {
    globalThis[FAUCET_KEY] = {};
  }
  globalThis[FAUCET_KEY][data.wallet.toLowerCase()] = now;

  return {
    txHash,
    amount: FAUCET_AMOUNT.toString(),
  };
}

export const requestFaucet = withAuth(faucetHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 3 },
});
