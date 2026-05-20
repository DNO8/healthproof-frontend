"use server";

import { createPublicClient, http, keccak256, toHex, fromHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ClinicalEpisodeRegistryAbi from "@/lib/abis/ClinicalEpisodeRegistry.json";
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor } from "@/lib/auth/permissions";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";
import { executeForwardRequest } from "./relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface OpenEpisodeMetaTx {
  request: SignedForwardRequest;
  patientWallet: string;
  episodeType: string;
  classification?: string;
  episodeId: string;
}

// ─── Open Episode (via EIP-2771 meta-tx → HealthProofGateway) ───
// Requires authenticated verified doctor.
// The frontend signs the meta-tx with the doctor's wallet; the deployer relays it.

async function openEpisodeHandler(
  data: OpenEpisodeMetaTx,
  auth: AuthContext
): Promise<{ txHash: string; episodeId: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  try {
    await logAuditEvent(data.patientWallet, data.episodeId, AuditAction.EPISODE_OPENED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("openEpisodeOnChain", auth, true, {
    patientWallet: data.patientWallet,
    episodeType: data.episodeType,
    episodeId: data.episodeId,
  });

  return { txHash: result.txHash, episodeId: data.episodeId };
}

async function validateOpenEpisode(data: OpenEpisodeMetaTx, auth: AuthContext): Promise<boolean> {
  return await isVerifiedDoctor(auth.wallet);
}

export const openEpisodeOnChain = withAuth(openEpisodeHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateOpenEpisode,
});

interface CloseEpisodeMetaTx {
  request: SignedForwardRequest;
  episodeId: string;
}

// ─── Close Episode ───
// Calls closeEpisodeViaGateway on HealthProofGateway via EIP-2771.

async function closeEpisodeHandler(
  data: CloseEpisodeMetaTx,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("closeEpisodeOnChain", auth, true, {
    episodeId: data.episodeId,
  });

  return { txHash: result.txHash };
}

async function validateCloseEpisode(data: CloseEpisodeMetaTx, auth: AuthContext): Promise<boolean> {
  return await isVerifiedDoctor(auth.wallet);
}

export const closeEpisodeOnChain = withAuth(closeEpisodeHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateCloseEpisode,
});

// ─── Get Episode (read-only) ───
// Requires authentication but no special permissions

async function getEpisodeHandler(
  data: { episodeId: string },
  _auth: AuthContext
): Promise<OnChainEpisode | null> {
  const publicClient = createPublicClient({ chain: HEALTHPROOF_CHAIN, transport: http() });

  const episodeIdBytes =
    data.episodeId.startsWith("0x") && data.episodeId.length === 66
      ? (data.episodeId as `0x${string}`)
      : keccak256(toHex(data.episodeId));

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
    episodeId: data.episodeId,
    patient: ep.patient,
    openedBy: ep.openedBy,
    institution: ep.institution,
    episodeType: fromHex(ep.episodeType, "string").replace(/\0+$/, ""),
    classification: fromHex(ep.classification, "string").replace(/\0+$/, ""),
    openedAt: Number(ep.openedAt),
    active: ep.active,
  };
}

export const getEpisodeOnChain = withAuth(getEpisodeHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});

