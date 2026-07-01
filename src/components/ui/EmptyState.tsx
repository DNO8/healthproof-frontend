"use client";

import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="neu-shell flex flex-col items-center gap-3 rounded-2xl border border-white/70 p-8 text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          className="mt-1 rounded-xl bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          href={action.href}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
