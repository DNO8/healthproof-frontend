"use server";

import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { env } from "@/lib/env";

export interface RpcHealthResult {
  healthy: boolean;
  blockNumber?: number;
  error?: string;
}

export async function checkRpcHealth(): Promise<RpcHealthResult> {
  const rpcUrl = env.RPC_URL;
  if (!rpcUrl) {
    return { healthy: false, error: "RPC_URL not configured" };
  }

  // Retry up to 3 times with backoff for transient network issues
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const client = createPublicClient({
        chain: HEALTHPROOF_CHAIN,
        transport: http(rpcUrl, { timeout: 15000 }),
      });

      const blockNumber = await client.getBlockNumber();
      return { healthy: true, blockNumber: Number(blockNumber) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 2) {
        return { healthy: false, error: message };
      }
      // Wait 1s before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { healthy: false, error: "Unknown RPC error" };
}
