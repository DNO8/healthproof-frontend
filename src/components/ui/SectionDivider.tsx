type SectionDividerProps = {
  label?: string;
  className?: string;
};

export function SectionDivider({ label, className }: SectionDividerProps) {
  if (!label) {
    return (
      <div
        aria-hidden="true"
        className={`my-10 h-px bg-slate-300/60 ${className ?? ""}`}
      />
    );
  }

  return (
    <div className={`my-10 flex items-center gap-4 ${className ?? ""}`}>
      <div className="h-px flex-1 bg-slate-300/60" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </h2>
      <div className="h-px flex-1 bg-slate-300/60" />
    </div>
  );
}
