"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import HealthcareNetworkRegistryAbi from "@/lib/abis/HealthcareNetworkRegistry.json";
import { isVerifiedAdmin } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import { getDeployerPrivateKey, withAuth } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import type {
  OnChainInstitution,
  OnChainNetwork,
} from "@/lib/medical-constants";

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

// ─── createNetwork (write, admin only) ───

interface CreateNetworkData {
  networkId: string;
  name: string;
  countryCode: string;
}

async function createNetworkHandler(
  data: CreateNetworkData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const networkId =
    data.networkId.startsWith("0x") && data.networkId.length === 66
      ? (data.networkId as `0x${string}`)
      : keccak256(toHex(data.networkId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "createNetwork",
    args: [networkId, data.name, data.countryCode],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

export const createNetworkOnChain = withAuth(createNetworkHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

// ─── registerInstitution (write, admin only) ───

interface RegisterInstitutionData {
  institutionId: string;
  networkId: string;
  wallet: string;
  institutionType: number;
  countryCode: string;
}

async function registerInstitutionHandler(
  data: RegisterInstitutionData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const institutionId =
    data.institutionId.startsWith("0x") && data.institutionId.length === 66
      ? (data.institutionId as `0x${string}`)
      : keccak256(toHex(data.institutionId));

  const networkId =
    data.networkId.startsWith("0x") && data.networkId.length === 66
      ? (data.networkId as `0x${string}`)
      : keccak256(toHex(data.networkId));

  const countryCode = stringToHex(data.countryCode, { size: 32 });

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "registerInstitution",
    args: [
      institutionId,
      networkId,
      data.wallet as `0x${string}`,
      data.institutionType,
      countryCode,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

export const registerInstitutionOnChain = withAuth(registerInstitutionHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

// ─── verifyInstitution (write, admin only) ───

interface VerifyInstitutionData {
  institutionId: string;
}

async function verifyInstitutionHandler(
  data: VerifyInstitutionData,
  _auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const institutionId =
    data.institutionId.startsWith("0x") && data.institutionId.length === 66
      ? (data.institutionId as `0x${string}`)
      : keccak256(toHex(data.institutionId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "verifyInstitution",
    args: [institutionId],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

export const verifyInstitutionOnChain = withAuth(verifyInstitutionHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

// ─── getNetwork (read-only) ───

interface GetNetworkData {
  networkId: string;
}

async function getNetworkHandler(
  data: GetNetworkData,
  _auth: AuthContext,
): Promise<{ network: OnChainNetwork | null }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const networkId =
    data.networkId.startsWith("0x") && data.networkId.length === 66
      ? (data.networkId as `0x${string}`)
      : keccak256(toHex(data.networkId));

  const net = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "networks",
    args: [networkId],
  })) as {
    networkId: `0x${string}`;
    name: string;
    countryCode: string;
    authority: string;
    active: boolean;
  };

  if (!net.active) {
    return { network: null };
  }

  return {
    network: {
      networkId: net.networkId,
      name: net.name,
      countryCode: net.countryCode,
      authority: net.authority,
      active: net.active,
    },
  };
}

export const getNetworkOnChain = withAuth(getNetworkHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

// ─── isVerifiedInstitution (read-only) ───

interface IsVerifiedData {
  wallet: string;
}

async function isVerifiedHandler(
  data: IsVerifiedData,
  _auth: AuthContext,
): Promise<{ verified: boolean; institutionId: string | null }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const verified = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "isVerifiedInstitution",
    args: [data.wallet as `0x${string}`],
  })) as boolean;

  let institutionId: string | null = null;
  try {
    institutionId = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
      abi: HealthcareNetworkRegistryAbi,
      functionName: "walletToInstitution",
      args: [data.wallet as `0x${string}`],
    })) as string;
  } catch {
    institutionId = null;
  }

  return { verified, institutionId };
}

export const isVerifiedInstitutionOnChain = withAuth(isVerifiedHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

// ─── getInstitution (read-only) ───

interface GetInstitutionData {
  institutionId: string;
}

async function getInstitutionHandler(
  data: GetInstitutionData,
  _auth: AuthContext,
): Promise<{ institution: OnChainInstitution | null }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const institutionId =
    data.institutionId.startsWith("0x") && data.institutionId.length === 66
      ? (data.institutionId as `0x${string}`)
      : keccak256(toHex(data.institutionId));

  const inst = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
    abi: HealthcareNetworkRegistryAbi,
    functionName: "institutions",
    args: [institutionId],
  })) as {
    institutionId: `0x${string}`;
    networkId: `0x${string}`;
    wallet: string;
    institutionType: number;
    countryCode: `0x${string}`;
    verified: boolean;
  };

  if (inst.wallet === "0x0000000000000000000000000000000000000000") {
    return { institution: null };
  }

  return {
    institution: {
      institutionId: inst.institutionId,
      networkId: inst.networkId,
      wallet: inst.wallet,
      institutionType: inst.institutionType,
      countryCode: inst.countryCode,
      verified: inst.verified,
    },
  };
}

export const getInstitutionOnChain = withAuth(getInstitutionHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
