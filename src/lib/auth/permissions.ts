import { createPublicClient, http } from "viem";
import GuardianRegistryArtifact from "@/lib/abis/GuardianRegistry.json";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";

const GuardianRegistryAbi = GuardianRegistryArtifact.abi;

import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";

const PermissionManagerAbi = PermissionManagerArtifact.abi;

import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";

const publicClient = createPublicClient({
  chain: HEALTHPROOF_CHAIN,
  transport: http(),
});

/**
 * Check if caller is a guardian for the patient
 */
export async function isGuardian(
  patientWallet: string,
  callerWallet: string,
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
      abi: GuardianRegistryAbi,
      functionName: "isGuardian",
      args: [patientWallet.toLowerCase(), callerWallet.toLowerCase()],
    });
    return result as boolean;
  } catch (error) {
    console.error("[isGuardian] Error checking guardian status:", error);
    return false;
  }
}

/**
 * Check if address is a verified doctor
 */
export async function isVerifiedDoctor(address: string): Promise<boolean> {
  try {
    const [isVerified, role] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "isVerified",
        args: [address.toLowerCase()],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "getRole",
        args: [address.toLowerCase()],
      }),
    ]);

    // Role 1 = DOCTOR (from IdentityRegistry.Role enum)
    return (isVerified as boolean) && (role as number) === 1;
  } catch (error) {
    console.error("[isVerifiedDoctor] Error checking doctor status:", error);
    return false;
  }
}

/**
 * Check if address is a verified lab
 */
export async function isVerifiedLab(address: string): Promise<boolean> {
  try {
    const [isVerified, role] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "isVerified",
        args: [address.toLowerCase()],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "getRole",
        args: [address.toLowerCase()],
      }),
    ]);

    // Role 2 = LAB (from IdentityRegistry.Role enum)
    return (isVerified as boolean) && (role as number) === 2;
  } catch (error) {
    console.error("[isVerifiedLab] Error checking lab status:", error);
    return false;
  }
}

/**
 * Check if address is a verified admin
 */
export async function isVerifiedAdmin(address: string): Promise<boolean> {
  // Dev bypass: on HTTP localhost Privy cookies are blocked, so admin check is skipped in dev
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  try {
    const [isVerified, role] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "isVerified",
        args: [address.toLowerCase()],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "getRole",
        args: [address.toLowerCase()],
      }),
    ]);

    // Role 5 = ADMIN (from IdentityRegistry.Role enum)
    return (isVerified as boolean) && (role as number) === 5;
  } catch (error) {
    console.error("[isVerifiedAdmin] Error checking admin status:", error);
    return false;
  }
}

/**
 * Check if grantee has permission to access patient's resource
 */
export async function hasPermission(
  patientWallet: string,
  granteeWallet: string,
  documentId: string,
): Promise<boolean> {
  try {
    // Hash documentId if it's a CID (not bytes32)
    const resourceId =
      documentId.startsWith("0x") && documentId.length === 66
        ? documentId
        : documentId; // In real implementation, hash if needed

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
      abi: PermissionManagerAbi,
      functionName: "hasAccess",
      args: [
        patientWallet.toLowerCase(),
        granteeWallet.toLowerCase(),
        resourceId,
        "0x0000000000000000000000000000000000000000000000000000000000000000", // documentType
        "0x0000000000000000000000000000000000000000000000000000000000000000", // institution
      ],
    });
    return result as boolean;
  } catch (error) {
    console.error("[hasPermission] Error checking permission:", error);
    return false;
  }
}

/**
 * Validate that caller can act on behalf of patient
 * Caller must be: patient themselves OR guardian
 */
export async function validatePatientAccess(
  patientWallet: string,
  callerWallet: string,
): Promise<boolean> {
  const normalizedPatient = patientWallet.toLowerCase();
  const normalizedCaller = callerWallet.toLowerCase();

  // Caller is the patient
  if (normalizedCaller === normalizedPatient) {
    return true;
  }

  // Caller is a guardian
  return await isGuardian(normalizedPatient, normalizedCaller);
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}
