"use server";

import { keccak256, toHex } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import EmergencyAccessManagerArtifact from "@/lib/abis/EmergencyAccessManager.json";
const EmergencyAccessManagerAbi = EmergencyAccessManagerArtifact.abi;
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { executeForwardRequest } from "../relay/relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface RequestEmergencyData {
  request: SignedForwardRequest;
  patientWallet: string;
  documentId: string;
  reasonHash: string;
}

/**
 * Request emergency access (break-the-glass) on-chain.
 * The doctor signs the ForwardRequest in the frontend;
 * the deployer relays it through the TrustedForwarder.
 */
async function requestEmergencyHandler(
  data: RequestEmergencyData,
  auth: AuthContext
): Promise<{ txHash: string; requestId: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  const resourceId = data.documentId.startsWith("0x") && data.documentId.length === 66
    ? (data.documentId as `0x${string}`)
    : keccak256(toHex(data.documentId));

  // Compute deterministic requestId (same as contract)
  const requestId = keccak256(
    new Uint8Array([
      ...new Uint8Array(Buffer.from(data.patientWallet.slice(2), "hex")),
      ...new Uint8Array(Buffer.from(auth.wallet.slice(2), "hex")),
      ...new Uint8Array(Buffer.from(resourceId.slice(2), "hex")),
    ])
  );

  auditLog("requestEmergencyOnChain", auth, true, {
    patientWallet: data.patientWallet,
    documentId: data.documentId,
    resourceId,
    reasonHash: data.reasonHash,
  });

  return { txHash: result.txHash, requestId };
}

export const requestEmergencyOnChain = withAuth(requestEmergencyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});
