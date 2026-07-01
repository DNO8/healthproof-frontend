"use server";

import { validatePatientAccess } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import { auditLog, withAuth } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { executeForwardRequest } from "../relay/relay-core";

interface RevokeEmergencyData {
  request: SignedForwardRequest;
  requestId: string;
  patientWallet: string;
}

/**
 * Revoke an approved emergency access.
 * Can be called by patient or guardian.
 */
async function revokeEmergencyHandler(
  data: RevokeEmergencyData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("revokeEmergencyOnChain", auth, true, {
    patientWallet: data.patientWallet,
    requestId: data.requestId,
  });

  return { txHash: result.txHash };
}

async function validateRevokeEmergency(
  data: RevokeEmergencyData,
  auth: AuthContext,
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const revokeEmergencyOnChain = withAuth(revokeEmergencyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRevokeEmergency,
});
