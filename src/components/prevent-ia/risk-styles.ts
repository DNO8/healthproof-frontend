import type { RiskLevel } from "@/services/prevent-ia/types";

/**
 * Paleta de riesgo compartida por los componentes de Prevent IA — mismos
 * colores que `statusBadgeClass` en `dashboard/my-orders/page.tsx`
 * (emerald/amber/red), sin introducir tokens nuevos.
 */
export const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  bajo: "bg-emerald-100 text-emerald-700",
  moderado: "bg-amber-100 text-amber-700",
  alto: "bg-red-100 text-red-700",
};

export const RISK_DOT_CLASS: Record<RiskLevel, string> = {
  bajo: "bg-emerald-500",
  moderado: "bg-amber-500",
  alto: "bg-red-500",
};

/** Hex equivalente a los mismos tonos, para trazos SVG (el gauge no puede usar clases de Tailwind en `stroke`). */
export const RISK_STROKE_COLOR: Record<RiskLevel, string> = {
  bajo: "#059669", // emerald-600
  moderado: "#d97706", // amber-600
  alto: "#dc2626", // red-600
};

export const RISK_TEXT_CLASS: Record<RiskLevel, string> = {
  bajo: "text-emerald-600",
  moderado: "text-amber-600",
  alto: "text-red-600",
};
