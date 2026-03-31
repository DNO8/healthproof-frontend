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
import { env } from "@/lib/env";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Register a medical document on-chain using the deployer key.
 * Called after IPFS upload + save to document_secrets.
 */
export async function registerDocumentOnChain(data: {
  cid: string;
  fileHash: string;
  patientWallet: string;
  documentType?: string;
}): Promise<{ success: true; txHash: string; documentId: string } | { error: string }> {
  try {
    const pk = env.DEPLOYER_PRIVATE_KEY;
    if (!pk) return { error: "DEPLOYER_PRIVATE_KEY not set" };

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

    return { success: true, txHash, documentId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[registerDocumentOnChain]", msg);
    return { error: msg };
  }
}

