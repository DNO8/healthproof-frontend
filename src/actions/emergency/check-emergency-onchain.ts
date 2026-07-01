"use server";

import { createPublicClient, http, keccak256, toHex } from "viem";
import EmergencyAccessManagerArtifact from "@/lib/abis/EmergencyAccessManager.json";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";

const EmergencyAccessManagerAbi = EmergencyAccessManagerArtifact.abi;

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";

interface CheckEmergencyData {
  patientWallet: string;
  doctorWallet: string;
  documentId: string;
}

/**
 * Check if an emergency access is currently active on-chain.
 * Pure read — no gas needed.
 */
async function checkEmergencyHandler(
  data: CheckEmergencyData,
  _auth: AuthContext,
): Promise<boolean> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  if (!CONTRACT_ADDRESSES.EmergencyAccessManager) {
    return false;
  }

  const resourceId =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.EmergencyAccessManager,
    abi: EmergencyAccessManagerAbi,
    functionName: "isEmergencyActive",
    args: [
      data.patientWallet as `0x${string}`,
      data.doctorWallet as `0x${string}`,
      resourceId,
    ],
  });

  return result as boolean;
}

export const checkEmergencyOnChain = withAuth(checkEmergencyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
