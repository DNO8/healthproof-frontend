"use server";

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { env } from "@/lib/env";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext, AuthResponse } from "@/lib/auth/with-auth";
import { isVerifiedAdmin } from "@/lib/auth/permissions";
import type { ContractRole } from "@/types/domain.types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

async function getClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const prefixed = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = privateKeyToAccount(prefixed as `0x${string}`);
  const rpcUrl = env.RPC_URL;

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(rpcUrl, { timeout: 30000 }),
  });

  const walletClient = createWalletClient({
    account,
    chain: HEALTHPROOF_CHAIN,
    transport: http(rpcUrl, { timeout: 30000 }),
  });

  return { publicClient, walletClient, account };
}

interface RegisterEntityData {
  wallet: string;
  role: ContractRole;
  specialty?: string;
  institution?: string;
}

async function registerEntityHandler(
  data: RegisterEntityData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient, account } = await getClients();

  const walletAddr = data.wallet as `0x${string}`;
  const institutionAddr = (data.institution ?? ZERO_ADDRESS) as `0x${string}`;

  const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
      abi: IdentityRegistryAbi,
      functionName: "registerEntity",
      args: [walletAddr, data.role, data.specialty ?? "", institutionAddr],
    });

    const txHash = await walletClient.writeContract(request);

    try {
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 });
    } catch (waitErr) {
      const waitMsg = waitErr instanceof Error ? waitErr.message : String(waitErr);
      if (waitMsg.toLowerCase().includes("timed out")) {
        console.warn("registerEntityOnChain: receipt timeout, TX submitted:", txHash);
        // Transaction was submitted successfully even if receipt timed out
      } else {
        throw waitErr;
      }
    }

    auditLog("registerEntityOnChain", auth, true, {
      wallet: data.wallet,
      role: data.role,
    });

    return { txHash };
}

async function validateAdminOrSelf(data: unknown, auth: AuthContext): Promise<boolean> {
  const isAdmin = await isVerifiedAdmin(auth.wallet);
  if (isAdmin) return true;
  // Allow users to register their own wallet
  const payload = data as RegisterEntityData;
  return payload.wallet.toLowerCase() === auth.wallet.toLowerCase();
}

export const registerEntityOnChain = withAuth<RegisterEntityData, { txHash: string }>(registerEntityHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateAdminOrSelf,
});

async function verifyEntityHandler(
  data: { wallet: string },
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient, account } = await getClients();

  const walletAddr = data.wallet as `0x${string}`;

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "verifyEntity",
    args: [walletAddr],
  });

  const txHash = await walletClient.writeContract(request);

  try {
    await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 });
  } catch (waitErr) {
    const waitMsg = waitErr instanceof Error ? waitErr.message : String(waitErr);
    if (waitMsg.toLowerCase().includes("timed out")) {
      console.warn("verifyEntityOnChain: receipt timeout, TX submitted:", txHash);
    } else {
      throw waitErr;
    }
  }

  auditLog("verifyEntityOnChain", auth, true, {
    wallet: data.wallet,
  });

  return { txHash };
}

async function verifyAdminOrSelf(data: unknown, auth: AuthContext): Promise<boolean> {
  const isAdmin = await isVerifiedAdmin(auth.wallet);
  if (isAdmin) return true;
  const payload = data as { wallet: string };
  return payload.wallet.toLowerCase() === auth.wallet.toLowerCase();
}

export const verifyEntityOnChain = withAuth<{ wallet: string }, { txHash: string }>(verifyEntityHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
  requireOnChainPermission: verifyAdminOrSelf,
});

async function getEntityHandler(
  data: { wallet: string },
  _auth: AuthContext
): Promise<{
  role: number;
  specialty: string;
  institution: string;
  verified: boolean;
} | null> {
  const { publicClient } = await getClients();

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "entities",
    args: [data.wallet as `0x${string}`],
  });

  const [, role, specialty, institution, verified] = result as [
    string,
    number,
    string,
    string,
    boolean,
  ];

  if (role === 0 && !verified && specialty === "") {
    return null;
  }

  return { role, specialty, institution, verified };
}

type EntityData = { role: number; specialty: string; institution: string; verified: boolean } | null;
export const getEntityOnChain = withAuth<{ wallet: string }, EntityData>(getEntityHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

async function getRoleHandler(
  data: { wallet: string },
  _auth: AuthContext
): Promise<number | null> {
  const { publicClient } = await getClients();

  const role = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryAbi,
    functionName: "getRole",
    args: [data.wallet as `0x${string}`],
  });

  return role as number;
}

export const getRoleOnChain = withAuth(getRoleHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});

