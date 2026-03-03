import {
  BASELINE_PAIN_METRICS,
  PARTNER_SIGNALS,
  TRUST_METRICS,
} from "@/components/landing/constants";

type TrustSignalsSectionProps = {
  verified: boolean;
};

export function TrustSignalsSection({ verified }: TrustSignalsSectionProps) {
  const visibleMetrics = verified ? TRUST_METRICS : BASELINE_PAIN_METRICS;

  return (
    <div className="neu-shell border border-white/70 px-5 py-6 sm:px-8 sm:py-8">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {verified
          ? "Indicadores con HealthProof activo"
          : "Estado base antes de HealthProof"}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {visibleMetrics.map((metric) => (
          <article className="neu-surface p-5" key={metric.label}>
            <p className="text-3xl font-semibold tracking-tight text-slate-800">
              {metric.value}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {metric.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {metric.note}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {PARTNER_SIGNALS.map((partner) => (
          <span
            className="neu-chip px-4 py-2 text-xs font-semibold tracking-wide text-slate-600"
            key={partner}
          >
            {partner}
          </span>
        ))}
      </div>
    </div>
  );
}
