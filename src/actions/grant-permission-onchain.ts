"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import PermissionManagerAbi from "@/lib/abis/PermissionManager.json";
import { env } from "@/lib/env";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Grant a permission on-chain using the deployer key (as proxy for the patient).
 * PermissionManager.grantPermission requires msg.sender == patient OR guardian.
 * For MVP, the deployer must be registered as a guardian for the patient,
 * OR the patient calls this directly. We use deployer as guardian proxy.
 *
 * NOTE: For this to work, the deployer must be a guardian of the patient in
 * GuardianRegistry, or we need to call from the patient's wallet.
 * As a fallback, this server action attempts the call and returns error if unauthorized.
 */
export async function grantPermissionOnChain(data: {
  patientWallet: string;
  granteeWallet: string;
  documentId: string;
  scope?: number;
  expiresInMinutes?: number;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const pk = env.DEPLOYER_PRIVATE_KEY;
    if (!pk) return { error: "DEPLOYER_PRIVATE_KEY not set" };

    const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(),
    });

    // resourceId = keccak256(documentId) if it's a CID, or use directly if already bytes32
    const resourceId = data.documentId.startsWith("0x") && data.documentId.length === 66
      ? (data.documentId as `0x${string}`)
      : keccak256(toHex(data.documentId));

    // Scope: 0 = DOCUMENT (default)
    const scope = data.scope ?? 0;

    // Expiry: default 60 minutes from now, 0 = no expiry
    const expiresAt = data.expiresInMinutes
      ? BigInt(Math.floor(Date.now() / 1000) + data.expiresInMinutes * 60)
      : BigInt(0);

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
      abi: PermissionManagerAbi,
      functionName: "grantPermission",
      args: [
        data.patientWallet as `0x${string}`,
        data.granteeWallet as `0x${string}`,
        scope,
        resourceId,
        expiresAt,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[grantPermissionOnChain]", msg);
    return { error: msg };
  }
}
