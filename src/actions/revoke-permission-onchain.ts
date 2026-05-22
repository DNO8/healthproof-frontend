"use server";

import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";
const PermissionManagerAbi = PermissionManagerArtifact.abi;
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { validatePatientAccess } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";
import { executeForwardRequest } from "./relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface RevokePermissionData {
  request: SignedForwardRequest;
  patientWallet: string;
  granteeWallet: string;
}

/**
 * Revoke all permissions from a patient to a specific grantee on-chain via EIP-2771 meta-transaction.
 * The patient (or guardian) signs the ForwardRequest in the frontend;
 * the deployer relays it through the TrustedForwarder.
 * Requires caller to be authenticated and either the patient or a guardian.
 */
async function revokePermissionHandler(
  data: RevokePermissionData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  try {
    await logAuditEvent(data.patientWallet, data.granteeWallet, AuditAction.PERMISSION_REVOKED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("revokePermissionOnChain", auth, true, {
    patientWallet: data.patientWallet,
    granteeWallet: data.granteeWallet,
  });

  return { txHash: result.txHash };
}

/**
 * Validate that caller can revoke permissions for the patient
 */
async function validateRevokePermission(
  data: RevokePermissionData,
  auth: AuthContext
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const revokePermissionOnChain = withAuth(revokePermissionHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRevokePermission,
});

