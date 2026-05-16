"use server";

import {
  createPublicClient,
  createWalletClient,
  http
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

interface RevokePermissionData {
  patientWallet: string;
  granteeWallet: string;
}

/**
 * Revoke all permissions from a patient to a specific grantee on-chain.
 * Requires caller to be authenticated and either the patient or a guardian.
 */
async function revokePermissionHandler(
  data: RevokePermissionData,
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

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
    abi: PermissionManagerAbi,
    functionName: "revokePermission",
    args: [
      data.patientWallet as `0x${string}`,
      data.granteeWallet as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, data.granteeWallet, AuditAction.PERMISSION_REVOKED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("revokePermissionOnChain", auth, true, {
    patientWallet: data.patientWallet,
    granteeWallet: data.granteeWallet,
  });

  return { txHash };
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

