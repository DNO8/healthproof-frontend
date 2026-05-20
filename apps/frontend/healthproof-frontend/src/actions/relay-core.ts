"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ForwarderAbi from "@/lib/abis/HealthProofTrustedForwarder.json";
import { getDeployerPrivateKey } from "@/lib/auth/with-auth";
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

export async function executeForwardRequest(
  request: SignedForwardRequest
): Promise<{ txHash: `0x${string}`; success: boolean }> {
  const { publicClient, walletClient } = await getRelayerClients();

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
