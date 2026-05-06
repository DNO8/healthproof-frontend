"use server";

import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";

export interface RpcHealthResult {
  healthy: boolean;
  blockNumber?: number;
  error?: string;
}

export async function checkRpcHealth(): Promise<RpcHealthResult> {
  try {
    const client = createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(undefined, { timeout: 5000 }),
    });

    const blockNumber = await client.getBlockNumber();
    return { healthy: true, blockNumber: Number(blockNumber) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { healthy: false, error: message };
  }
}
