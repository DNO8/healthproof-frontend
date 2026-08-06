"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { auditLog, withAuth } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { executeForwardRequest } from "../relay/relay-core";

interface PatientApproveData {
  request: SignedForwardRequest;
  requestId: string;
  patientWallet: string;
}

/**
 * Approve emergency access as the patient (conscious patient path).
 */
async function approveEmergencyPatientHandler(
  data: PatientApproveData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  if (data.patientWallet.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Only the patient can approve their own emergency request");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("approveEmergencyPatientOnChain", auth, true, {
    patientWallet: data.patientWallet,
    requestId: data.requestId,
  });

  return { txHash: result.txHash };
}

export const approveEmergencyPatientOnChain = withAuth(
  approveEmergencyPatientHandler,
  {
    rateLimit: { windowMs: 60000, maxRequests: 5 },
  },
);
