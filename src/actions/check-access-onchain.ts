"use server";

import { createPublicClient, http, keccak256, toHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";
const PermissionManagerAbi = PermissionManagerArtifact.abi;
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface CheckAccessData {
  patientWallet: string;
  requesterWallet: string;
  documentId: string;
  documentType?: string;
  institution?: string;
}

/**
 * Check if a requester has on-chain access to a patient's document.
 * Pure read — no gas needed. Requires authentication.
 */
async function checkAccessHandler(
  data: CheckAccessData,
  _auth: AuthContext
): Promise<boolean> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  // resourceId = keccak256(documentId) if CID, or use directly if already bytes32
  const docIdBytes32 =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

  const docType = data.documentType
    ? keccak256(toHex(data.documentType))
    : ZERO_BYTES32;

  const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
    abi: PermissionManagerAbi,
    functionName: "hasAccess",
    args: [
      data.patientWallet as `0x${string}`,
      data.requesterWallet as `0x${string}`,
      docIdBytes32,
      docType,
      institution,
    ],
  });

  return result as boolean;
}

export const checkAccessOnChain = withAuth(checkAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});

