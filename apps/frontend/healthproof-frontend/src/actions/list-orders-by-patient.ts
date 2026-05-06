"use server";

import { createPublicClient, http } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

interface ListOrdersParams {
  patientWallet: string;
  offset?: number;
  limit?: number;
}

interface OrderRef {
  orderId: string;
  status: number;
}

async function handler(
  data: ListOrdersParams,
  _auth: AuthContext
): Promise<{ orders: OrderRef[]; total: number }> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });

  const [orderIds, total] = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
    abi: MedicalOrderRegistryAbi,
    functionName: "getOrdersByPatient",
    args: [
      data.patientWallet as `0x${string}`,
      BigInt(data.offset ?? 0),
      BigInt(data.limit ?? 50),
    ],
  })) as [string[], bigint];

  // Fetch status for each order
  const orders: OrderRef[] = [];
  for (const orderId of orderIds) {
    try {
      const order = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
        abi: MedicalOrderRegistryAbi,
        functionName: "orders",
        args: [orderId as `0x${string}`],
      })) as {
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
      if (Number(order.createdAt) !== 0) {
        orders.push({ orderId, status: order.status });
      }
    } catch {
      // skip invalid
    }
  }

  return { orders, total: Number(total) };
}

export const listOrdersByPatient = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
