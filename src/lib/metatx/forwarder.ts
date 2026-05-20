"use client";

import {
  createPublicClient,
  http,
  encodeFunctionData,
  type WalletClient,
  type PublicClient,
} from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import ForwarderAbi from "@/lib/abis/HealthProofTrustedForwarder.json";
import { FORWARD_REQUEST_TYPE, type ForwardRequest, type SignedForwardRequest } from "./types";

const DOMAIN_NAME = "HealthProof";
const DOMAIN_VERSION = "1";
const DEFAULT_GAS = BigInt(300000);
const DEADLINE_MINUTES = 10;

const forwarderCache = new Map<string, `0x${string}`>();

const TRUSTED_FORWARDER_ABI = [
  {
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Query the target contract for its trustedForwarder address.
 * Each ERC2771Context contract stores its own trusted forwarder.
 */
export async function getTrustedForwarderAddress(
  targetContract: `0x${string}` = CONTRACT_ADDRESSES.HealthProofGateway,
  publicClient?: PublicClient
): Promise<`0x${string}`> {
  const cacheKey = targetContract.toLowerCase();
  const cached = forwarderCache.get(cacheKey);
  if (cached) return cached;

  const client =
    publicClient ??
    createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    });

  const addr = (await client.readContract({
    address: targetContract,
    abi: TRUSTED_FORWARDER_ABI,
    functionName: "trustedForwarder",
    args: [],
  })) as `0x${string}`;

  forwarderCache.set(cacheKey, addr);
  return addr;
}

/**
 * Get the next nonce for a given signer from the forwarder contract.
 */
export async function getForwarderNonce(
  from: `0x${string}`,
  targetContract?: `0x${string}`,
  publicClient?: PublicClient
): Promise<bigint> {
  const forwarder = await getTrustedForwarderAddress(targetContract, publicClient);
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

  const forwarderAddress = await getTrustedForwarderAddress(targetContract);
  const nonce = await getForwarderNonce(account, targetContract);
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
