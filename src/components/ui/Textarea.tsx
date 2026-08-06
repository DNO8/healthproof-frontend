import { cn } from "@/lib/utils";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label className="block text-xs font-medium text-slate-700">
          {label}
          <textarea
            className={cn(
              "neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-700 outline-none resize-none transition-all",
              "focus:ring-2 focus:ring-sky-200",
              error && "ring-2 ring-red-200",
            )}
            {...props}
          />
        </label>
      ) : (
        <textarea
          className={cn(
            "neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-700 outline-none resize-none transition-all",
            "focus:ring-2 focus:ring-sky-200",
            error && "ring-2 ring-red-200",
          )}
          {...props}
        />
      )}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
