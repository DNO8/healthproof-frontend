"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import GuardianRegistryArtifact from "@/lib/abis/GuardianRegistry.json";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";

const GuardianRegistryAbi = GuardianRegistryArtifact.abi;

import { isVerifiedAdmin } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import {
  auditLog,
  getDeployerPrivateKey,
  withAuth,
} from "@/lib/auth/with-auth";
import { ContractRole } from "@/types/domain.types";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

async function getClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
  return { publicClient, walletClient, account };
}

/**
 * One-time setup: register deployer as CERTIFIER + verify it.
 * Requires admin authentication.
 */
async function setupCertifierHandler(
  _data: Record<string, never>,
  auth: AuthContext,
): Promise<{ txHash: string; alreadyCertifier?: boolean }> {
  const { publicClient, walletClient, account } = await getClients();

  // Check if deployer already has a role
  const existing = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "getRole",
    args: [account.address],
  });

  if ((existing as number) === ContractRole.CERTIFIER) {
    return { txHash: "already-certifier", alreadyCertifier: true };
  }

  // Register deployer as CERTIFIER (role=4)
  const regTx = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "registerEntity",
    args: [
      account.address,
      ContractRole.CERTIFIER,
      "platform-admin",
      "0x0000000000000000000000000000000000000000" as `0x${string}`,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: regTx });

  // Verify deployer
  const verifyTx = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "verifyEntity",
    args: [account.address],
  });
  await publicClient.waitForTransactionReceipt({ hash: verifyTx });

  auditLog("setupDeployerAsCertifier", auth, true, {
    deployer: account.address,
  });

  return { txHash: verifyTx };
}

export const setupDeployerAsCertifier = withAuth(setupCertifierHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 2 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

interface RegisterGuardianData {
  patientWallet: string;
}

/**
 * Register the deployer as a guardian for a patient.
 * Requires admin authentication.
 */
async function registerGuardianHandler(
  data: RegisterGuardianData,
  auth: AuthContext,
): Promise<{ txHash: string; alreadyGuardian?: boolean }> {
  const { publicClient, walletClient, account } = await getClients();

  // Check if already a guardian
  const isAlready = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
    abi: GuardianRegistryAbi,
    functionName: "isGuardian",
    args: [data.patientWallet as `0x${string}`, account.address],
  });

  if (isAlready) {
    return { txHash: "already-guardian", alreadyGuardian: true };
  }

  // grantGuardianship(patient, guardian, gType=3 VOLUNTARY_DELEGATION, legalDocHash=0, validUntil=0)
  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
    abi: GuardianRegistryAbi,
    functionName: "grantGuardianship",
    args: [
      data.patientWallet as `0x${string}`,
      account.address,
      3, // VOLUNTARY_DELEGATION
      ZERO_BYTES32,
      BigInt(0), // no expiry
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  auditLog("registerDeployerAsGuardian", auth, true, {
    patientWallet: data.patientWallet,
    guardian: account.address,
  });

  return { txHash };
}

export const registerDeployerAsGuardian = withAuth(registerGuardianHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});
