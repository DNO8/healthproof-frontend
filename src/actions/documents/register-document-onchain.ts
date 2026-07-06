"use server";

import {
  decodeFunctionData,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
  toHex,
} from "viem";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { logAuditEvent } from "@/lib/audit-onchain";
import { isVerifiedDoctor, isVerifiedLab } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { logger } from "@/lib/logger";
import {
  AuditAction,
  NO_CLASSIFICATION,
  NO_STANDARD,
  REGISTER_DOCUMENT_ACTION,
  ZERO_BYTES32,
} from "@/lib/medical-constants";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { executeForwardRequest } from "../relay/relay-core";

export interface RegisterDocumentData {
  request: SignedForwardRequest;
  cid: string;
  fileHash: string;
  patientWallet: string;
  documentType: string;
  standard: string;
  classification: string;
  episodeId?: string;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-zA-Z0-9]{55})$/;
const SHA256_RE = /^0x?[a-fA-F0-9]{64}$/;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;

function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value) || isAddress(value);
}

function isValidCid(value: string): boolean {
  return CID_RE.test(value);
}

function isValidSha256(value: string): boolean {
  return SHA256_RE.test(value);
}

function _isValidBytes32(value: string): boolean {
  return BYTES32_RE.test(value);
}

function isValidForwardRequest(request: SignedForwardRequest): boolean {
  const fields = [
    "to",
    "from",
    "value",
    "data",
    "gas",
    "nonce",
    "deadline",
    "signature",
  ];
  for (const field of fields) {
    if (!(field in request)) return false;
  }
  if (typeof request.to !== "string" || typeof request.from !== "string")
    return false;
  if (typeof request.data !== "string" || !isHex(request.data)) return false;
  if (typeof request.signature !== "string" || !isHex(request.signature))
    return false;
  const numeric = ["value", "gas", "nonce", "deadline"];
  for (const field of numeric) {
    const value = (request as unknown as Record<string, unknown>)[field];
    if (
      typeof value !== "bigint" &&
      typeof value !== "string" &&
      typeof value !== "number"
    ) {
      return false;
    }
  }
  return true;
}

