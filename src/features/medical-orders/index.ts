// Medical orders — on-chain via MedicalOrderRegistry + Gateway

export {
  assignLabToOrder,
  createMedicalOrderOnChain as createOrder,
  getOrderOnChain as getOrder,
  updateOrderStatusOnChain as updateOrderStatus,
} from "@/actions/medical-orders/medical-orders-onchain";

export {
  type OnChainOrder,
  ORDER_STATUS_LABELS,
  OrderStatus,
} from "@/lib/medical-constants";
