"use server";

import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { validatePatientAccess } from "@/lib/auth/permissions";
import { executeForwardRequest } from "../relay/relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface ApproveEmergencyData {
  request: SignedForwardRequest;
  requestId: string;
  patientWallet: string;
}

/**
 * Approve emergency access as a guardian.
 * Guardian signs ForwardRequest in frontend; deployer relays it.
 */
async function approveEmergencyGuardianHandler(
  data: ApproveEmergencyData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("approveEmergencyGuardianOnChain", auth, true, {
    patientWallet: data.patientWallet,
    requestId: data.requestId,
  });

  return { txHash: result.txHash };
}

async function validateApproveGuardian(
  data: ApproveEmergencyData,
  auth: AuthContext
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const approveEmergencyGuardianOnChain = withAuth(approveEmergencyGuardianHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateApproveGuardian,
});
