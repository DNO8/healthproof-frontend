"use server";

import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { executeForwardRequest } from "./relay-core";

async function relayHandler(
  request: SignedForwardRequest,
  auth: AuthContext
): Promise<{ txHash: `0x${string}`; success: boolean }> {
  if (request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  return executeForwardRequest(request);
}

export const relayMetaTransaction = withAuth(relayHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
