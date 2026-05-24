"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import MedicalDocumentRegistryAbi from "@/lib/abis/MedicalDocumentRegistry.json";
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface RegisterDocumentData {
  cid: string;
  fileHash: string;
  patientWallet: string;
  documentType?: string;
}

/**
 * Register a medical document on-chain using the deployer key.
 * Requires authentication. Caller must be the patient or a guardian.
 */
async function registerDocumentHandler(
  data: RegisterDocumentData,
  auth: AuthContext
): Promise<{ txHash: string; documentId: string }> {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  // documentId = keccak256(cid)
  const documentId = keccak256(toHex(data.cid));
  // clinicalHash = keccak256(fileHash)
  const clinicalHash = keccak256(toHex(data.fileHash));
  // documentType as bytes32 (or zero)
  const documentType = data.documentType
    ? stringToHex(data.documentType, { size: 32 })
    : ZERO_BYTES32;

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.MedicalDocumentRegistry as `0x${string}`,
    abi: MedicalDocumentRegistryAbi,
    functionName: "registerDocument",
    args: [
      documentId,
      data.patientWallet as `0x${string}`,
      ZERO_ADDRESS, // institution — not used for MVP
      documentType,
      clinicalHash,
      ZERO_BYTES32, // episodeId — not used for MVP
      data.cid,
      ZERO_BYTES32, // standard
      ZERO_BYTES32, // classification
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, documentId, AuditAction.DOCUMENT_REGISTERED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("registerDocumentOnChain", auth, true, {
    patientWallet: data.patientWallet,
    documentId,
    cid: data.cid,
  });

  return { txHash, documentId };
}

export const registerDocumentOnChain = withAuth(registerDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});

