import type {
  PermissionPayload,
  QRData,
  GrantedToRole,
  ResourceType,
} from "@/types/domain.types";
import { signMessage } from "@/services/blockchain/signer";
import { generateNonce, expiresIn } from "@/lib/utils";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";

export function buildPermissionPayload(opts: {
  patientId: string;
  grantedToRole: GrantedToRole;
  resourceType: ResourceType;
  resourceId: string;
  expiryMinutes?: number;
}): PermissionPayload {
  return {
    patient_id: opts.patientId,
    granted_to_role: opts.grantedToRole,
    resource_type: opts.resourceType,
    resource_id: opts.resourceId,
    expires_at: expiresIn(opts.expiryMinutes ?? QR_EXPIRY_MINUTES),
    nonce: generateNonce(),
  };
}

export async function generateSignedQR(
  payload: PermissionPayload,
): Promise<QRData> {
  const message = JSON.stringify(payload);
  const { signature, address } = await signMessage({ message });

  return {
    type: "healthproof_permission",
    payload,
    signature,
    wallet: address,
  };
}

export function encodeQRData(qrData: QRData): string {
  return JSON.stringify(qrData);
}
