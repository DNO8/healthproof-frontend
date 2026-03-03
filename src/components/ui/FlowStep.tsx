type FlowStepProps = {
  step: number;
  title: string;
  detail: string;
};

export function FlowStep({ step, title, detail }: FlowStepProps) {
  return (
    <article className="flex items-start gap-4">
      <div className="neu-chip mt-1 flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-600">
        {step}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </article>
  );
}
