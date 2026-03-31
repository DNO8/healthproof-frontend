"use server";

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "@/lib/env";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import GuardianRegistryAbi from "@/lib/abis/GuardianRegistry.json";
import { ContractRole } from "@/types/domain.types";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

function getClients() {
  const pk = env.DEPLOYER_PRIVATE_KEY;
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
 * This allows the deployer to grant guardianships for patients.
 */
export async function setupDeployerAsCertifier(): Promise<
  { success: true; txHash: string } | { error: string }
> {
  try {
    const { publicClient, walletClient, account } = getClients();

    // Check if deployer already has a role
    const existing = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "getRole",
      args: [account.address],
    });

    if ((existing as number) === ContractRole.CERTIFIER) {
      return { success: true, txHash: "already-certifier" };
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

    return { success: true, txHash: verifyTx };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[setupDeployerAsCertifier]", msg);
    return { error: msg };
  }
}

/**
 * Register the deployer as a guardian for a patient.
 * Must be called after setupDeployerAsCertifier.
 * Uses VOLUNTARY_DELEGATION (type=3), validUntil=0 (no expiry).
 */
export async function registerDeployerAsGuardian(
  patientWallet: string,
): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient, account } = getClients();

    // Check if already a guardian
    const isAlready = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
      abi: GuardianRegistryAbi,
      functionName: "isGuardian",
      args: [patientWallet as `0x${string}`, account.address],
    });

    if (isAlready) {
      return { success: true, txHash: "already-guardian" };
    }

    // grantGuardianship(patient, guardian, gType=3 VOLUNTARY_DELEGATION, legalDocHash=0, validUntil=0)
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
      abi: GuardianRegistryAbi,
      functionName: "grantGuardianship",
      args: [
        patientWallet as `0x${string}`,
        account.address,
        3, // VOLUNTARY_DELEGATION
        ZERO_BYTES32,
        BigInt(0), // no expiry
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[registerDeployerAsGuardian]", msg);
    return { error: msg };
  }
}

