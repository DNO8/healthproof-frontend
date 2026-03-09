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
