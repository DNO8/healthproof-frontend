"use server";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import ForwarderAbi from "@/lib/abis/HealthProofTrustedForwarder.json";
import { getDeployerPrivateKey } from "@/lib/auth/with-auth";
import { HEALTHPROOF_CHAIN } from "@/lib/contracts";
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
  request: SignedForwardRequest,
): Promise<{ txHash: `0x${string}`; success: boolean }> {
  console.log("[relay-core] executeForwardRequest called with:", {
    from: request.from,
    to: request.to,
    value: request.value.toString(),
    gas: request.gas.toString(),
    deadline: request.deadline.toString(),
    data: request.data,
    signature: `${request.signature.slice(0, 20)}...`,
  });

  const { publicClient, walletClient } = await getRelayerClients();
  console.log("[relay-core] Relayer wallet:", walletClient.account.address);

  const forwarderAddress = (await publicClient.readContract({
    address: request.to,
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
  console.log(
    "[relay-core] Forwarder address from target contract:",
    forwarderAddress,
  );

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
  console.log("[relay-core] Transaction submitted, hash:", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("[relay-core] Receipt received:", {
    status: receipt.status,
    gasUsed: receipt.gasUsed.toString(),
    blockNumber: receipt.blockNumber.toString(),
    logs: receipt.logs.length,
  });

  return {
    txHash,
    success: receipt.status === "success",
  };
}
