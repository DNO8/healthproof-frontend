import {
  createWalletClient,
  custom,
  type WalletClient,
  type EIP1193Provider,
} from "viem";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";

export async function getWalletClient(
  privyProvider: EIP1193Provider,
): Promise<WalletClient> {
  return createWalletClient({
    chain: HEALTHPROOF_CHAIN,
    transport: custom(privyProvider),
  });
}

export async function getWalletAddress(
  privyProvider: EIP1193Provider,
): Promise<`0x${string}`> {
  const client = await getWalletClient(privyProvider);
  const [address] = await client.getAddresses();
  return address;
}
