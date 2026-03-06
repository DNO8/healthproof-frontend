import { apiClient } from "@/services/api/client";
import { API_ROUTES } from "@/lib/constants";
import type { MedicalDocument } from "@/types/domain.types";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export async function getDocument(id: string): Promise<MedicalDocument> {
  const { data } = await apiClient.get<ApiResponse<MedicalDocument>>(
    API_ROUTES.DOCUMENTS.GET(id),
  );
  return data.data;
}

export async function listDocuments(
  patientId?: string,
): Promise<PaginatedResponse<MedicalDocument>> {
  const { data } = await apiClient.get<PaginatedResponse<MedicalDocument>>(
    API_ROUTES.DOCUMENTS.LIST,
    { params: patientId ? { patient_id: patientId } : {} },
  );
  return data;
}
