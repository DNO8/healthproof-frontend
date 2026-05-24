"use server";

import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofKernelAbi from "@/lib/abis/HealthProofKernel.json";
import { withAuth, getDeployerPrivateKey } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedAdmin } from "@/lib/auth/permissions";

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

// ─── registerModule (write, admin only) ───

interface RegisterModuleData {
  moduleId: string;
  moduleAddress: string;
}

async function registerModuleHandler(
  data: RegisterModuleData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const moduleId = data.moduleId.startsWith("0x") && data.moduleId.length === 66
    ? (data.moduleId as `0x${string}`)
    : keccak256(toHex(data.moduleId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
    abi: HealthProofKernelAbi,
    functionName: "registerModule",
    args: [
      moduleId,
      data.moduleAddress as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

export const registerModuleOnChain = withAuth(registerModuleHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

// ─── upgradeModule (write, admin only) ───

interface UpgradeModuleData {
  moduleId: string;
  newAddress: string;
}

async function upgradeModuleHandler(
  data: UpgradeModuleData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const moduleId = data.moduleId.startsWith("0x") && data.moduleId.length === 66
    ? (data.moduleId as `0x${string}`)
    : keccak256(toHex(data.moduleId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
    abi: HealthProofKernelAbi,
    functionName: "upgradeModule",
    args: [
      moduleId,
      data.newAddress as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

export const upgradeModuleOnChain = withAuth(upgradeModuleHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: async (_data, auth) => isVerifiedAdmin(auth.wallet),
});

// ─── getModule (read-only) ───

interface GetModuleData {
  moduleId: string;
}

async function getModuleHandler(
  data: GetModuleData,
  _auth: AuthContext,
): Promise<{ moduleAddress: string }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const moduleId = data.moduleId.startsWith("0x") && data.moduleId.length === 66
    ? (data.moduleId as `0x${string}`)
    : keccak256(toHex(data.moduleId));

  const moduleAddress = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
    abi: HealthProofKernelAbi,
    functionName: "getModule",
    args: [moduleId],
  })) as string;

  return { moduleAddress };
}

export const getModuleOnChain = withAuth(getModuleHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

// ─── getKernelInfo (read-only) ───

async function getKernelInfoHandler(
  _data: {},
  _auth: AuthContext,
): Promise<{
  admin: string;
  governance: string;
  guardian: string;
  protocolPaused: boolean;
}> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const [admin, governance, guardian, protocolPaused] = await Promise.all([
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "admin",
      args: [],
    }) as Promise<string>,
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "governance",
      args: [],
    }) as Promise<string>,
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "guardian",
      args: [],
    }) as Promise<string>,
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthProofKernel as `0x${string}`,
      abi: HealthProofKernelAbi,
      functionName: "protocolPaused",
      args: [],
    }) as Promise<boolean>,
  ]);

  return { admin, governance, guardian, protocolPaused };
}

export const getKernelInfoOnChain = withAuth(getKernelInfoHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
