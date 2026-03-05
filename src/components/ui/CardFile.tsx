import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardFileProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  tabLabel?: string;
  tabOffset?: number;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
};

export function CardFile({
  title,
  description,
  children,
  className,
  tabLabel,
  tabOffset,
  onPointerEnter,
  onPointerLeave,
}: CardFileProps) {
  return (
    <div
      className={cn("relative pt-8 cursor-pointer", className)}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Embossed file tab */}
      <div
        aria-hidden="true"
        className="neu-file-tab absolute top-0 z-10 flex h-9 w-[100px] items-center justify-center rounded-t-xl border border-b-0 border-white/60 bg-(--hp-bg)"
        style={{ left: tabOffset != null ? `${tabOffset}px` : "16px" }}
      >
        {tabLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--hp-muted) select-none">
            {tabLabel}
          </span>
        ) : null}
      </div>

      {/* Card body — layered neumorphic surface */}
      <section className="neu-file-card relative z-0 rounded-[20px] border border-white/60 bg-(--hp-bg) p-5 sm:p-6">
        {/* Inset content well */}
        <div className="neu-file-well rounded-2xl p-4">
          <header className="mb-3 space-y-1">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {description ? (
              <p className="text-sm leading-relaxed text-(--hp-muted)">
                {description}
              </p>
            ) : null}
          </header>
          {children}
        </div>
      </section>
    </div>
  );
}
