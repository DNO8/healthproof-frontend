"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import GuardianRegistryAbi from "@/lib/abis/GuardianRegistry.json";
import { withAuth, getDeployerPrivateKey } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

async function getClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({ chain: HEALTHPROOF_CHAIN, transport: http() }),
    walletClient: createWalletClient({ account, chain: HEALTHPROOF_CHAIN, transport: http() }),
    account,
  };
}

interface RevokeGuardianshipData {
  patientWallet: string;
  guardianWallet: string;
}

async function revokeGuardianshipHandler(
  data: RevokeGuardianshipData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient, account } = await getClients();

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
    abi: GuardianRegistryAbi,
    functionName: "revokeGuardianship",
    args: [
      data.patientWallet as `0x${string}`,
      data.guardianWallet as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

async function validateRevokeGuardianship(
  data: RevokeGuardianshipData,
  auth: AuthContext
): Promise<boolean> {
  // Patient can revoke their own guardians, or an admin can revoke on their behalf
  return (
    auth.wallet.toLowerCase() === data.patientWallet.toLowerCase() ||
    auth.wallet.toLowerCase() === process.env.ADMIN_WALLET?.toLowerCase()
  );
}

export const revokeGuardianshipOnChain = withAuth(revokeGuardianshipHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRevokeGuardianship,
});
