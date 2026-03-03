import { Button } from "@/components/ui/Button";

type ModuleCardProps = {
  name: string;
  summary: string;
  cta: string;
  status: "MVP" | "En progreso" | "Listo";
};

export function ModuleCard({ name, summary, cta, status }: ModuleCardProps) {
  return (
    <article className="neu-surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-800">{name}</h3>
        <span className="neu-chip px-3 py-1 text-xs font-semibold text-slate-500">
          {status}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-500">{summary}</p>

      <Button className="w-full" variant="secondary">
        {cta}
      </Button>
    </article>
  );
}
