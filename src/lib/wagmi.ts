import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { avalanche, avalancheFuji } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [avalanche, avalancheFuji],
  transports: {
    [avalanche.id]: http(),
    [avalancheFuji.id]: http(),
  },
});
