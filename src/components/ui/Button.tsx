import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--hp-primary)] text-slate-800 border border-white/60 shadow-[var(--hp-shadow-raised)] hover:bg-[var(--hp-primary-soft)]",
  secondary:
    "bg-[var(--hp-layer)] text-slate-700 border border-[var(--hp-border)] shadow-[var(--hp-shadow-raised)] hover:bg-white",
  success:
    "bg-[var(--hp-success)] text-emerald-900 border border-white/70 shadow-[var(--hp-shadow-raised)] hover:brightness-95",
  ghost:
    "bg-transparent text-slate-600 border border-transparent hover:bg-white/45",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "neu-focus-ring inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      type="button"
      {...props}
    >
      {loading ? "Procesando..." : children}
    </button>
  );
}
