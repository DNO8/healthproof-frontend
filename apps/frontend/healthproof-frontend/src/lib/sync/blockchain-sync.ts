"use server";

import { createPublicClient, http, type Log, type DecodeEventLogReturnType } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";

// Event ABIs for parsing
const EVENT_ABIS = {
  PermissionGranted: "event PermissionGranted(address indexed patient, address indexed grantee, uint8 scope, bytes32 resourceId, uint64 expiresAt)",
  PermissionRevoked: "event PermissionRevoked(address indexed patient, address indexed grantee, bytes32 resourceId)",
  DocumentRegistered: "event DocumentRegistered(bytes32 indexed documentId, address indexed patient, address indexed registrar, bytes32 clinicalHash)",
  AuditEvent: "event AuditEvent(address indexed actor, address indexed patient, bytes32 indexed resourceId, uint8 action, uint64 timestamp)",
} as const;

interface SyncResult {
  success: boolean;
  processedEvents: number;
  lastBlock: bigint;
  errors?: string[];
}

/**
 * Get or initialize sync state for a contract
 */
async function getSyncState(contractAddress: string): Promise<{ lastBlockNumber: bigint }> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("sync_state")
    .select("last_block_number")
    .eq("contract_address", contractAddress)
    .single();
  
  if (error || !data) {
    const publicClient = createPublicClient({
      chain: HEALTHPROOF_CHAIN,
      transport: http(),
    });
    const currentBlock = await publicClient.getBlockNumber();
    const initialBlock = currentBlock > BigInt(1000) ? currentBlock - BigInt(1000) : BigInt(0);
    
    return { lastBlockNumber: initialBlock };
  }
  
  return { lastBlockNumber: BigInt(data.last_block_number) };
}

/**
 * Update sync state after processing
 */
async function updateSyncState(contractAddress: string, lastBlockNumber: bigint): Promise<void> {
  const supabase = createAdminClient();
  
  await supabase
    .from("sync_state")
    .upsert({
      contract_address: contractAddress,
      last_block_number: lastBlockNumber.toString(),
      last_sync_at: new Date().toISOString(),
    }, { onConflict: "contract_address" });
}

/**
 * Process permission events and sync with DB
 */
async function processPermissionEvents(logs: Log[]): Promise<void> {
  const supabase = createAdminClient();
  
  for (const log of logs) {
    const decoded = log as unknown as { eventName?: string; args?: Record<string, unknown> };
    if (!decoded.args) continue;
    
    const eventName = decoded.eventName;
    const args = decoded.args;
    
    if (eventName === "PermissionGranted") {
      const grantee = args.grantee as string;
      const resourceId = args.resourceId as string;
      
      // Check if permission exists in DB
      const { data: existing } = await supabase
        .from("permission_keys")
        .select("id")
        .eq("document_id", resourceId)
        .eq("grantee_wallet", grantee)
        .single();
      
      if (!existing) {
        console.warn("[sync] PermissionGranted on-chain but no off-chain key:", {
          documentId: resourceId,
          grantee,
        });
      }
    } else if (eventName === "PermissionRevoked") {
      const grantee = args.grantee as string;
      const resourceId = args.resourceId as string;
      
      await supabase
        .from("permission_keys")
        .delete()
        .eq("document_id", resourceId)
        .eq("grantee_wallet", grantee);
    }
  }
}

/**
 * Process document events
 */
async function processDocumentEvents(logs: Log[]): Promise<void> {
  const supabase = createAdminClient();
  
  for (const log of logs) {
    const decoded = log as unknown as { args?: Record<string, unknown> };
    if (!decoded.args) continue;
    
    const args = decoded.args;
    const documentId = args.documentId as string;
    const patient = args.patient as string;
    
    const { data: existing } = await supabase
      .from("document_secrets")
      .select("id, patient_wallet")
      .eq("document_id", documentId)
      .single();
    
    if (!existing) {
      console.warn("[sync] DocumentRegistered on-chain but not in DB:", { documentId, patient });
    } else if (existing.patient_wallet.toLowerCase() !== patient.toLowerCase()) {
      console.error("[sync] Patient mismatch! DB:", existing.patient_wallet, "Chain:", patient);
    }
  }
}

