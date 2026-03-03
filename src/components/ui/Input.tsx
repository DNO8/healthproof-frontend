import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700"
      htmlFor={inputId}
    >
      {label ? <span>{label}</span> : null}
      <input
        className={cn(
          "neu-focus-ring neu-inset h-11 w-full rounded-2xl px-4 text-sm text-slate-700 placeholder:text-slate-400",
          className,
        )}
        id={inputId}
        {...props}
      />
      {hint ? (
        <span className="text-(--hp-muted) text-xs font-normal">{hint}</span>
      ) : null}
    </label>
  );
}
