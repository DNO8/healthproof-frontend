import { ICD11_FEATURES } from "@/components/landing/constants";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function Icd11Section() {
  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle
          eyebrow="ICD-11"
          title="Designed for the global transition to ICD-11"
        />

        <div className="mx-auto mt-6 max-w-3xl space-y-6">
          <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            The{" "}
            <strong className="text-slate-800">
              International Classification of Diseases (ICD-11)
            </strong>{" "}
            is the new global standard for digital health data. Adopted by the
            World Health Organization, ICD-11 enables standardized health
            information exchange across countries and healthcare systems.
          </p>

          <div>
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              ICD-11 introduces
            </p>
            <ul className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
              {ICD11_FEATURES.map((feature) => (
                <li
                  className="neu-inset flex items-center gap-3 p-4"
                  key={feature}
                >
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-primary)" />
                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Healthcare institutions must adapt their digital infrastructure to
              support these standards.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              HealthProof accelerates that transition by enabling{" "}
              <strong className="text-slate-800">
                verifiable clinical documentation compatible with interoperable
                health systems.
              </strong>
            </p>
            <p className="text-sm font-semibold text-slate-700 sm:text-base">
              Instead of rebuilding their systems, institutions can{" "}
              <span className="text-sky-600">add a verification layer</span>{" "}
              that ensures their clinical data can be trusted across networks.
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
