"use server";

/**
 * @deprecated This action is deprecated. Use registerDocumentOnChain
 * from @/actions/documents/register-document-onchain instead,
 * which uses EIP-2771 meta-transactions signed by the verified doctor/lab.
 */

import { createPublicClient, createWalletClient, http, keccak256, toHex, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { withAuth, getDeployerPrivateKey } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor, isVerifiedLab } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

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

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface RegisterDocumentGatewayData {
  documentId: string;
  patientWallet: string;
  institution?: string;
  documentType?: string;
  clinicalHash?: string;
  episodeId?: string;
  cid: string;
  standard?: string;
  classification?: string;
}

async function registerDocumentHandler(
  data: RegisterDocumentGatewayData,
  auth: AuthContext,
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const documentId = data.documentId.startsWith("0x") && data.documentId.length === 66
    ? (data.documentId as `0x${string}`)
    : keccak256(toHex(data.documentId));

  const clinicalHash = data.clinicalHash
    ? (data.clinicalHash.startsWith("0x") && data.clinicalHash.length === 66
        ? (data.clinicalHash as `0x${string}`)
        : keccak256(toHex(data.clinicalHash)))
    : ZERO_BYTES32;

  const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;
  const documentType = data.documentType
    ? stringToHex(data.documentType, { size: 32 })
    : ZERO_BYTES32;
  const episodeId = data.episodeId
    ? (data.episodeId.startsWith("0x") && data.episodeId.length === 66
        ? (data.episodeId as `0x${string}`)
        : keccak256(toHex(data.episodeId)))
    : ZERO_BYTES32;
  const standard = data.standard
    ? stringToHex(data.standard, { size: 32 })
    : ZERO_BYTES32;
  const classification = data.classification
    ? stringToHex(data.classification, { size: 32 })
    : ZERO_BYTES32;

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
    abi: HealthProofGatewayAbi,
    functionName: "registerMedicalDocument",
    args: [
      documentId,
      data.patientWallet as `0x${string}`,
      institution,
      documentType,
      clinicalHash,
      episodeId,
      data.cid,
      standard,
      classification,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, documentId, AuditAction.DOCUMENT_REGISTERED);
  } catch {
    // On-chain audit logging is best-effort
  }

  return { txHash };
}

async function validateRegisterDocument(data: RegisterDocumentGatewayData, auth: AuthContext): Promise<boolean> {
  const isDoctor = await isVerifiedDoctor(auth.wallet);
  const isLab = await isVerifiedLab(auth.wallet);
  return isDoctor || isLab;
}

export const registerDocumentGatewayOnChain = withAuth(registerDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateRegisterDocument,
});
