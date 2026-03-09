import { revokePermissionOnChain } from "@/actions/revoke-permission-onchain";

// Revocation is on-chain via PermissionManager.revokePermission().
// DB permission_keys row stays but on-chain active=false is the source of truth.

export async function revokePermission(data: {
  patientWallet: string;
  granteeWallet: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  return revokePermissionOnChain(data);
}
