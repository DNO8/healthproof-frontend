"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ForwarderAbi from "@/lib/abis/HealthProofTrustedForwarder.json";
import { withAuth, getDeployerPrivateKey } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";

async function getRelayerClients() {
  const pk = await getDeployerPrivateKey();
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    walletClient: createWalletClient({
      account,
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    }),
    account,
  };
}

async function relayHandler(
  request: SignedForwardRequest,
  auth: AuthContext
): Promise<{ txHash: `0x${string}`; success: boolean }> {
  // Verify that the signer matches the authenticated user
  if (request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const { publicClient, walletClient } = await getRelayerClients();

  // Query forwarder address from a registry (all registries share the same)
  const forwarderAddress = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.MedicalOrderRegistry,
    abi: [
      {
        inputs: [],
        name: "trustedForwarder",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "trustedForwarder",
    args: [],
  })) as `0x${string}`;

  // Execute the forward request via relayer
  const txHash = await walletClient.writeContract({
    address: forwarderAddress,
    abi: ForwarderAbi,
    functionName: "execute",
    args: [
      {
        from: request.from,
        to: request.to,
        value: request.value,
        gas: request.gas,
        deadline: request.deadline,
        data: request.data,
        signature: request.signature,
      },
    ],
    value: request.value,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  return {
    txHash,
    success: receipt.status === "success",
  };
}

export const relayMetaTransaction = withAuth(relayHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
