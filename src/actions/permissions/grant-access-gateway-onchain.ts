"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
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

interface GrantAccessData {
  patientWallet: string;
  granteeWallet: string;
  resourceId: string;
  scope?: number;
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

  const scope = data.scope ?? 0;
  const expiresAt = data.expiresAt ?? 0;

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
    abi: HealthProofGatewayAbi,
    functionName: "grantAccess",
    args: [
      data.patientWallet as `0x${string}`,
      data.granteeWallet as `0x${string}`,
      scope,
      resourceId,
      BigInt(expiresAt),
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

async function validateGrantAccess(
  data: GrantAccessData,
  auth: AuthContext,
): Promise<boolean> {
  return await validatePatientAccess(data.patientWallet, auth.wallet);
}

export const grantAccessGatewayOnChain = withAuth(grantAccessHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateGrantAccess,
});
