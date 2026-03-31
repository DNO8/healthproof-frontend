import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { HEALTHPROOF_CHAIN } from "./contracts";
import { env } from "./env";

export const wagmiConfig = createConfig({
  chains: [HEALTHPROOF_CHAIN],
  transports: {
    [HEALTHPROOF_CHAIN.id]: http(env.RPC_URL),
  },
});
