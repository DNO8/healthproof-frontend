// ─── Contract Role Enum (matches IdentityRegistry.Role) ─
// Solidity: enum Role { PATIENT, DOCTOR, LAB, INSTITUTION, CERTIFIER, ADMIN }

export enum ContractRole {
  PATIENT = 0,
  DOCTOR = 1,
  LAB = 2,
  INSTITUTION = 3,
  CERTIFIER = 4,
  ADMIN = 5,
}

export type UserRole =
  | "patient"
  | "doctor"
  | "lab"
  | "institution"
  | "certifier"
  | "admin";

export const ROLE_TO_CONTRACT: Record<UserRole, ContractRole> = {
  patient: ContractRole.PATIENT,
  doctor: ContractRole.DOCTOR,
  lab: ContractRole.LAB,
  institution: ContractRole.INSTITUTION,
  certifier: ContractRole.CERTIFIER,
  admin: ContractRole.ADMIN,
};

export const CONTRACT_TO_ROLE: Record<number, UserRole> = {
  [ContractRole.PATIENT]: "patient",
  [ContractRole.DOCTOR]: "doctor",
  [ContractRole.LAB]: "lab",
  [ContractRole.INSTITUTION]: "institution",
  [ContractRole.CERTIFIER]: "certifier",
  [ContractRole.ADMIN]: "admin",
};

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
    key: "doctor",
    label: "Doctor",
    description: "Validate results and manage medical orders.",
    icon: "🏥",
  },
  {
    key: "lab",
    label: "Laboratory",
    description: "Issue verifiable clinical evidence and test results.",
    icon: "🔬",
  },
];

// ─── Permission Scope (matches PermissionManager.Scope) ─
// Solidity: enum Scope { DOCUMENT, DOCUMENT_TYPE, INSTITUTION, FULL_ACCESS }

export enum PermissionScope {
  DOCUMENT = 0,
  DOCUMENT_TYPE = 1,
  INSTITUTION = 2,
  FULL_ACCESS = 3,
}

// ─── Permission (client-side cache shape) ───────────────
export interface Permission {
  id: string;
  document_id: string;
  patient_wallet: string;
  grantee_wallet: string;
  encrypted_key: string;
  status: "ACTIVE" | "REVOKED";
  created_at: string;
}

export type GrantedToRole = "doctor" | "lab" | "institution";

export interface PermissionPayload {
  patient_wallet: string;
  grantee_wallet: string;
  granted_to_role: GrantedToRole;
  scope: PermissionScope;
  document_id: string;
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
    document_id: string;
    cid: string;
    iv: string;
    encrypted_key: { data: string; iv: string };
    patient_public_key: string;
  };
}

// ─── Order Status (matches MedicalOrderRegistry.OrderStatus) ─
// Solidity: enum OrderStatus { CREATED, LAB_ASSIGNED, SAMPLE_COLLECTED, RESULT_READY, CLOSED }

export enum ContractOrderStatus {
  CREATED = 0,
  LAB_ASSIGNED = 1,
  SAMPLE_COLLECTED = 2,
  RESULT_READY = 3,
  CLOSED = 4,
}

export type OrderStatus =
  | "created"
  | "lab_assigned"
  | "sample_collected"
  | "result_ready"
  | "closed";

// ─── User Profile (DB: users table — off-chain only) ────

export interface UserProfile {
  id: string;
  email: string;
  wallet_address: string;
  full_name: string | null;
  public_key: string | null;
  created_at: string;
}

// ─── On-chain Identity (read from IdentityRegistry) ─────

export interface OnChainIdentity {
  wallet: `0x${string}`;
  role: UserRole;
  contractRole: ContractRole;
  specialty: string;
  institution: `0x${string}`;
  verified: boolean;
}
