import type { QRData } from "@/types/domain.types";
import type { VerifyPermissionResponse } from "@/types/api.types";
import { apiClient } from "@/services/api/client";
import { API_ROUTES } from "@/lib/constants";

export function parseQRData(raw: string): QRData | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type !== "healthproof_permission") return null;
    if (!parsed.payload || !parsed.signature || !parsed.wallet) return null;
    return parsed as QRData;
  } catch {
    return null;
  }
}

export function isExpired(qrData: QRData): boolean {
  const now = Math.floor(Date.now() / 1000);
  return qrData.payload.expires_at < now;
}

export async function verifyPermission(
  qrData: QRData,
): Promise<VerifyPermissionResponse> {
  const { data } = await apiClient.post<VerifyPermissionResponse>(
    API_ROUTES.PERMISSIONS.VERIFY,
    {
      payload: qrData.payload,
      signature: qrData.signature,
      wallet: qrData.wallet,
    },
  );

  return data;
}
