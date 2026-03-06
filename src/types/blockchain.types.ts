// ─── Blockchain Types ────────────────────────────────────

export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  name: string;
  explorerUrl: string;
}

export interface ContractAddresses {
  permissions: string;
  documents: string;
}

// ─── Transaction Types ───────────────────────────────────

export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  status: TransactionStatus;
  gasUsed: string;
}

// ─── Contract Method Params ──────────────────────────────

export interface GrantAccessParams {
  patient: string;
  grantee: string;
  resourceHash: string;
}

export interface RevokeAccessParams {
  patient: string;
  grantee: string;
  resourceHash: string;
}

export interface RegisterHashParams {
  documentHash: string;
  owner: string;
}

// ─── Events ──────────────────────────────────────────────

export type BlockchainEventType =
  | "AccessGranted"
  | "AccessRevoked"
  | "HashRegistered";

export interface BlockchainEvent {
  id: string;
  event_type: BlockchainEventType;
  tx_hash: string;
  block_number: number;
  args: Record<string, string>;
  created_at: string;
}

// ─── Wallet ──────────────────────────────────────────────

export interface WalletState {
  address: string | null;
  connected: boolean;
  chainId: number | null;
}

export interface SignMessageParams {
  message: string;
}

export interface SignMessageResult {
  signature: string;
  address: string;
}
