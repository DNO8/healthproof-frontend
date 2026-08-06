"use server";

/**
 * @deprecated This action file is deprecated. All permission and document
 * flows now use HealthProofGateway via EIP-2771 meta-transactions.
 * No consumers import from this file.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import HealthProofProtocolAbi from "@/lib/abis/HealthProofProtocol.json";
import { logAuditEvent } from "@/lib/audit-onchain";
import { validatePatientAccess } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import { getDeployerPrivateKey, withAuth } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { AuditAction } from "@/lib/medical-constants";

async function getClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    walletClient: createWalletClient({
      account,
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    account,
  };
}

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ─── canAccessDocument (read-only) ───

interface CanAccessData {
  patientWallet: string;
  requesterWallet: string;
  documentId: string;
  documentType?: string;
  institution?: string;
}

async function canAccessHandler(
  data: CanAccessData,
  _auth: AuthContext,
): Promise<{ hasAccess: boolean }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const documentId =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

  const documentType = data.documentType
    ? data.documentType.startsWith("0x") && data.documentType.length === 66
      ? (data.documentType as `0x${string}`)
      : keccak256(toHex(data.documentType))
    : ZERO_BYTES32;

  const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.HealthProofProtocol as `0x${string}`,
    abi: HealthProofProtocolAbi,
    functionName: "canAccessDocument",
    args: [
      data.patientWallet as `0x${string}`,
      data.requesterWallet as `0x${string}`,
      documentId,
      documentType,
      institution,
    ],
  });

  return { hasAccess: result as boolean };
}

export const canAccessDocumentOnChain = withAuth(canAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

// ─── logDocumentAccess (write) ───

interface LogAccessData {
  patientWallet: string;
  documentId: string;
}

async function logAccessHandler(
  data: LogAccessData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const documentId =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofProtocol as `0x${string}`,
    abi: HealthProofProtocolAbi,
    functionName: "logDocumentAccess",
    args: [data.patientWallet as `0x${string}`, documentId],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(
      data.patientWallet,
      documentId,
      AuditAction.DOCUMENT_ACCESSED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  return { txHash };
}

async function validateLogAccess(
  data: LogAccessData,
  auth: AuthContext,
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const logDocumentAccessOnChain = withAuth(logAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  requireOnChainPermission: validateLogAccess,
});

// ─── grantAccess (write) ───

interface GrantAccessData {
  patientWallet: string;
  granteeWallet: string;
  scope?: number;
  resourceId: string;
  expiresAt?: number;
}

async function grantAccessHandler(
  data: GrantAccessData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const resourceId =
    data.resourceId.startsWith("0x") && data.resourceId.length === 66
      ? (data.resourceId as `0x${string}`)
      : keccak256(toHex(data.resourceId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofProtocol as `0x${string}`,
    abi: HealthProofProtocolAbi,
    functionName: "grantAccess",
    args: [
      data.patientWallet as `0x${string}`,
      data.granteeWallet as `0x${string}`,
      data.scope ?? 0,
      resourceId,
      BigInt(data.expiresAt ?? 0),
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(
      data.patientWallet,
      resourceId,
      AuditAction.PERMISSION_GRANTED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  return { txHash };
}

async function validateProtocolGrantAccess(
  data: GrantAccessData,
  auth: AuthContext,
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const grantAccessProtocolOnChain = withAuth(grantAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateProtocolGrantAccess,
});

// ─── revokeAccess (write) ───

interface RevokeAccessData {
  patientWallet: string;
  granteeWallet: string;
}

async function revokeAccessHandler(
  data: RevokeAccessData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofProtocol as `0x${string}`,
    abi: HealthProofProtocolAbi,
    functionName: "revokeAccess",
    args: [
      data.patientWallet as `0x${string}`,
      data.granteeWallet as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(
      data.patientWallet,
      data.granteeWallet,
      AuditAction.PERMISSION_REVOKED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  return { txHash };
}

async function validateRevokeAccess(
  data: RevokeAccessData,
  auth: AuthContext,
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const revokeAccessProtocolOnChain = withAuth(revokeAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRevokeAccess,
});

// ─── registerMedicalDocument (write) ───

interface RegisterDocumentData {
  documentId: string;
  patientWallet: string;
  institution?: string;
  documentType?: string;
  clinicalHash?: string;
  cid: string;
  standard?: string;
  classification?: string;
}

async function registerDocumentHandler(
  data: RegisterDocumentData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const documentId =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

  const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;
  const documentType = data.documentType
    ? data.documentType.startsWith("0x") && data.documentType.length === 66
      ? (data.documentType as `0x${string}`)
      : keccak256(toHex(data.documentType))
    : ZERO_BYTES32;
  const clinicalHash = data.clinicalHash
    ? data.clinicalHash.startsWith("0x") && data.clinicalHash.length === 66
      ? (data.clinicalHash as `0x${string}`)
      : keccak256(toHex(data.clinicalHash))
    : ZERO_BYTES32;
  const standard = data.standard
    ? data.standard.startsWith("0x") && data.standard.length === 66
      ? (data.standard as `0x${string}`)
      : keccak256(toHex(data.standard))
    : ZERO_BYTES32;
  const classification = data.classification
    ? data.classification.startsWith("0x") && data.classification.length === 66
      ? (data.classification as `0x${string}`)
      : keccak256(toHex(data.classification))
    : ZERO_BYTES32;

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofProtocol as `0x${string}`,
    abi: HealthProofProtocolAbi,
    functionName: "registerMedicalDocument",
    args: [
      documentId,
      data.patientWallet as `0x${string}`,
      institution,
      documentType,
      clinicalHash,
      data.cid,
      standard,
      classification,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(
      data.patientWallet,
      documentId,
      AuditAction.DOCUMENT_REGISTERED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  return { txHash };
}

export const registerDocumentProtocolOnChain = withAuth(
  registerDocumentHandler,
  {
    rateLimit: { windowMs: 60000, maxRequests: 5 },
  },
);
