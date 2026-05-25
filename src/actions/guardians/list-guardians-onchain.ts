"use server";

import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import GuardianRegistryArtifact from "@/lib/abis/GuardianRegistry.json";
const GuardianRegistryAbi = GuardianRegistryArtifact.abi;
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { OnChainGuardianship } from "@/lib/medical-constants";

interface ListGuardiansParams {
  patientWallet: string;
}

async function handler(
  data: ListGuardiansParams,
  _auth: AuthContext,
): Promise<{ guardianships: OnChainGuardianship[] }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const guardianships: OnChainGuardianship[] = [];
  const maxIndex = 20;

  for (let i = 0; i < maxIndex; i++) {
    try {
      const g = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.GuardianRegistry as `0x${string}`,
        abi: GuardianRegistryAbi,
        functionName: "guardians",
        args: [data.patientWallet as `0x${string}`, BigInt(i)],
      })) as {
        guardian: string;
        certifier: string;
        gType: number;
        legalDocHash: `0x${string}`;
        validUntil: bigint;
        active: boolean;
      };

      guardianships.push({
        guardian: g.guardian,
        certifier: g.certifier,
        gType: g.gType,
        legalDocHash: g.legalDocHash,
        validUntil: Number(g.validUntil),
        active: g.active,
      });
    } catch {
      break;
    }
  }

  return { guardianships };
}

export const listGuardiansOnChain = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
