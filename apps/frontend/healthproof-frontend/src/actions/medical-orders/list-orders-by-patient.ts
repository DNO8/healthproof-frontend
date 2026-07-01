"use server";

import { createPublicClient, fromHex, http } from "viem";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import { resolveWalletNames } from "@/lib/supabase/resolve-wallet-names";

interface ListOrdersParams {
  patientWallet: string;
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
  patientName?: string | null;
  doctorName?: string | null;
}

async function handler(
  data: ListOrdersParams,
  _auth: AuthContext,
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

  // Enrich with names from Supabase
  const allWallets = orders.flatMap((o) => [
    o.patient,
    o.doctor,
    o.assignedLab,
  ]);
  const nameMap = await resolveWalletNames(allWallets);

  const enrichedOrders = orders.map((o) => ({
    ...o,
    patientName: nameMap.get(o.patient.toLowerCase()) ?? null,
    doctorName: nameMap.get(o.doctor.toLowerCase()) ?? null,
    assignedLabName:
      o.assignedLab &&
      o.assignedLab !== "0x0000000000000000000000000000000000000000"
        ? (nameMap.get(o.assignedLab.toLowerCase()) ?? null)
        : null,
  }));

  return { orders: enrichedOrders, total: Number(total) };
}

export const listOrdersByPatient = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
