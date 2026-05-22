"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import GuardianRegistryAbi from "@/lib/abis/GuardianRegistry.json";
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedAdmin } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

interface GrantGuardianshipData {
  patientWallet: string;
  guardianWallet: string;
  guardianshipType: number; // 0=PARENTAL, 1=LEGAL_TUTOR, 2=COURT_APPOINTED, 3=VOLUNTARY_DELEGATION
  validUntil?: number; // Unix timestamp in seconds, 0 = no expiry
  legalDocHash?: string;
}

async function grantGuardianshipHandler(
  data: GrantGuardianshipData,
  auth: AuthContext,
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

  const legalDocHash = data.legalDocHash
    ? (data.legalDocHash.startsWith("0x") && data.legalDocHash.length === 66
      ? (data.legalDocHash as `0x${string}`)
      : ZERO_BYTES32)
    : ZERO_BYTES32;

  const validUntil = data.validUntil ? BigInt(data.validUntil) : BigInt(0);

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
    abi: GuardianRegistryAbi,
    functionName: "grantGuardianship",
    args: [
      data.patientWallet as `0x${string}`,
      data.guardianWallet as `0x${string}`,
      data.guardianshipType,
      legalDocHash,
      validUntil,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(
      data.patientWallet,
      ZERO_BYTES32,
      AuditAction.PERMISSION_GRANTED,
    );
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("grantGuardianshipOnChain", auth, true, {
    patientWallet: data.patientWallet,
    guardianWallet: data.guardianWallet,
    guardianshipType: data.guardianshipType,
    validUntil: validUntil.toString(),
  });

  return { txHash };
}

/**
 * Validate that caller is the admin (deployer acts as certifier).
 * Note: On-chain the caller must have CERTIFIER role in IdentityRegistry.
 * If the deployer is ADMIN only, the tx will revert with "No autorizado".
 * The deployer must also be registered as CERTIFIER (or a separate certifier
 * wallet must be configured) for this to succeed on-chain.
 */
async function validateGrantGuardianship(
  _data: GrantGuardianshipData,
  auth: AuthContext,
): Promise<boolean> {
  // Only admin can act as certifier for now
  return await isVerifiedAdmin(auth.wallet);
}

export const grantGuardianshipOnChain = withAuth(grantGuardianshipHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateGrantGuardianship,
});
