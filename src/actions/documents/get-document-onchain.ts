"use server";

import { createPublicClient, http } from "viem";
import MedicalDocumentRegistryAbi from "@/lib/abis/MedicalDocumentRegistry.json";
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import type { OnChainDocument } from "@/lib/medical-constants";

interface GetDocumentParams {
  documentId: string;
}

async function handler(
  data: GetDocumentParams,
  _auth: AuthContext,
): Promise<{ document: OnChainDocument | null }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const documentIdHex =
    data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : (`0x${data.documentId.padStart(64, "0")}` as `0x${string}`);

  const doc = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.MedicalDocumentRegistry as `0x${string}`,
    abi: MedicalDocumentRegistryAbi,
    functionName: "documents",
    args: [documentIdHex],
  })) as {
    patient: string;
    issuer: string;
    institution: string;
    documentType: `0x${string}`;
    clinicalHash: `0x${string}`;
    episodeId: `0x${string}`;
    cid: string;
    standard: `0x${string}`;
    classification: `0x${string}`;
    createdAt: bigint;
  };

  if (!doc.cid || doc.cid === "") {
    return { document: null };
  }

  return {
    document: {
      patient: doc.patient,
      issuer: doc.issuer,
      institution: doc.institution,
      documentType: doc.documentType,
      clinicalHash: doc.clinicalHash,
      episodeId: doc.episodeId,
      cid: doc.cid,
      standard: doc.standard,
      classification: doc.classification,
      createdAt: Number(doc.createdAt),
    },
  };
}

export const getDocumentOnChain = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
