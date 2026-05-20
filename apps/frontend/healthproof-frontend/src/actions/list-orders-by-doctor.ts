"use server";

import { createPublicClient, http, fromHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

interface ListOrdersParams {
  doctorWallet: string;
  offset?: number;
  limit?: number;
}

export interface OrderRef {
  orderId: string;
  status: number;
  patient: string;
  doctor: string;
  examType: string;
  assignedLab: string;
  assignedLabName: string | null;
  createdAt: number;
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
    functionName: "getOrdersByDoctor",
    args: [
      data.doctorWallet as `0x${string}`,
      BigInt(data.offset ?? 0),
      BigInt(data.limit ?? 50),
    ],
  })) as [string[], bigint];

  const orders: OrderRef[] = [];
  for (const orderId of orderIds) {
    try {
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
        abi: MedicalOrderRegistryAbi,
        functionName: "getOrder",
        args: [orderId as `0x${string}`],
      });
      const order = raw as {
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
        orders.push({
          orderId,
          status: order.status,
          patient: order.patient,
          doctor: order.doctor,
          examType: fromHex(order.examType, "string").replace(/\0+$/, ""),
          assignedLab: order.assignedLab,
          assignedLabName: null,
          createdAt: Number(order.createdAt),
        });
      }
    } catch {
      // skip invalid
    }
  }

  // Enrich with lab names from Supabase
  const labWallets = orders
    .map((o) => o.assignedLab)
    .filter((w) => w && w !== "0x0000000000000000000000000000000000000000");

  const uniqueLabs = [...new Set(labWallets.map((w) => w.toLowerCase()))];
  const labNameMap = new Map<string, string | null>();

  if (uniqueLabs.length > 0) {
    const supabase = createAdminClient();
    const { data: users } = await supabase
      .from("users")
      .select("wallet_address, full_name")
      .in("wallet_address", uniqueLabs);

    if (users) {
      for (const u of users) {
        if (u.wallet_address) {
          labNameMap.set(u.wallet_address.toLowerCase(), u.full_name ?? null);
        }
      }
    }
  }

  const enrichedOrders = orders.map((o) => ({
    ...o,
    assignedLabName: o.assignedLab
      ? (labNameMap.get(o.assignedLab.toLowerCase()) ?? null)
      : null,
  }));

  return { orders: enrichedOrders, total: Number(total) };
}

export const listOrdersByDoctor = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
