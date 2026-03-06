import { apiClient } from "@/services/api/client";
import { API_ROUTES } from "@/lib/constants";
import type { MedicalOrder, ExamResult } from "@/types/domain.types";
import type {
  ApiResponse,
  PaginatedResponse,
  CreateOrderRequest,
} from "@/types/api.types";

export async function createOrder(
  request: CreateOrderRequest,
): Promise<MedicalOrder> {
  const { data } = await apiClient.post<ApiResponse<MedicalOrder>>(
    API_ROUTES.ORDERS.CREATE,
    request,
  );
  return data.data;
}

export async function getOrder(id: string): Promise<MedicalOrder> {
  const { data } = await apiClient.get<ApiResponse<MedicalOrder>>(
    API_ROUTES.ORDERS.GET(id),
  );
  return data.data;
}

export async function listOrders(): Promise<PaginatedResponse<MedicalOrder>> {
  const { data } = await apiClient.get<PaginatedResponse<MedicalOrder>>(
    API_ROUTES.ORDERS.LIST,
  );
  return data;
}

export async function getResult(id: string): Promise<ExamResult> {
  const { data } = await apiClient.get<ApiResponse<ExamResult>>(
    API_ROUTES.RESULTS.GET(id),
  );
  return data.data;
}

export async function listResults(): Promise<PaginatedResponse<ExamResult>> {
  const { data } = await apiClient.get<PaginatedResponse<ExamResult>>(
    API_ROUTES.RESULTS.LIST,
  );
  return data;
}
