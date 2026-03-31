"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  stringToHex,
  fromHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import { env } from "@/lib/env";
import type { OnChainOrder } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

function getClients() {
  const pk = env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${pk.replace(/^0x/, "")}` as `0x${string}`,
  );
  return {
    publicClient: createPublicClient({ chain: HEALTHPROOF_CHAIN, transport: http() }),
    walletClient: createWalletClient({ account, chain: HEALTHPROOF_CHAIN, transport: http() }),
    account,
  };
}

// ─── Create Medical Order (via Gateway → MedicalOrderRegistry) ───
// Gateway is registered as DOCTOR+verified, so it passes onlyDoctor check.

export async function createMedicalOrderOnChain(data: {
  patientWallet: string;
  examType: string;
  orderType?: string;
  episodeId?: string;
  institution?: string;
}): Promise<
  { success: true; txHash: string; orderId: string } | { error: string }
> {
  try {
    const { publicClient, walletClient } = getClients();

    const orderId = keccak256(
      toHex(`${data.patientWallet}-${data.examType}-${Date.now()}`),
    );
    const episodeId = data.episodeId
      ? data.episodeId.startsWith("0x") && data.episodeId.length === 66
        ? (data.episodeId as `0x${string}`)
        : keccak256(toHex(data.episodeId))
      : ZERO_BYTES32;
    const orderType = data.orderType
      ? stringToHex(data.orderType, { size: 32 })
      : stringToHex("EXAM", { size: 32 });
    const examType = stringToHex(data.examType, { size: 32 });
    const institution = (data.institution as `0x${string}`) ?? ZERO_ADDRESS;

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
      abi: HealthProofGatewayAbi,
      functionName: "createMedicalOrder",
      args: [
        orderId,
        data.patientWallet as `0x${string}`,
        institution,
        episodeId,
        orderType,
        examType,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash, orderId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createMedicalOrderOnChain]", msg);
    return { error: msg };
  }
}

// ─── Assign Lab to Order ───
// assignLab on the registry requires msg.sender == order.doctor.
// The doctor on the order is the Gateway address (since Gateway called createOrder).
// We can't call "from" the Gateway, so we call the registry directly.
// This will work only if the deployer happens to be the doctor — otherwise it fails gracefully.

export async function assignLabToOrder(data: {
  orderId: string;
  labWallet: string;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient } = getClients();

    const orderIdBytes =
      data.orderId.startsWith("0x") && data.orderId.length === 66
        ? (data.orderId as `0x${string}`)
        : keccak256(toHex(data.orderId));

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
      abi: MedicalOrderRegistryAbi,
      functionName: "assignLab",
      args: [orderIdBytes, data.labWallet as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[assignLabToOrder]", msg);
    return { error: msg };
  }
}

// ─── Update Order Status ───
// updateStatus requires msg.sender == assignedLab || doctor.

export async function updateOrderStatusOnChain(data: {
  orderId: string;
  status: number;
}): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const { publicClient, walletClient } = getClients();

    const orderIdBytes =
      data.orderId.startsWith("0x") && data.orderId.length === 66
        ? (data.orderId as `0x${string}`)
        : keccak256(toHex(data.orderId));

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
      abi: MedicalOrderRegistryAbi,
      functionName: "updateStatus",
      args: [orderIdBytes, data.status],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateOrderStatusOnChain]", msg);
    return { error: msg };
  }
}

// ─── Get Order (read-only) ───

export async function getOrderOnChain(
  orderId: string,
): Promise<OnChainOrder | null> {
  try {
    const { publicClient } = getClients();

    const orderIdBytes =
      orderId.startsWith("0x") && orderId.length === 66
        ? (orderId as `0x${string}`)
        : keccak256(toHex(orderId));

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
      abi: MedicalOrderRegistryAbi,
      functionName: "getOrder",
      args: [orderIdBytes],
    });

    const order = result as {
      patient: string;
      doctor: string;
      institution: string;
      episodeId: `0x${string}`;
      orderType: `0x${string}`;
      examType: `0x${string}`;
      assignedLab: string;
      status: number;
      createdAt: bigint;
    };

    if (Number(order.createdAt) === 0) return null;

    return {
      orderId,
      patient: order.patient,
      doctor: order.doctor,
      institution: order.institution,
      episodeId: order.episodeId,
      orderType: fromHex(order.orderType, "string").replace(/\0+$/, ""),
      examType: fromHex(order.examType, "string").replace(/\0+$/, ""),
      assignedLab: order.assignedLab,
      status: Number(order.status),
      createdAt: Number(order.createdAt),
    };
  } catch (err) {
    console.error("[getOrderOnChain]", err);
    return null;
  }
}

