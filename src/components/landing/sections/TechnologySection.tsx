import {
  TECH_ENSURES,
  TECH_GUARANTEES,
} from "@/components/landing/constants";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TechnologySection() {
  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle
          eyebrow="Technology"
          title="Proof infrastructure built for healthcare"
        />

        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Blockchain guarantees
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TECH_GUARANTEES.map((item) => (
                <li
                  className="neu-inset flex items-center gap-3 p-4"
                  key={item}
                >
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-success)" />
                  <span className="text-sm font-medium text-slate-700">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Sensitive medical data remains{" "}
              <strong className="text-slate-800">off-chain</strong>. Only{" "}
              <strong className="text-slate-800">
                cryptographic proofs and document references
              </strong>{" "}
              are recorded.
            </p>
          </div>

          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              This approach ensures
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {TECH_ENSURES.map((item) => (
                <span
                  className="neu-chip px-4 py-2 text-xs font-semibold text-slate-600"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 sm:text-base">
            Each country can operate its own{" "}
            <strong className="text-slate-800">
              HealthProof Layer-1 network
            </strong>{" "}
            to comply with national data sovereignty laws.
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}
