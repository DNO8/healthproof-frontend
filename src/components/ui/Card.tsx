import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, description, children, className }: CardProps) {
  return (
    <section className={cn("neu-surface p-5 sm:p-6", className)}>
      <header className="mb-4 space-y-1">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description ? (
          <p className="text-(--hp-muted) text-sm">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
