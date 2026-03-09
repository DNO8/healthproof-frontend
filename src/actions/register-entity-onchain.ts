"use server";

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { env } from "@/lib/env";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import type { ContractRole } from "@/types/domain.types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function getDeployerAccount() {
  const key = env.DEPLOYER_PRIVATE_KEY;
  if (!key) {
    throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  }
  const prefixed = key.startsWith("0x") ? key : `0x${key}`;
  return privateKeyToAccount(prefixed as `0x${string}`);
}

function getClients() {
  const account = getDeployerAccount();

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(),
  });

  return { publicClient, walletClient, account };
}

export async function registerEntityOnChain(data: {
  wallet: string;
  role: ContractRole;
  specialty?: string;
  institution?: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient, account } = getClients();

    const walletAddr = data.wallet as `0x${string}`;
    const institutionAddr = (data.institution ?? ZERO_ADDRESS) as `0x${string}`;

    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "registerEntity",
      args: [walletAddr, data.role, data.specialty ?? "", institutionAddr],
    });

    const txHash = await walletClient.writeContract(request);

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("registerEntityOnChain error:", message);
    return { error: message };
  }
}

export async function verifyEntityOnChain(
  wallet: string,
): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient, account } = getClients();

    const walletAddr = wallet as `0x${string}`;

    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "verifyEntity",
      args: [walletAddr],
    });

    const txHash = await walletClient.writeContract(request);

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("verifyEntityOnChain error:", message);
    return { error: message };
  }
}

export async function getEntityOnChain(
  wallet: string,
): Promise<{
  role: number;
  specialty: string;
  institution: string;
  verified: boolean;
} | null> {
  try {
    const { publicClient } = getClients();

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "entities",
      args: [wallet as `0x${string}`],
    });

    const [, role, specialty, institution, verified] = result as [
      string,
      number,
      string,
      string,
      boolean,
    ];

    if (role === 0 && !verified && specialty === "") {
      return null;
    }

    return { role, specialty, institution, verified };
  } catch (err) {
    console.error("getEntityOnChain error:", err);
    return null;
  }
}

export async function getRoleOnChain(wallet: string): Promise<number | null> {
  try {
    const { publicClient } = getClients();

    const role = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "getRole",
      args: [wallet as `0x${string}`],
    });

    return role as number;
  } catch (err) {
    console.error("getRoleOnChain error:", err);
    return null;
  }
}
