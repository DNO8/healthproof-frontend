"use server";

import { createPublicClient, http } from "viem";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import IdentityRegistryAbi from "@/lib/abis/IdentityRegistry.json";
import HealthcareNetworkRegistryAbi from "@/lib/abis/HealthcareNetworkRegistry.json";
import { CONTRACT_TO_ROLE } from "@/types/domain.types";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const RPC_CONCURRENCY = 4;
const RPC_DELAY_MS = 80;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface LabWithNetwork {
  wallet: string;
  fullName: string | null;
  email: string | null;
  networkId: string | null;
  verified: boolean;
}

function getPublicClient() {
  return createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
}

async function getLabInfo(
  publicClient: ReturnType<typeof getPublicClient>,
  wallet: string,
): Promise<{
  isLab: boolean;
  verified: boolean;
  networkId: string | null;
}> {
  try {
    const [entityResult, institutionIdResult] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`,
        abi: IdentityRegistryAbi,
        functionName: "entities",
        args: [wallet as `0x${string}`],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
        abi: HealthcareNetworkRegistryAbi,
        functionName: "walletToInstitution",
        args: [wallet as `0x${string}`],
      }),
    ]);

    const [, role, , , verified] = entityResult as [string, number, string, string, boolean];
    const resolvedRole = CONTRACT_TO_ROLE[role] ?? null;
    if (resolvedRole !== "lab") return { isLab: false, verified: false, networkId: null };

    const instId = institutionIdResult as `0x${string}`;
    let networkId: string | null = null;

    if (instId && instId !== ZERO_BYTES32) {
      const instResult = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
        abi: HealthcareNetworkRegistryAbi,
        functionName: "institutions",
        args: [instId],
      });
      const [, netId] = instResult as [string, string, string, number, string, boolean];
      if (netId && netId !== ZERO_BYTES32) {
        networkId = netId;
      }
    }

    return { isLab: true, verified, networkId };
  } catch {
    return { isLab: false, verified: false, networkId: null };
  }
}

export async function getDoctorNetworkId(doctorWallet: string): Promise<string | null> {
  const publicClient = getPublicClient();
  try {
    const instId = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
      abi: HealthcareNetworkRegistryAbi,
      functionName: "walletToInstitution",
      args: [doctorWallet as `0x${string}`],
    })) as `0x${string}`;

    if (!instId || instId === ZERO_BYTES32) return null;

    const instResult = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.HealthcareNetworkRegistry as `0x${string}`,
      abi: HealthcareNetworkRegistryAbi,
      functionName: "institutions",
      args: [instId],
    });
    const [, netId] = instResult as [string, string, string, number, string, boolean];
    return netId && netId !== ZERO_BYTES32 ? netId : null;
  } catch {
    return null;
  }
}

export async function listLabsWithNetwork(): Promise<LabWithNetwork[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, wallet_address, full_name, email")
    .not("wallet_address", "is", null)
    .order("full_name", { ascending: true });

  if (error || !data) return [];

  const users = data as {
    id: string;
    wallet_address: string;
    full_name: string | null;
    email: string | null;
  }[];

  if (users.length === 0) return [];

  const publicClient = getPublicClient();
  const results: LabWithNetwork[] = [];

  for (let i = 0; i < users.length; i += RPC_CONCURRENCY) {
    const batch = users.slice(i, i + RPC_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map((u) => getLabInfo(publicClient, u.wallet_address)),
    );

    for (let j = 0; j < batch.length; j++) {
      const user = batch[j];
      const info = batchResults[j];
      if (info.isLab) {
        results.push({
          wallet: user.wallet_address,
          fullName: user.full_name,
          email: user.email,
          networkId: info.networkId,
          verified: info.verified,
        });
      }
    }

    if (i + RPC_CONCURRENCY < users.length) {
      await delay(RPC_DELAY_MS);
    }
  }

  return results;
}
