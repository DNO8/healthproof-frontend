"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import AuditTrailArtifact from "@/lib/abis/AuditTrail.json";
const AuditTrailAbi = AuditTrailArtifact.abi;
import { getDeployerPrivateKey } from "@/lib/auth/with-auth";
import { AuditAction } from "@/lib/medical-constants";

async function getClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({ chain: HEALTHPROOF_CHAIN, transport: http() }),
    walletClient: createWalletClient({ account, chain: HEALTHPROOF_CHAIN, transport: http() }),
    account,
  };
}

/**
 * Log an audit event on-chain via the AuditTrail contract.
 * Uses the deployer key to sign the transaction.
 */
export async function logAuditEvent(
  patient: string,
  resourceId: string,
  action: AuditAction,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const resourceIdHex = resourceId.startsWith("0x") && resourceId.length === 66
    ? (resourceId as `0x${string}`)
    : (resourceId.startsWith("0x")
        ? `0x${resourceId.slice(2).padStart(64, "0")}` as `0x${string}`
        : `0x${resourceId.padStart(64, "0")}` as `0x${string}`);

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.AuditTrail as `0x${string}`,
    abi: AuditTrailAbi,
    functionName: "logEvent",
    args: [
      patient.toLowerCase() as `0x${string}`,
      resourceIdHex,
      action,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}
