// Medical orders — on-chain via MedicalOrderRegistry + Gateway

export {
  createMedicalOrderOnChain as createOrder,
  getOrderOnChain as getOrder,
  assignLabToOrder,
  updateOrderStatusOnChain as updateOrderStatus,
} from "@/actions/medical-orders-onchain";

export {
  OrderStatus,
  ORDER_STATUS_LABELS,
  type OnChainOrder,
} from "@/lib/medical-constants";
