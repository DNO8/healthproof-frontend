import { cn } from "@/lib/utils";

type StatusVariant = "active" | "inactive" | "pending" | "error" | "closed";

const VARIANT_MAP: Record<StatusVariant, string> = {
  active: "bg-green-50 text-green-600",
  inactive: "bg-slate-100 text-slate-500",
  pending: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
  closed: "bg-slate-100 text-slate-500",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  variant,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
        VARIANT_MAP[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
