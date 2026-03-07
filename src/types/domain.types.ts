// ─── Roles ───────────────────────────────────────────────

export type UserRole = "patient" | "laboratory" | "medical_center";

export type RoleConfig = {
  key: UserRole;
  label: string;
  description: string;
  icon: string;
};

export const ROLES: RoleConfig[] = [
  {
    key: "patient",
    label: "Patient",
    description:
      "Sovereignty over your medical history. Delegate access via QR.",
    icon: "🩺",
  },
  {
    key: "laboratory",
    label: "Laboratory",
    description: "Issue verifiable clinical evidence and test results.",
    icon: "🔬",
  },
  {
    key: "medical_center",
    label: "Medical Center",
    description: "Validate results and manage medical orders.",
    icon: "🏥",
  },
];

// ─── Permissions ─────────────────────────────────────────

export type PermissionStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type ResourceType = "RESULT" | "ORDER" | "DOCUMENT";

export type GrantedToRole = "doctor" | "laboratory" | "medical_center";

export interface PermissionPayload {
  patient_id: string;
  granted_to_role: GrantedToRole;
  resource_type: ResourceType;
  resource_id: string;
  expires_at: number;
  nonce: string;
}

export interface SignedPermission {
  payload: PermissionPayload;
  signature: string;
  wallet: string;
}

export interface QRData extends SignedPermission {
  type: "healthproof_permission";
}

export interface EncryptedQRData extends QRData {
  crypto: {
    result_id: string;
    cid: string;
    iv: string;
    encrypted_key: { data: string; iv: string };
    patient_public_key: string;
  };
}

export interface Permission {
  id: string;
  patient_id: string;
  granted_to_id: string;
  resource_type: ResourceType;
  resource_id: string;
  status: PermissionStatus;
  encrypted_key: string | null;
  onchain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Documents ───────────────────────────────────────────

export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface MedicalDocument {
  id: string;
  patient_id: string;
  title: string;
  document_hash: string;
  encrypted_url: string;
  status: DocumentStatus;
  onchain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Exam Results ────────────────────────────────────────

export type ExamResultStatus = "PENDING" | "UPLOADED" | "VERIFIED";

export interface ExamResult {
  id: string;
  order_id: string;
  laboratory_id: string;
  patient_id: string;
  result_hash: string;
  encrypted_url: string;
  cid: string | null;
  iv: string | null;
  encrypted_keys: Record<string, { data: string; iv: string }> | null;
  status: ExamResultStatus;
  onchain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Medical Orders ──────────────────────────────────────

export type OrderStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface MedicalOrder {
  id: string;
  medical_center_id: string;
  patient_id: string;
  laboratory_id: string | null;
  description: string;
  status: OrderStatus;
  onchain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

// ─── User Profile ────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  wallet_address: string | null;
  display_name: string | null;
  created_at: string;
}
