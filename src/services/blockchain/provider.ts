import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";

export const publicClient = createPublicClient({
  chain: HEALTHPROOF_CHAIN,
  transport: http(),
});
