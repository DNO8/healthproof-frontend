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
}
