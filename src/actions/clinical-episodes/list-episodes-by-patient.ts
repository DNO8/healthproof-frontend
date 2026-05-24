"use server";

import { createPublicClient, http, fromHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ClinicalEpisodeRegistryAbi from "@/lib/abis/ClinicalEpisodeRegistry.json";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";
import type { OnChainEpisode } from "@/lib/medical-constants";

interface ListEpisodesParams {
  patientWallet: string;
  offset?: number;
  limit?: number;
}

async function handler(
  data: ListEpisodesParams,
  _auth: AuthContext
): Promise<{ episodes: OnChainEpisode[]; total: number }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const [episodeIds, total] = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
    abi: ClinicalEpisodeRegistryAbi,
    functionName: "getEpisodesByPatient",
    args: [
      data.patientWallet as `0x${string}`,
      BigInt(data.offset ?? 0),
      BigInt(data.limit ?? 50),
    ],
  })) as [string[], bigint];

  const episodes: OnChainEpisode[] = [];
  for (const episodeId of episodeIds) {
    try {
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
        abi: ClinicalEpisodeRegistryAbi,
        functionName: "getEpisode",
        args: [episodeId as `0x${string}`],
      });
      const ep = raw as {
        patient: string;
        openedBy: string;
        institution: string;
        episodeType: `0x${string}`;
        classification: `0x${string}`;
        openedAt: bigint;
        active: boolean;
      };
      if (Number(ep.openedAt) !== 0) {
        episodes.push({
          episodeId,
          patient: ep.patient,
          openedBy: ep.openedBy,
          institution: ep.institution,
          episodeType: fromHex(ep.episodeType, "string").replace(/\0+$/, ""),
          classification: fromHex(ep.classification, "string").replace(/\0+$/, ""),
          openedAt: Number(ep.openedAt),
          active: ep.active,
        });
      }
    } catch {
      // skip invalid
    }
  }

  // Enrich with names from Supabase
  const allWallets = episodes.flatMap((ep) => [ep.patient, ep.openedBy, ep.institution]);
  const nameMap = await resolveWalletNames(allWallets);

  const enriched = episodes.map((ep) => ({
    ...ep,
    patientName: nameMap.get(ep.patient.toLowerCase()) ?? null,
    openedByName: nameMap.get(ep.openedBy.toLowerCase()) ?? null,
    institutionName: ep.institution && ep.institution !== "0x0000000000000000000000000000000000000000"
      ? (nameMap.get(ep.institution.toLowerCase()) ?? null)
      : null,
  }));

  return { episodes: enriched, total: Number(total) };
}

export const listEpisodesByPatient = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