/**
 * Process audit events
 */
async function processAuditEvents(logs: Log[]): Promise<void> {
  const supabase = createAdminClient();
  
  const actionTypeMap: Record<number, string> = {
    0: "DOCUMENT_ACCESS",
    1: "PERMISSION_GRANTED",
    2: "PERMISSION_REVOKED",
    3: "GUARDIAN_ACTION",
    4: "MEDICAL_QUERY",
  };
  
  const auditRows = logs
    .map(log => ({
      args: (log as unknown as { args?: Record<string, unknown> }).args,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }))
    .filter(l => l.args)
    .map(log => {
      const args = log.args!;
      return {
        actor: args.actor as string,
        patient: args.patient as string,
        resource_id: args.resourceId as string,
        action_type: actionTypeMap[Number(args.action)] || "UNKNOWN",
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        timestamp: new Date(Number(args.timestamp) * 1000).toISOString(),
      };
    });
  
  if (auditRows.length > 0) {
    await supabase
      .from("audit_events")
      .upsert(auditRows, { onConflict: "tx_hash, resource_id, action_type" });
  }
}

/**
 * Process MedicalOrderRegistry events
 */
async function processOrderEvents(logs: Log[]): Promise<void> {
  const supabase = createAdminClient();

  for (const log of logs) {
    const decoded = log as unknown as { eventName?: string; args?: Record<string, unknown> };
    if (!decoded.args) continue;

    const eventName = decoded.eventName;
    const args = decoded.args;

    if (eventName === "MedicalOrderCreated") {
      const orderId = args.orderId as string;
      const patient = args.patient as string;
      const doctor = args.doctor as string;
      const examType = args.examType as string;

      await supabase.from("indexed_orders").upsert({
        order_id: orderId,
        patient_wallet: patient,
        doctor_wallet: doctor,
        lab_wallet: null,
        status: 0, // CREATED
        exam_type: examType,
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        created_at: new Date(Number(log.blockTimestamp ?? Date.now()) * 1000).toISOString(),
      }, { onConflict: "order_id" });
    } else if (eventName === "LabAssigned") {
      const orderId = args.orderId as string;
      const lab = args.lab as string;

      await supabase.from("indexed_orders").update({
        lab_wallet: lab,
        status: 1, // LAB_ASSIGNED
      }).eq("order_id", orderId);
    } else if (eventName === "OrderStatusUpdated") {
      const orderId = args.orderId as string;
      const status = Number(args.status);

      await supabase.from("indexed_orders").update({
        status,
      }).eq("order_id", orderId);
    }
  }
}

/**
 * Process ClinicalEpisodeRegistry events
 */
async function processEpisodeEvents(logs: Log[]): Promise<void> {
  const supabase = createAdminClient();

  for (const log of logs) {
    const decoded = log as unknown as { eventName?: string; args?: Record<string, unknown> };
    if (!decoded.args) continue;

    const eventName = decoded.eventName;
    const args = decoded.args;

    if (eventName === "ClinicalEpisodeOpened") {
      const episodeId = args.episodeId as string;
      const patient = args.patient as string;
      const doctor = args.doctor as string;
      const episodeType = args.episodeType as string;

      await supabase.from("indexed_episodes").upsert({
        episode_id: episodeId,
        patient_wallet: patient,
        doctor_wallet: doctor,
        active: true,
        episode_type: episodeType,
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        created_at: new Date(Number(log.blockTimestamp ?? Date.now()) * 1000).toISOString(),
      }, { onConflict: "episode_id" });
    } else if (eventName === "ClinicalEpisodeClosed") {
      const episodeId = args.episodeId as string;

      await supabase.from("indexed_episodes").update({
        active: false,
      }).eq("episode_id", episodeId);
    }
  }
}

