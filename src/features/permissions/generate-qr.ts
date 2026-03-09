import type {
  PermissionPayload,
  QRData,
  GrantedToRole,
} from "@/types/domain.types";
import { PermissionScope } from "@/types/domain.types";
import { generateNonce, expiresIn } from "@/lib/utils";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";

export function buildPermissionPayload(opts: {
  patientWallet: string;
  granteeWallet: string;
  grantedToRole: GrantedToRole;
  documentId: string;
  scope?: PermissionScope;
  expiryMinutes?: number;
}): PermissionPayload {
  return {
    patient_wallet: opts.patientWallet,
    grantee_wallet: opts.granteeWallet,
    granted_to_role: opts.grantedToRole,
    scope: opts.scope ?? PermissionScope.DOCUMENT,
    document_id: opts.documentId,
    expires_at: expiresIn(opts.expiryMinutes ?? QR_EXPIRY_MINUTES),
    nonce: generateNonce(),
  };
}

export function encodeQRData(qrData: QRData): string {
  return JSON.stringify(qrData);
}
