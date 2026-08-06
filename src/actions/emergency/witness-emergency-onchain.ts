"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { auditLog, withAuth } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { executeForwardRequest } from "../relay/relay-core";

interface WitnessEmergencyData {
  request: SignedForwardRequest;
  requestId: string;
  patientWallet: string;
}

/**
 * Witness emergency access as a second doctor (dual-doctor path).
 * Used when patient has no active guardian.
 */
async function witnessEmergencyHandler(
  data: WitnessEmergencyData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("witnessEmergencyOnChain", auth, true, {
    patientWallet: data.patientWallet,
    requestId: data.requestId,
  });

  return { txHash: result.txHash };
}

export const witnessEmergencyOnChain = withAuth(witnessEmergencyHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});
