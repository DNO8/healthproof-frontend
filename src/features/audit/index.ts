import { apiClient } from "@/services/api/client";
import type { BlockchainEvent } from "@/types/blockchain.types";
import type { PaginatedResponse } from "@/types/api.types";

export async function listAuditEvents(params?: {
  patient_id?: string;
  event_type?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<BlockchainEvent>> {
  const { data } = await apiClient.get<PaginatedResponse<BlockchainEvent>>(
    "/audit/events",
    { params },
  );
  return data;
}

export async function getEventByTxHash(
  txHash: string,
): Promise<BlockchainEvent | null> {
  try {
    const { data } = await apiClient.get<{ data: BlockchainEvent }>(
      `/audit/events/${txHash}`,
    );
    return data.data;
  } catch {
    return null;
  }
}
