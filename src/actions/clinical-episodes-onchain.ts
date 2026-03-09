"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  stringToHex,
  fromHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import ClinicalEpisodeRegistryAbi from "@/lib/abis/ClinicalEpisodeRegistry.json";
import { env } from "@/lib/env";
import type { OnChainEpisode } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

function getClients() {
  const pk = env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({ chain: avalancheFuji, transport: http() }),
    walletClient: createWalletClient({ account, chain: avalancheFuji, transport: http() }),
    account,
  };
}

// ─── Open Episode (via Gateway → ClinicalEpisodeRegistry) ───
// Gateway is registered as DOCTOR+verified, passes onlyDoctor check.

export async function openEpisodeOnChain(data: {
  patientWallet: string;
  episodeType: string;
  classification?: string;
  institution?: string;
}): Promise<
  { success: true; txHash: string; episodeId: string } | { error: string }
> {
  try {
    const { publicClient, walletClient } = getClients();

    const episodeId = keccak256(
      toHex(`${data.patientWallet}-${data.episodeType}-${Date.now()}`),
    );
    const episodeType = stringToHex(data.episodeType, { size: 32 });
    const classification = data.classification
      ? stringToHex(data.classification, { size: 32 })
      : ZERO_BYTES32;
    const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
      abi: HealthProofGatewayAbi,
      functionName: "createEpisode",
      args: [
        episodeId,
        data.patientWallet as `0x${string}`,
        institution,
        episodeType,
        classification,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash, episodeId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[openEpisodeOnChain]", msg);
    return { error: msg };
  }
}

// ─── Close Episode ───
// closeEpisode requires msg.sender == episode.openedBy (which is the Gateway).
// Same proxy limitation as assignLab. Call registry directly — will only succeed
// if deployer matches the openedBy, which it won't for Gateway-created episodes.
// For MVP this is a best-effort call.

export async function closeEpisodeOnChain(data: {
  episodeId: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient } = getClients();

    const episodeIdBytes =
      data.episodeId.startsWith("0x") && data.episodeId.length === 66
        ? (data.episodeId as `0x${string}`)
        : keccak256(toHex(data.episodeId));

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
      abi: ClinicalEpisodeRegistryAbi,
      functionName: "closeEpisode",
      args: [episodeIdBytes],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[closeEpisodeOnChain]", msg);
    return { error: msg };
  }
}

// ─── Get Episode (read-only) ───

export async function getEpisodeOnChain(
  episodeId: string,
): Promise<OnChainEpisode | null> {
  try {
    const { publicClient } = getClients();

    const episodeIdBytes =
      episodeId.startsWith("0x") && episodeId.length === 66
        ? (episodeId as `0x${string}`)
        : keccak256(toHex(episodeId));

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry as `0x${string}`,
      abi: ClinicalEpisodeRegistryAbi,
      functionName: "getEpisode",
      args: [episodeIdBytes],
    });

    const ep = result as {
      patient: string;
      openedBy: string;
      institution: string;
      episodeType: `0x${string}`;
      classification: `0x${string}`;
      openedAt: bigint;
      active: boolean;
    };

    if (Number(ep.openedAt) === 0) return null;

    return {
      episodeId,
      patient: ep.patient,
      openedBy: ep.openedBy,
      institution: ep.institution,
      episodeType: fromHex(ep.episodeType, "string").replace(/\0+$/, ""),
      classification: fromHex(ep.classification, "string").replace(/\0+$/, ""),
      openedAt: Number(ep.openedAt),
      active: ep.active,
    };
  } catch (err) {
    console.error("[getEpisodeOnChain]", err);
    return null;
  }
}
