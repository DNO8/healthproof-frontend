"use server";

import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { OnChainPermission } from "@/lib/medical-constants";

const PermissionManagerAbi = PermissionManagerArtifact.abi;

interface ListPermissionsParams {
  patientWallet: string;
  offset?: number;
  limit?: number;
}

async function handler(
  data: ListPermissionsParams,
  auth: AuthContext,
): Promise<{ permissions: OnChainPermission[]; total: number }> {
  // Caller can only list permissions for their own wallet
  if (auth.wallet.toLowerCase() !== data.patientWallet.toLowerCase()) {
    throw new Error("Unauthorized: can only list your own permissions");
  }

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const [permissionsRaw, total] = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
    abi: PermissionManagerAbi,
    functionName: "getPermissions",
    args: [
      data.patientWallet as `0x${string}`,
      BigInt(data.offset ?? 0),
      BigInt(data.limit ?? 50),
    ],
  })) as [
    { grantee: string; scope: number; resourceId: `0x${string}`; expiresAt: bigint; active: boolean }[],
    bigint,
  ];

  const permissions: OnChainPermission[] = permissionsRaw.map((p) => ({
    grantee: p.grantee,
    scope: p.scope,
    resourceId: p.resourceId,
    expiresAt: Number(p.expiresAt),
    active: p.active,
  }));

  return { permissions, total: Number(total) };
}

export const listPermissionsOnChain = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
