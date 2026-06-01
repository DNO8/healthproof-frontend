"use server";

import { keccak256, toHex } from "viem";
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor, isVerifiedLab } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";
import { executeForwardRequest } from "../relay/relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface RegisterDocumentData {
  request: SignedForwardRequest;
  cid: string;
  fileHash: string;
  patientWallet: string;
  documentType?: string;
}

/**
 * Register a medical document on-chain via EIP-2771 meta-transaction.
 * The verified doctor/lab signs the ForwardRequest in the frontend;
 * the deployer relays it through the TrustedForwarder targeting
 * HealthProofGateway.registerMedicalDocument, which injects _msgSender()
 * as the issuer and delegates to MedicalDocumentRegistry.
 */
async function registerDocumentHandler(
  data: RegisterDocumentData,
  auth: AuthContext
): Promise<{ txHash: string; documentId: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  const documentId = keccak256(toHex(data.cid));
  const clinicalHash = keccak256(toHex(data.fileHash));

  try {
    await logAuditEvent(data.patientWallet, documentId, AuditAction.DOCUMENT_REGISTERED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("registerDocumentOnChain", auth, true, {
    patientWallet: data.patientWallet,
    documentId,
    cid: data.cid,
    clinicalHash,
    documentType: data.documentType,
  });

  return { txHash: result.txHash, documentId };
}

async function validateRegisterDocument(
  data: RegisterDocumentData,
  auth: AuthContext
): Promise<boolean> {
  const isDoctor = await isVerifiedDoctor(auth.wallet);
  const isLab = await isVerifiedLab(auth.wallet);
  return isDoctor || isLab;
}

export const registerDocumentOnChain = withAuth(registerDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRegisterDocument,
});

