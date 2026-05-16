"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  stringToHex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";
const PermissionManagerAbi = PermissionManagerArtifact.abi;
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { validatePatientAccess } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

interface GrantPermissionData {
  patientWallet: string;
  granteeWallet: string;
  documentId: string;
  scope?: number;
  expiresInMinutes?: number;
}

/**
 * Grant a permission on-chain using the deployer key (as proxy for the patient).
 * Requires caller to be authenticated and either the patient or a guardian.
 */
async function grantPermissionHandler(
  data: GrantPermissionData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  // resourceId = keccak256(documentId) if it's a CID, or use directly if already bytes32
  const resourceId = data.documentId.startsWith("0x") && data.documentId.length === 66
    ? (data.documentId as `0x${string}`)
    : keccak256(toHex(data.documentId));

  // Scope: 0 = DOCUMENT (default)
  const scope = data.scope ?? 0;

  // Expiry: default 60 minutes from now, 0 = no expiry
  const expiresAt = data.expiresInMinutes
    ? BigInt(Math.floor(Date.now() / 1000) + data.expiresInMinutes * 60)
    : BigInt(0);

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
    abi: PermissionManagerAbi,
    functionName: "grantPermission",
    args: [
      data.patientWallet as `0x${string}`,
      data.granteeWallet as `0x${string}`,
      scope,
      resourceId,
      expiresAt,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, resourceId, AuditAction.PERMISSION_GRANTED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("grantPermissionOnChain", auth, true, {
    patientWallet: data.patientWallet,
    granteeWallet: data.granteeWallet,
    documentId: data.documentId,
    scope,
    expiresAt: expiresAt.toString(),
  });

  return { txHash };
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

