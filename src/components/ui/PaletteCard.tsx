type PaletteCardProps = {
  name: string;
  type: "background" | "primary" | "accent";
  hex: string;
  rgb: string;
  description: string;
};

export function PaletteCard({
  name,
  type,
  hex,
  rgb,
  description,
}: PaletteCardProps) {
  return (
    <article className="neu-surface group p-6">
      <div
        className="mb-5 h-28 w-full rounded-3xl transition-transform duration-300 group-hover:scale-[1.01]"
        style={{
          backgroundColor: hex,
          boxShadow:
            hex === "#F5F7FA"
              ? "var(--hp-shadow-pressed)"
              : "var(--hp-shadow-raised)",
        }}
      />

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-slate-700">{name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            {type}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 py-2">
            <span className="font-mono text-slate-400">HEX</span>
            <span className="font-mono font-medium text-slate-700">{hex}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-mono text-slate-400">RGB</span>
            <span className="font-mono text-slate-700">{rgb}</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </article>
  );
}