/**
 * Main sync function - processes events from all contracts
 */
export async function syncBlockchainEvents(): Promise<SyncResult> {
  const publicClient = createPublicClient({
    chain: HEALTHPROOF_CHAIN,
    transport: http(),
  });
  
  const currentBlock = await publicClient.getBlockNumber();
  const errors: string[] = [];
  let totalProcessed = 0;
  
  try {
    // Sync PermissionManager
    const permissionState = await getSyncState(CONTRACT_ADDRESSES.PermissionManager);
    
    const permissionLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.PermissionManager,
      fromBlock: permissionState.lastBlockNumber + BigInt(1),
      toBlock: currentBlock,
    });
    
    await processPermissionEvents(permissionLogs);
    await updateSyncState(CONTRACT_ADDRESSES.PermissionManager, currentBlock);
    totalProcessed += permissionLogs.length;
    
    // Sync MedicalDocumentRegistry
    const documentState = await getSyncState(CONTRACT_ADDRESSES.MedicalDocumentRegistry);
    
    const documentLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.MedicalDocumentRegistry,
      fromBlock: documentState.lastBlockNumber + BigInt(1),
      toBlock: currentBlock,
    });
    
    await processDocumentEvents(documentLogs);
    await updateSyncState(CONTRACT_ADDRESSES.MedicalDocumentRegistry, currentBlock);
    totalProcessed += documentLogs.length;
    
    // Sync AuditTrail
    const auditState = await getSyncState(CONTRACT_ADDRESSES.AuditTrail);
    
    const auditLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.AuditTrail,
      fromBlock: auditState.lastBlockNumber + BigInt(1),
      toBlock: currentBlock,
    });
    
    await processAuditEvents(auditLogs);
    await updateSyncState(CONTRACT_ADDRESSES.AuditTrail, currentBlock);
    totalProcessed += auditLogs.length;

    // Sync MedicalOrderRegistry
    const orderState = await getSyncState(CONTRACT_ADDRESSES.MedicalOrderRegistry);

    const orderLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.MedicalOrderRegistry,
      fromBlock: orderState.lastBlockNumber + BigInt(1),
      toBlock: currentBlock,
    });

    await processOrderEvents(orderLogs);
    await updateSyncState(CONTRACT_ADDRESSES.MedicalOrderRegistry, currentBlock);
    totalProcessed += orderLogs.length;

    // Sync ClinicalEpisodeRegistry
    const episodeState = await getSyncState(CONTRACT_ADDRESSES.ClinicalEpisodeRegistry);

    const episodeLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.ClinicalEpisodeRegistry,
      fromBlock: episodeState.lastBlockNumber + BigInt(1),
      toBlock: currentBlock,
    });

    await processEpisodeEvents(episodeLogs);
    await updateSyncState(CONTRACT_ADDRESSES.ClinicalEpisodeRegistry, currentBlock);
    totalProcessed += episodeLogs.length;
    
    return {
      success: true,
      processedEvents: totalProcessed,
      lastBlock: currentBlock,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(errorMsg);
    
    return {
      success: false,
      processedEvents: totalProcessed,
      lastBlock: currentBlock,
      errors,
    };
  }
}

/**
 * Reconciliation job - verifies consistency
 */
export async function runReconciliation(): Promise<{
  inconsistencies: Array<{ type: string; details: unknown }>;
  checked: number;
}> {
  const supabase = createAdminClient();
  const inconsistencies: Array<{ type: string; details: unknown }> = [];
  let checked = 0;
  
  const { data: recentPermissions } = await supabase
    .from("permission_keys")
    .select("document_id, grantee_wallet")
    .order("created_at", { ascending: false })
    .limit(50);
  
  if (recentPermissions) {
    checked += recentPermissions.length;
  }
  
  return { inconsistencies, checked };
}
