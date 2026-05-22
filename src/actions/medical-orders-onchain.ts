"use server";

/**
 * ─── Gateway Proxy Architecture Note ───
 *
 * HealthProofGateway exposes proxy functions (createOrderViaGateway,
 * assignLabViaGateway, updateOrderStatusViaGateway, closeEpisodeViaGateway)
 * designed as a unified entry point for external SDKs.
 *
 * Current frontend usage:
 * - Medical orders (this file) → Gateway proxies (historical, still active)
 * - Permissions (permissions/page.tsx) → Direct meta-tx against PermissionManager
 *   (less indirection, lower gas)
 *
 * Both paths use EIP-2771 meta-transactions signed by the user and relayed
 * through the TrustedForwarder. The Gateway remains available for future
 * third-party integrations but is not required for internal flows.
 */

import { createPublicClient, http, keccak256, toHex, fromHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import { withAuth, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor, isVerifiedLab } from "@/lib/auth/permissions";
import type { OnChainOrder } from "@/lib/medical-constants";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";
import { executeForwardRequest } from "./relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

interface CreateOrderMetaTx {
  request: SignedForwardRequest;
  patientWallet: string;
  examType: string;
  orderId: string;
}

// ─── Create Medical Order (via EIP-2771 meta-tx → HealthProofGateway) ───
// Requires authenticated verified doctor.

async function createOrderHandler(
  data: CreateOrderMetaTx,
  auth: AuthContext
): Promise<{ txHash: string; orderId: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  try {
    await logAuditEvent(data.patientWallet, data.orderId, AuditAction.ORDER_CREATED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("createMedicalOrderOnChain", auth, true, {
    patientWallet: data.patientWallet,
    examType: data.examType,
    orderId: data.orderId,
  });

  return { txHash: result.txHash, orderId: data.orderId };
}

async function validateCreateOrder(data: CreateOrderMetaTx, auth: AuthContext): Promise<boolean> {
  return await isVerifiedDoctor(auth.wallet);
}

export const createMedicalOrderOnChain = withAuth(createOrderHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateCreateOrder,
});

interface AssignLabMetaTx {
  request: SignedForwardRequest;
  orderId: string;
  labWallet: string;
  patientWallet: string;
}

// ─── Assign Lab to Order ───
// Calls assignLabViaGateway on HealthProofGateway via EIP-2771.

async function assignLabHandler(
  data: AssignLabMetaTx,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("assignLabToOrder", auth, true, {
    orderId: data.orderId,
    labWallet: data.labWallet,
  });

  return { txHash: result.txHash };
}

export const assignLabToOrder = withAuth(assignLabHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});

interface UpdateOrderStatusMetaTx {
  request: SignedForwardRequest;
  orderId: string;
  status: number;
}

// ─── Update Order Status ───
// Calls updateOrderStatusViaGateway on HealthProofGateway via EIP-2771.

async function updateOrderStatusHandler(
  data: UpdateOrderStatusMetaTx,
  auth: AuthContext
): Promise<{ txHash: string }> {
  if (data.request.from.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: request.from != authenticated wallet");
  }

  const result = await executeForwardRequest(data.request);
  if (!result.success) {
    throw new Error("Meta-transaction failed on-chain");
  }

  auditLog("updateOrderStatusOnChain", auth, true, {
    orderId: data.orderId,
    status: data.status,
  });

  return { txHash: result.txHash };
}

async function validateUpdateOrderStatus(
  data: UpdateOrderStatusMetaTx,
  auth: AuthContext
): Promise<boolean> {
  const isDoctor = await isVerifiedDoctor(auth.wallet);
  const isLab = await isVerifiedLab(auth.wallet);
  return isDoctor || isLab;
}

export const updateOrderStatusOnChain = withAuth(updateOrderStatusHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateUpdateOrderStatus,
});

// ─── Get Order (read-only) ───
// Requires authentication but no special permissions

async function getOrderHandler(
  data: { orderId: string },
  _auth: AuthContext
): Promise<OnChainOrder | null> {
  const publicClient = createPublicClient({ chain: HEALTHPROOF_CHAIN, transport: http() });

  const orderIdBytes =
    data.orderId.startsWith("0x") && data.orderId.length === 66
      ? (data.orderId as `0x${string}`)
      : keccak256(toHex(data.orderId));

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
    orderId: data.orderId,
    patient: order.patient,
    doctor: order.doctor,
    institution: order.institution,
    episodeId: order.episodeId,
    orderType: fromHex(order.orderType, "string").replace(/\0+$/, ""),
    examType: fromHex(order.examType, "string").replace(/\0+$/, ""),
    assignedLab: order.assignedLab,
    status: order.status,
    createdAt: Number(order.createdAt),
  };
}

export const getOrderOnChain = withAuth(getOrderHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
