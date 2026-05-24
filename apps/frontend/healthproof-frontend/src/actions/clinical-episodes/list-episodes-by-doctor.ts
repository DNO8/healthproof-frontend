"use server";

import { createPublicClient, http, fromHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ClinicalEpisodeRegistryAbi from "@/lib/abis/ClinicalEpisodeRegistry.json";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";
import type { OnChainEpisode } from "@/lib/medical-constants";

interface ListEpisodesParams {
  doctorWallet: string;
  offset?: number;
  limit?: number;
}

async function handler(
  data: ListEpisodesParams,
  _auth: AuthContext
): Promise<{ episodes: OnChainEpisode[]; total: number }> {
  console.log("[listEpisodesByDoctor] Input:", data);
  console.log("[listEpisodesByDoctor] ClinicalEpisodeRegistry address:", CONTRACT_ADDRESSES.ClinicalEpisodeRegistry);

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  let episodeIds: string[] = [];
  let total: bigint = BigInt(0);

  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
      abi: ClinicalEpisodeRegistryAbi,
      functionName: "getEpisodesByDoctor",
      args: [
        data.doctorWallet as `0x${string}`,
        BigInt(data.offset ?? 0),
        BigInt(data.limit ?? 50),
      ],
    });
    [episodeIds, total] = result as [string[], bigint];
    console.log("[listEpisodesByDoctor] Raw result:", { episodeIds, total: total.toString() });
  } catch (err) {
    console.error("[listEpisodesByDoctor] readContract getEpisodesByDoctor FAILED:", err);
    throw err;
  }

  const episodes: OnChainEpisode[] = [];
  for (const episodeId of episodeIds) {
    try {
      console.log("[listEpisodesByDoctor] Fetching episode:", episodeId);
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
        abi: ClinicalEpisodeRegistryAbi,
        functionName: "getEpisode",
        args: [episodeId as `0x${string}`],
      });
      console.log("[listEpisodesByDoctor] Raw episode result:", raw);
      const ep = raw as {
        patient: string;
        openedBy: string;
        institution: string;
        episodeType: `0x${string}`;
        classification: `0x${string}`;
        openedAt: bigint;
        active: boolean;
      };
      console.log("[listEpisodesByDoctor] Episode detail:", { episodeId, openedAt: ep.openedAt.toString() });
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
    } catch (epErr) {
      console.error("[listEpisodesByDoctor] Error fetching episode", episodeId, epErr);
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

  console.log("[listEpisodesByDoctor] Returning:", { count: enriched.length, total: Number(total) });
  return { episodes: enriched, total: Number(total) };
}

export const listEpisodesByDoctor = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