function _sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function registerDocumentHandler(
  data: RegisterDocumentData,
  auth: AuthContext,
): Promise<{ txHash: string; documentId: string }> {
  const {
    request,
    cid,
    fileHash,
    patientWallet,
    documentType,
    standard,
    classification,
  } = data;

  console.log("[registerDocumentOnChain] Incoming request:", {
    cid,
    fileHash,
    patientWallet,
    documentType,
    standard,
    classification,
    episodeId: data.episodeId,
    authWallet: auth.wallet,
    gateway: CONTRACT_ADDRESSES.HealthProofGateway,
    requestTo: request?.to,
    requestFrom: request?.from,
    requestValue: request?.value?.toString?.(),
    requestDataPrefix: request?.data?.slice(0, 20),
  });

  if (!isValidForwardRequest(request)) {
    console.error(
      "[registerDocumentOnChain] ForwardRequest validation failed:",
      {
        request,
        authWallet: auth.wallet,
        gateway: CONTRACT_ADDRESSES.HealthProofGateway,
      },
    );
    throw new Error("InvalidForwardRequest: malformed forward request");
  }
  if (!isValidSha256(fileHash)) {
    console.error("[registerDocumentOnChain] Invalid fileHash:", fileHash);
    throw new Error("InvalidForwardRequest: invalid fileHash");
  }
  if (!isValidEvmAddress(patientWallet)) {
    console.error(
      "[registerDocumentOnChain] Invalid patientWallet:",
      patientWallet,
    );
    throw new Error("InvalidForwardRequest: invalid patientWallet");
  }
  if (!isValidCid(cid)) {
    console.error("[registerDocumentOnChain] Invalid CID:", cid);
    throw new Error("InvalidForwardRequest: invalid CID");
  }
  if (
    request.to.toLowerCase() !==
    CONTRACT_ADDRESSES.HealthProofGateway.toLowerCase()
  ) {
    console.error("[registerDocumentOnChain] request.to mismatch:", {
      requestTo: request.to,
      expectedGateway: CONTRACT_ADDRESSES.HealthProofGateway,
    });
    throw new Error("InvalidForwardRequest: request.to != HealthProofGateway");
  }
  if (request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    console.error("[registerDocumentOnChain] Signer mismatch:", {
      requestFrom: request.from,
      authWallet: auth.wallet,
    });
    throw new Error("SignerMismatch");
  }
  const value = BigInt(request.value);
  if (value !== BigInt(0)) {
    console.error(
      "[registerDocumentOnChain] Non-zero value:",
      value.toString(),
    );
    throw new Error("InvalidForwardRequest: value must be 0");
  }

  const expectedDocumentId = keccak256(toHex(cid));
  const expectedClinicalHash = keccak256(toHex(fileHash));
  const expectedEpisodeId =
    data.episodeId && data.episodeId !== ZERO_BYTES32
      ? data.episodeId
      : ZERO_BYTES32;
  const expectedDocumentType = stringToHex(documentType, { size: 32 });
  const expectedStandard =
    standard === NO_STANDARD
      ? ZERO_BYTES32
      : stringToHex(standard, { size: 32 });
  const expectedClassification =
    classification === NO_CLASSIFICATION
      ? ZERO_BYTES32
      : stringToHex(classification, { size: 32 });

  const decoded = decodeFunctionData({
    abi: HealthProofGatewayAbi,
    data: request.data as `0x${string}`,
  });

  if (decoded.functionName !== "registerMedicalDocument") {
    console.error(
      "[registerDocumentOnChain] Unexpected function name:",
      decoded.functionName,
    );
    throw new Error(
      "InvalidForwardRequest: function must be registerMedicalDocument",
    );
  }
  const args = decoded.args as [
    `0x${string}`, // documentId
    `0x${string}`, // patient
    `0x${string}`, // institution
    `0x${string}`, // documentType
    `0x${string}`, // clinicalHash
    `0x${string}`, // episodeId
    string, // cid
    `0x${string}`, // standard
    `0x${string}`, // classification
  ];

  const [
    onChainDocumentId,
    onChainPatient,
    onChainInstitution,
    onChainDocumentType,
    onChainClinicalHash,
    onChainEpisodeId,
    onChainCid,
    onChainStandard,
    onChainClassification,
  ] = args;

  const fieldMismatches: string[] = [];
  if (onChainDocumentId.toLowerCase() !== expectedDocumentId.toLowerCase()) {
    fieldMismatches.push(
      `documentId: expected ${expectedDocumentId}, got ${onChainDocumentId}`,
    );
  }
  if (onChainPatient.toLowerCase() !== patientWallet.toLowerCase()) {
    fieldMismatches.push(
      `patient: expected ${patientWallet}, got ${onChainPatient}`,
    );
  }
  if (onChainInstitution.toLowerCase() !== auth.wallet.toLowerCase()) {
    fieldMismatches.push(
      `institution: expected ${auth.wallet}, got ${onChainInstitution}`,
    );
  }
  if (
    onChainDocumentType.toLowerCase() !== expectedDocumentType.toLowerCase()
  ) {
    fieldMismatches.push(
      `documentType: expected ${expectedDocumentType}, got ${onChainDocumentType}`,
    );
  }
  if (
    onChainClinicalHash.toLowerCase() !== expectedClinicalHash.toLowerCase()
  ) {
    fieldMismatches.push(
      `clinicalHash: expected ${expectedClinicalHash}, got ${onChainClinicalHash}`,
    );
  }
  if (onChainEpisodeId.toLowerCase() !== expectedEpisodeId.toLowerCase()) {
    fieldMismatches.push(
      `episodeId: expected ${expectedEpisodeId}, got ${onChainEpisodeId}`,
    );
  }
  if (onChainCid !== cid) {
    fieldMismatches.push(`cid: expected ${cid}, got ${onChainCid}`);
  }
  if (onChainStandard.toLowerCase() !== expectedStandard.toLowerCase()) {
    fieldMismatches.push(
      `standard: expected ${expectedStandard}, got ${onChainStandard}`,
    );
  }
  if (
    onChainClassification.toLowerCase() !== expectedClassification.toLowerCase()
  ) {
    fieldMismatches.push(
      `classification: expected ${expectedClassification}, got ${onChainClassification}`,
    );
  }

  if (fieldMismatches.length > 0) {
    console.error(
      "[registerDocumentOnChain] Decoded argument mismatches:",
      fieldMismatches,
    );
    throw new Error(
      "InvalidForwardRequest: decoded args do not match expected values",
    );
  }

  const result = await executeForwardRequest(request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  try {
    await logAuditEvent(
      patientWallet,
      expectedDocumentId,
      AuditAction.DOCUMENT_REGISTERED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  logger.info(
    {
      action: REGISTER_DOCUMENT_ACTION,
      documentType,
      standard,
      classification,
      actor: auth.wallet.toLowerCase(),
      success: true,
      txHash: result.txHash,
    },
    "registerDocumentOnChain completed",
  );

  return { txHash: result.txHash, documentId: expectedDocumentId };
}

async function validateRegisterDocument(
  _data: RegisterDocumentData,
  auth: AuthContext,
): Promise<boolean> {
  const isDoctor = await isVerifiedDoctor(auth.wallet);
  const isLab = await isVerifiedLab(auth.wallet);
  return isDoctor || isLab;
}

export const registerDocumentOnChain = withAuth(registerDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRegisterDocument,
});
