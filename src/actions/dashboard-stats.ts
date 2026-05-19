"use server";

import { createPublicClient, http, parseAbiItem } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/domain.types";

function getPublicClient() {
  return createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
}

// ─── Supabase helpers ───

async function countDocumentsForPatient(wallet: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("document_secrets")
    .select("*", { count: "exact", head: true })
    .eq("patient_wallet", wallet.toLowerCase());
  if (error) {
    console.error("[dashboard-stats] countDocumentsForPatient:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countPermissionsForPatient(wallet: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("permission_keys")
    .select("*", { count: "exact", head: true })
    .eq("patient_wallet", wallet.toLowerCase());
  if (error) {
    console.error("[dashboard-stats] countPermissionsForPatient:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countUploadsForLab(wallet: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("document_secrets")
    .select("*", { count: "exact", head: true })
    .eq("uploader_wallet", wallet.toLowerCase());
  if (error) {
    console.error("[dashboard-stats] countUploadsForLab:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countDistinctPatients(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("document_secrets")
    .select("patient_wallet");
  if (error || !data) {
    console.error("[dashboard-stats] countDistinctPatients:", error?.message);
    return 0;
  }
  const unique = new Set(data.map((r) => r.patient_wallet));
  return unique.size;
}

async function countPendingOrdersForLab(wallet: string): Promise<number> {
  try {
    const client = getPublicClient();
    const [orderIds] = (await client.readContract({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
      abi: await import("@/lib/abis/MedicalOrderRegistry.json").then((m) => m.default),
      functionName: "getOrdersByLab",
      args: [wallet as `0x${string}`, BigInt(0), BigInt(100)],
    })) as [`0x${string}`[], bigint];

    let pending = 0;
    for (const orderId of orderIds) {
      try {
        const order = (await client.readContract({
          address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
          abi: await import("@/lib/abis/MedicalOrderRegistry.json").then((m) => m.default),
          functionName: "orders",
          args: [orderId],
        })) as { status: number; createdAt: bigint };
        if (Number(order.createdAt) !== 0 && order.status < 2) {
          pending++;
        }
      } catch {
        // skip invalid
      }
    }
    return pending;
  } catch (err) {
    console.error("[dashboard-stats] countPendingOrdersForLab:", err);
    return 0;
  }
}

// ─── On-chain event log helpers ───

async function countPermissionGrantedForPatient(
  wallet: string,
): Promise<number> {
  try {
    const client = getPublicClient();
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
      event: parseAbiItem(
        "event PermissionGranted(address indexed patient, address indexed grantee, uint8 scope)",
      ),
      args: { patient: wallet as `0x${string}` },
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    return logs.length;
  } catch (err) {
    console.error("[dashboard-stats] countPermissionGrantedForPatient:", err);
    return 0;
  }
}

async function countMedicalOrdersCreated(): Promise<number> {
  try {
    const client = getPublicClient();
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
      event: parseAbiItem(
        "event MedicalOrderCreated(bytes32 indexed orderId, address indexed patient, address indexed doctor, bytes32 episodeId, bytes32 examType, uint64 timestamp)",
      ),
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    return logs.length;
  } catch (err) {
    console.error("[dashboard-stats] countMedicalOrdersCreated:", err);
    return 0;
  }
}

async function countDocumentsRegisteredOnChain(): Promise<number> {
  try {
    const client = getPublicClient();
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESSES.MedicalDocumentRegistry as `0x${string}`,
      event: parseAbiItem(
        "event DocumentRegistered(bytes32 indexed documentId, address indexed patient, address issuer)",
      ),
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    return logs.length;
  } catch (err) {
    console.error("[dashboard-stats] countDocumentsRegisteredOnChain:", err);
    return 0;
  }
}

// ─── Public API ───

export type DashboardStats = Record<string, number>;

export async function getDashboardStats(
  wallet: string,
  role: UserRole,
): Promise<DashboardStats> {
  try {
    switch (role) {
      case "patient": {
        const [myDocuments, activePermissions, verifications] =
          await Promise.all([
            countDocumentsForPatient(wallet),
            countPermissionsForPatient(wallet),
            countPermissionGrantedForPatient(wallet),
          ]);
        return { myDocuments, activePermissions, verifications };
      }

      case "lab": {
        const [resultsUploaded, pendingOrders] = await Promise.all([
          countUploadsForLab(wallet),
          countPendingOrdersForLab(wallet),
        ]);
        return {
          testsPerformed: resultsUploaded,
          resultsUploaded,
          pendingOrders,
        };
      }

      case "doctor": {
        const [ordersIssued, verifiedResults, activePatients] =
          await Promise.all([
            countMedicalOrdersCreated(),
            countDocumentsRegisteredOnChain(),
            countDistinctPatients(),
          ]);
        return { ordersIssued, verifiedResults, activePatients };
      }

      default:
        return {};
    }
  } catch (err) {
    console.error("[getDashboardStats]", err);
    return {};
  }
}
