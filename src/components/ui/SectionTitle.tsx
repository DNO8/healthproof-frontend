import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  centered?: boolean;
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  centered = false,
  className,
}: SectionTitleProps) {
  return (
    <header className={cn("space-y-3", centered && "text-center", className)}>
      <p className="neu-chip inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </p>
      <h1
        className={cn(
          "max-w-2xl text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl",
          centered && "mx-auto",
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "max-w-2xl text-sm leading-6 text-(--hp-muted) sm:text-base",
          centered && "mx-auto",
        )}
      >
        {subtitle}
      </p>
    </header>
  );
}
