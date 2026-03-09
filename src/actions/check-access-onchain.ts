"use server";

import { createPublicClient, http, keccak256, toHex } from "viem";
import { avalancheFuji } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerAbi from "@/lib/abis/PermissionManager.json";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Check if a requester has on-chain access to a patient's document.
 * Pure read — no gas needed.
 */
export async function checkAccessOnChain(data: {
  patientWallet: string;
  requesterWallet: string;
  documentId: string;
  documentType?: string;
  institution?: string;
}): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: avalancheFuji,
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
  } catch (err) {
    console.error("[checkAccessOnChain]", err);
    return false;
  }
}
