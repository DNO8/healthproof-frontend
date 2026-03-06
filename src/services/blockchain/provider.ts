import { env } from "@/lib/env";
import type { ChainConfig } from "@/types/blockchain.types";

export const chainConfig: ChainConfig = {
  chainId: env.CHAIN_ID,
  rpcUrl: env.RPC_URL,
  name: "HealthProof L1",
  explorerUrl: "",
};

// Placeholder — will be initialized with ethers.JsonRpcProvider when RPC is available
export function getProvider() {
  if (!chainConfig.rpcUrl) {
    console.warn(
      "[HealthProof] RPC URL not configured. Blockchain features disabled.",
    );
    return null;
  }

  // TODO: return new ethers.JsonRpcProvider(chainConfig.rpcUrl)
  return null;
}
