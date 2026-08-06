"use server";

import { createPublicClient, http } from "viem";
import EmergencyAccessManagerArtifact from "@/lib/abis/EmergencyAccessManager.json";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";

const EmergencyAccessManagerAbi = EmergencyAccessManagerArtifact.abi;

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import type { OnChainEmergencyRequest } from "@/lib/medical-constants";

interface GetEmergencyRequestData {
  requestId: string;
}

/**
 * Read a single emergency request from the on-chain mapping.
 */
async function getEmergencyRequestHandler(
  data: GetEmergencyRequestData,
  _auth: AuthContext,
): Promise<OnChainEmergencyRequest | null> {
  if (!CONTRACT_ADDRESSES.EmergencyAccessManager) {
    return null;
  }

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const result = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.EmergencyAccessManager,
    abi: EmergencyAccessManagerAbi,
    functionName: "requests",
    args: [data.requestId as `0x${string}`],
  })) as {
    requestId: string;
    patient: string;
    requestingDoctor: string;
    witnessDoctor: string;
    approvedBy: string;
    resourceId: string;
    path: number;
    status: number;
    requestedAt: bigint;
    activatedAt: bigint;
    expiresAt: bigint;
    reasonHash: string;
  };

  if (!result || result.requestedAt === BigInt(0)) {
    return null;
  }

  return {
    requestId: result.requestId,
    patient: result.patient,
    requestingDoctor: result.requestingDoctor,
    witnessDoctor: result.witnessDoctor,
    approvedBy: result.approvedBy,
    resourceId: result.resourceId,
    path: result.path,
    status: result.status,
    requestedAt: Number(result.requestedAt),
    activatedAt: Number(result.activatedAt),
    expiresAt: Number(result.expiresAt),
    reasonHash: result.reasonHash,
  };
}

export const getEmergencyRequestOnChain = withAuth(getEmergencyRequestHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
