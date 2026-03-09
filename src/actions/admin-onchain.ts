"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofKernelAbi from "@/lib/abis/HealthProofKernel.json";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import { env } from "@/lib/env";
import type { ContractRole } from "@/types/domain.types";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

function getClients() {
  const pk = env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({ chain: avalancheFuji, transport: http() }),
    walletClient: createWalletClient({ account, chain: avalancheFuji, transport: http() }),
    account,
  };
}

// ─── Protocol Pause / Resume ───

export async function isProtocolPaused(): Promise<boolean> {
  try {
    const { publicClient } = getClients();
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "protocolPaused",
    });
    return result as boolean;
  } catch (err) {
    console.error("[isProtocolPaused]", err);
    return false;
  }
}

export async function pauseProtocol(): Promise<
  { success: true; txHash: string } | { error: string }
> {
  try {
    const { publicClient, walletClient } = getClients();
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "pauseProtocol",
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pauseProtocol]", msg);
    return { error: msg };
  }
}

export async function resumeProtocol(): Promise<
  { success: true; txHash: string } | { error: string }
> {
  try {
    const { publicClient, walletClient } = getClients();
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "resumeProtocol",
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[resumeProtocol]", msg);
    return { error: msg };
  }
}

// ─── Entity Management (IdentityRegistry) ───

export async function adminRegisterEntity(data: {
  wallet: string;
  role: ContractRole;
  specialty?: string;
  institution?: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient } = getClients();

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "registerEntity",
      args: [
        data.wallet as `0x${string}`,
        data.role,
        data.specialty ?? "",
        (data.institution as `0x${string}`) ?? ZERO_ADDRESS,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[adminRegisterEntity]", msg);
    return { error: msg };
  }
}

export async function adminVerifyEntity(
  wallet: string,
): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient } = getClients();

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "verifyEntity",
      args: [wallet as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[adminVerifyEntity]", msg);
    return { error: msg };
  }
}

export async function adminGetEntity(wallet: string): Promise<{
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

    if (role === 0 && !verified && specialty === "") return null;

    return { role, specialty, institution, verified };
  } catch (err) {
    console.error("[adminGetEntity]", err);
    return null;
  }
}
