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
import { withAuth, getDeployerPrivateKey, auditLog } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { isVerifiedDoctor, isVerifiedLab } from "@/lib/auth/permissions";
import type { OnChainOrder } from "@/lib/medical-constants";
import { logAuditEvent } from "@/lib/audit-onchain";
import { AuditAction } from "@/lib/medical-constants";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

async function getClients() {
  const pk = await getDeployerPrivateKey();
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

interface CreateOrderData {
  patientWallet: string;
  examType: string;
  orderType?: string;
  episodeId?: string;
  institution?: string;
}

// ─── Create Medical Order (via Gateway → MedicalOrderRegistry) ───
// Requires authenticated verified doctor

async function createOrderHandler(
  data: CreateOrderData,
  auth: AuthContext
): Promise<{ txHash: string; orderId: string }> {
  const { publicClient, walletClient, account } = await getClients();

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
      account.address,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  try {
    await logAuditEvent(data.patientWallet, orderId, AuditAction.ORDER_CREATED);
  } catch {
    // On-chain audit logging is best-effort
  }

  auditLog("createMedicalOrderOnChain", auth, true, {
    patientWallet: data.patientWallet,
    examType: data.examType,
    orderId,
  });

  return { txHash, orderId };
}

async function validateCreateOrder(data: CreateOrderData, auth: AuthContext): Promise<boolean> {
  return await isVerifiedDoctor(auth.wallet);
}

export const createMedicalOrderOnChain = withAuth(createOrderHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
  requireOnChainPermission: validateCreateOrder,
});

interface AssignLabData {
  orderId: string;
  labWallet: string;
}

// ─── Assign Lab to Order ───
// Calls assignLabViaGateway on HealthProofGateway.
// The deployer acts as guardian (authorizedForPatient), so this works
// without meta-tx for now.

async function assignLabHandler(
  data: AssignLabData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient } = await getClients();

  const orderIdBytes =
    data.orderId.startsWith("0x") && data.orderId.length === 66
      ? (data.orderId as `0x${string}`)
      : keccak256(toHex(data.orderId));

  // Read order to get patient address (Gateway requires it)
  const order = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.MedicalOrderRegistry as `0x${string}`,
    abi: MedicalOrderRegistryAbi,
    functionName: "orders",
    args: [orderIdBytes],
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

  if (Number(order.createdAt) === 0) {
    throw new Error("Order not found on-chain");
  }

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
    abi: HealthProofGatewayAbi,
    functionName: "assignLabViaGateway",
    args: [
      orderIdBytes,
      data.labWallet as `0x${string}`,
      order.patient as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  auditLog("assignLabToOrder", auth, true, {
    orderId: data.orderId,
    labWallet: data.labWallet,
  });

  return { txHash };
}

export const assignLabToOrder = withAuth(assignLabHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 5 },
});

interface UpdateOrderStatusData {
  orderId: string;
  status: number;
}

// ─── Update Order Status ───
// Calls updateOrderStatusViaGateway on HealthProofGateway.
// NOTE: This requires EIP-2771 meta-transactions (Phase 2) to work
// on-chain because the Gateway requires updater == _msgSender().
// The direct Registry call was also broken (msg.sender == doctor/lab).

async function updateOrderStatusHandler(
  data: UpdateOrderStatusData,
  auth: AuthContext
): Promise<{ txHash: string }> {
  const { publicClient, walletClient, account } = await getClients();

  const orderIdBytes =
    data.orderId.startsWith("0x") && data.orderId.length === 66
      ? (data.orderId as `0x${string}`)
      : keccak256(toHex(data.orderId));

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
    abi: HealthProofGatewayAbi,
    functionName: "updateOrderStatusViaGateway",
    args: [orderIdBytes, data.status, account.address],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  auditLog("updateOrderStatusOnChain", auth, true, {
    orderId: data.orderId,
    status: data.status,
  });

  return { txHash };
}

async function validateUpdateOrderStatus(
  data: UpdateOrderStatusData,
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
  const { publicClient } = await getClients();

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
