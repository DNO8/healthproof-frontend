"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerAbi from "@/lib/abis/PermissionManager.json";
import { env } from "@/lib/env";

/**
 * Revoke all permissions from a patient to a specific grantee on-chain.
 * Uses deployer key as guardian proxy for the patient.
 */
export async function revokePermissionOnChain(data: {
  patientWallet: string;
  granteeWallet: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const pk = env.DEPLOYER_PRIVATE_KEY;
    if (!pk) return { error: "DEPLOYER_PRIVATE_KEY not set" };

    const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(),
    });

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
      abi: PermissionManagerAbi,
      functionName: "revokePermission",
      args: [
        data.patientWallet as `0x${string}`,
        data.granteeWallet as `0x${string}`,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[revokePermissionOnChain]", msg);
    return { error: msg };
  }
}
