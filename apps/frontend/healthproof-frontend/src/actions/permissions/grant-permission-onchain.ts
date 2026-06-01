"use server";

import { keccak256, toHex } from "viem";
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { validatePatientAccess } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";
import { executeForwardRequest } from "../relay/relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface GrantPermissionData {
  request: SignedForwardRequest;
  patientWallet: string;
  granteeWallet: string;
  documentId: string;
  scope?: number;
  expiresInMinutes?: number;
}

/**
 * Grant a permission on-chain via EIP-2771 meta-transaction.
 * The patient (or guardian) signs the ForwardRequest in the frontend;
 * the deployer relays it through the TrustedForwarder.
 * Requires caller to be authenticated and either the patient or a guardian.
 */
async function grantPermissionHandler(
  data: GrantPermissionData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  // resourceId = keccak256(documentId) if it's a CID, or use directly if already bytes32
  const resourceId = data.documentId.startsWith("0x") && data.documentId.length === 66
    ? (data.documentId as `0x${string}`)
    : keccak256(toHex(data.documentId));

  try {
    await logAuditEvent(data.patientWallet, resourceId, AuditAction.PERMISSION_GRANTED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("grantPermissionOnChain", auth, true, {
    patientWallet: data.patientWallet,
    granteeWallet: data.granteeWallet,
    documentId: data.documentId,
    scope: data.scope ?? 0,
    expiresAt: data.request.deadline.toString(),
  });

  return { txHash: result.txHash };
}

/**
 * Validate that caller can grant permissions for the patient
 */
async function validateGrantPermission(
  data: GrantPermissionData,
  auth: AuthContext
): Promise<boolean> {
  // Caller must be the patient themselves or a guardian
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const grantPermissionOnChain = withAuth(grantPermissionHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateGrantPermission,
});

