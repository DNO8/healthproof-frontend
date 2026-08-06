"use client";

/**
 * EIP-2771 ForwardRequest types.
 * Mirrors OpenZeppelin ERC2771Forwarder.ForwardRequestData struct.
 */

export const FORWARD_REQUEST_TYPE = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
} as const;

export interface ForwardRequest {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  deadline: bigint;
  data: `0x${string}`;
}

export interface SignedForwardRequest extends ForwardRequest {
  signature: `0x${string}`;
}

export interface RelayResult {
  txHash: `0x${string}`;
  success: boolean;
}
