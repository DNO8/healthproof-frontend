// ─── Wallet ──────────────────────────────────────────────

export interface WalletState {
  address: `0x${string}` | null;
  connected: boolean;
  chainId: number | null;
}

// ─── Transaction ─────────────────────────────────────────

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface TxResult {
  hash: `0x${string}`;
  status: TransactionStatus;
}

// ─── On-chain Read Results ───────────────────────────────

export interface EntityResult {
  wallet: `0x${string}`;
  role: number;
  specialty: string;
  institution: `0x${string}`;
  verified: boolean;
}

export interface PermissionResult {
  grantee: `0x${string}`;
  scope: number;
  resourceId: `0x${string}`;
  expiresAt: bigint;
  active: boolean;
}

export interface MedicalDocumentResult {
  patient: `0x${string}`;
  issuer: `0x${string}`;
  institution: `0x${string}`;
  documentType: `0x${string}`;
  clinicalHash: `0x${string}`;
  episodeId: `0x${string}`;
  cid: string;
  standard: `0x${string}`;
  classification: `0x${string}`;
  createdAt: bigint;
}

// ─── Audit / Events ─────────────────────────────────────

export type BlockchainEventType = string;

export interface BlockchainEvent {
  tx_hash: string;
  event_type: BlockchainEventType;
  wallet: string;
  block_number: number;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface MedicalOrderResult {
  patient: `0x${string}`;
  doctor: `0x${string}`;
  institution: `0x${string}`;
  episodeId: `0x${string}`;
  orderType: `0x${string}`;
  examType: `0x${string}`;
  assignedLab: `0x${string}`;
  status: number;
  createdAt: bigint;
}
