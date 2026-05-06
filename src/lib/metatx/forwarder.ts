"use client";

import {
  createPublicClient,
  http,
  encodeFunctionData,
  type WalletClient,
  type PublicClient,
} from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import ForwarderAbi from "@/lib/abis/HealthProofTrustedForwarder.json";
import { FORWARD_REQUEST_TYPE, type ForwardRequest, type SignedForwardRequest } from "./types";

const DOMAIN_NAME = "HealthProof";
const DOMAIN_VERSION = "1";
const DEFAULT_GAS = BigInt(300000);
const DEADLINE_MINUTES = 10;

let cachedForwarderAddress: `0x${string}` | null = null;

/**
 * Query any registry for its trustedForwarder address.
 * All registries share the same forwarder (set at initialization).
 */
export async function getTrustedForwarderAddress(
  publicClient?: PublicClient
): Promise<`0x${string}`> {
  if (cachedForwarderAddress) return cachedForwarderAddress;

  const client =
    publicClient ??
    createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    });

  const addr = (await client.readContract({
    address: CONTRACT_ADDRESSES.MedicalOrderRegistry,
    abi: MedicalOrderRegistryAbi,
    functionName: "trustedForwarder",
    args: [],
  })) as `0x${string}`;

  cachedForwarderAddress = addr;
  return addr;
}

/**
 * Get the next nonce for a given signer from the forwarder contract.
 */
export async function getForwarderNonce(
  from: `0x${string}`,
  publicClient?: PublicClient
): Promise<bigint> {
  const forwarder = await getTrustedForwarderAddress(publicClient);
  const client =
    publicClient ??
    createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    });

  return (await client.readContract({
    address: forwarder,
    abi: ForwarderAbi,
    functionName: "nonces",
    args: [from],
  })) as bigint;
}

/**
 * Build an EIP-712 domain object for the forwarder.
 */
async function buildDomain(
  forwarderAddress: `0x${string}`
): Promise<{
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}> {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId: HEALTHPROOF_CHAIN.id,
    verifyingContract: forwarderAddress,
  };
}

/**
 * Create and sign a ForwardRequest for EIP-2771 meta-transaction.
 *
 * @param walletClient - viem WalletClient connected to user's wallet (e.g. Privy embedded)
 * @param targetContract - Address of the contract to call (e.g. HealthProofGateway)
 * @param functionName - Name of the function to call
 * @param args - Arguments for the function
 * @param abi - ABI of the target contract
 * @param value - Native token value to send (default 0)
 * @param gas - Gas limit (default 300k)
 */
export async function signMetaTransaction(
  walletClient: WalletClient,
  targetContract: `0x${string}`,
  functionName: string,
  args: readonly unknown[],
  abi: readonly unknown[],
  value: bigint = BigInt(0),
  gas: bigint = DEFAULT_GAS
): Promise<SignedForwardRequest> {
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error("No wallet account available");

  const forwarderAddress = await getTrustedForwarderAddress();
  const nonce = await getForwarderNonce(account);
  const deadline = BigInt(
    Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60
  );
  const data = encodeFunctionData({
    abi,
    functionName,
    args,
  });

  const domain = await buildDomain(forwarderAddress);

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: FORWARD_REQUEST_TYPE,
    primaryType: "ForwardRequest",
    message: {
      from: account,
      to: targetContract,
      value,
      gas,
      nonce,
      deadline: Number(deadline),
      data,
    },
  });

  const signedRequest: SignedForwardRequest = {
    from: account,
    to: targetContract,
    value,
    gas,
    nonce,
    deadline,
    data,
    signature,
  };

  return signedRequest;
}

/**
 * Convenience helper: sign a call to HealthProofGateway.
 */
export async function signGatewayMetaTx(
  walletClient: WalletClient,
  functionName: string,
  args: readonly unknown[],
  gatewayAbi: readonly unknown[],
  value?: bigint,
  gas?: bigint
): Promise<SignedForwardRequest> {
  return signMetaTransaction(
    walletClient,
    CONTRACT_ADDRESSES.HealthProofGateway,
    functionName,
    args,
    gatewayAbi,
    value,
    gas
  );
}
