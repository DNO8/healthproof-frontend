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
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import ClinicalEpisodeRegistryAbi from "@/lib/abis/ClinicalEpisodeRegistry.json";
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor } from "@/lib/auth/permissions";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

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

interface OpenEpisodeData {
  patientWallet: string;
  episodeType: string;
  classification?: string;
  institution?: string;
}

// ─── Open Episode (via Gateway → ClinicalEpisodeRegistry) ───
// Requires authenticated verified doctor

async function openEpisodeHandler(
  data: OpenEpisodeData,
  auth: AuthContext
): Promise<{ txHash: string; episodeId: string }> {
  const { publicClient, walletClient, account } = await getClients();

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
      account.address,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, episodeId, AuditAction.EPISODE_OPENED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("openEpisodeOnChain", auth, true, {
    patientWallet: data.patientWallet,
    episodeType: data.episodeType,
    episodeId,
  });

  return { txHash, episodeId };
}

async function validateOpenEpisode(data: OpenEpisodeData, auth: AuthContext): Promise<boolean> {
  return await isVerifiedDoctor(auth.wallet);
}

export const openEpisodeOnChain = withAuth(openEpisodeHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateOpenEpisode,
});

interface CloseEpisodeData {
  episodeId: string;
}

// ─── Close Episode ───
// Calls closeEpisodeViaGateway on HealthProofGateway.
// NOTE: Requires EIP-2771 meta-transactions (Phase 2) to work on-chain
// because the Gateway requires doctor == _msgSender().

async function closeEpisodeHandler(
  data: CloseEpisodeData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient, account } = await getClients();

  const episodeIdBytes =
    data.episodeId.startsWith("0x") && data.episodeId.length === 66
      ? (data.episodeId as `0x${string}`)
      : keccak256(toHex(data.episodeId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
    abi: HealthProofGatewayAbi,
    functionName: "closeEpisodeViaGateway",
    args: [episodeIdBytes, account.address],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  auditLog("closeEpisodeOnChain", auth, true, {
    episodeId: data.episodeId,
  });

  return { txHash };
}

async function validateCloseEpisode(data: CloseEpisodeData, auth: AuthContext): Promise<boolean> {
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
  const { publicClient } = await getClients();

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

