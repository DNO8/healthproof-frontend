// ─── Document types and FHIR constants (RAG MVP) ───

export const DOC_TYPE = {
  MEDICAL_RESULT: "MEDICAL_RESULT",
  FHIR_REPORT: "FHIR_REPORT",
} as const;

export const FHIR_STANDARD = {
  R4: "FHIR-R4",
} as const;

export const DOC_CLASSIFICATION = {
  LAB: "LAB",
  DIAGNOSTIC: "DIAGNOSTIC",
} as const;

export const NO_STANDARD = "NONE";
export const NO_CLASSIFICATION = "NONE";

export const REGISTER_DOCUMENT_ACTION = "registerMedicalDocument";

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

// ─── Order status enum (matches MedicalOrderRegistry.OrderStatus) ───

export const OrderStatus = {
  CREATED: 0,
  LAB_ASSIGNED: 1,
  SAMPLE_COLLECTED: 2,
  RESULT_READY: 3,
  CLOSED: 4,
} as const;

export const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Created",
  1: "Lab Assigned",
  2: "Sample Collected",
  3: "Result Ready",
  4: "Closed",
};

// ─── Types ───

export interface OnChainOrder {
  orderId: string;
  patient: string;
  doctor: string;
  institution: string;
  episodeId: string;
  orderType: string;
  examType: string;
  assignedLab: string;
  status: number;
  createdAt: number;
}

export interface OnChainEpisode {
  episodeId: string;
  patient: string;
  openedBy: string;
  institution: string;
  episodeType: string;
  classification: string;
  openedAt: number;
  active: boolean;
  patientName?: string | null;
  openedByName?: string | null;
  institutionName?: string | null;
}

// ─── On-chain Permission (matches PermissionManager.Permission) ───

export interface OnChainPermission {
  grantee: string;
  scope: number;
  resourceId: string;
  expiresAt: number;
  active: boolean;
}

// ─── On-chain Guardianship (matches GuardianRegistry.Guardianship) ───

export interface OnChainGuardianship {
  guardian: string;
  certifier: string;
  gType: number;
  legalDocHash: string;
  validUntil: number;
  active: boolean;
}

// ─── On-chain Document (matches MedicalDocumentRegistry.Document) ───

export interface OnChainDocument {
  patient: string;
  issuer: string;
  institution: string;
  documentType: string;
  clinicalHash: string;
  episodeId: string;
  cid: string;
  standard: string;
  classification: string;
  createdAt: number;
}

// ─── On-chain Healthcare Network ───

export interface OnChainNetwork {
  networkId: string;
  name: string;
  countryCode: string;
  authority: string;
  active: boolean;
}

// ─── On-chain Institution ───

export interface OnChainInstitution {
  institutionId: string;
  networkId: string;
  wallet: string;
  institutionType: number;
  countryCode: string;
  verified: boolean;
}

// ─── Audit Action (matches AuditTrail.ActionType) ───

export enum AuditAction {
  DOCUMENT_REGISTERED = 0,
  DOCUMENT_ACCESSED = 1,
  PERMISSION_GRANTED = 2,
  PERMISSION_REVOKED = 3,
  ORDER_CREATED = 4,
  EPISODE_OPENED = 5,
  EMERGENCY_REQUESTED = 6,
  EMERGENCY_WITNESSED = 7,
  EMERGENCY_APPROVED = 8,
  EMERGENCY_REVOKED = 9,
}

// ─── Emergency Access (matches EmergencyAccessManager) ───

export enum EmergencyPath {
  GUARDIAN = 0,
  DUAL_DOCTOR = 1,
  PATIENT_SELF = 2,
}

export enum EmergencyStatus {
  PENDING = 0,
  APPROVED = 1,
  EXPIRED = 2,
  REJECTED = 3,
  REVOKED = 4,
}

export interface OnChainEmergencyRequest {
  requestId: string;
  patient: string;
  requestingDoctor: string;
  witnessDoctor: string;
  approvedBy: string;
  resourceId: string;
  path: number;
  status: number;
  requestedAt: number;
  activatedAt: number;
  expiresAt: number;
  reasonHash: string;
}
