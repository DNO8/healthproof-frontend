import {
  REGULATORY_DRIVERS,
  RISK_EXAMPLES,
} from "@/components/landing/constants";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function RegulatoryUrgencySection() {
  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle
          eyebrow="Why Now"
          title="Healthcare is entering the era of verifiable data"
        />

        <div className="mx-auto mt-6 max-w-3xl space-y-6">
          <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            Healthcare systems are undergoing a structural shift driven by:
          </p>

          <ul className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            {REGULATORY_DRIVERS.map((driver) => (
              <li
                className="neu-inset flex items-center gap-3 p-4"
                key={driver}
              >
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-primary)" />
                <span className="text-sm font-medium text-slate-700">
                  {driver}
                </span>
              </li>
            ))}
          </ul>

          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              The risk is no longer losing documents. The risk is{" "}
              <strong className="text-slate-800">
                trusting documents that cannot be verified.
              </strong>
            </p>
            <p className="text-sm text-slate-600 sm:text-base">
              A single altered PDF can change:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {RISK_EXAMPLES.map((risk) => (
                <span
                  className="neu-chip px-4 py-2 text-xs font-semibold text-slate-600"
                  key={risk}
                >
                  {risk}
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700 sm:text-base">
              Healthcare needs{" "}
              <span className="text-sky-600">verifiable evidence</span>, not
              just stored data.
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
