import {
  AFTER_HEALTHPROOF,
  BEFORE_HEALTHPROOF,
} from "@/components/landing/constants";

export function BeforeAfterSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <article className="neu-surface p-6">
        <h2 className="text-xl font-semibold text-slate-800">
          Before HealthProof
        </h2>
        <ul className="mt-5 space-y-3">
          {BEFORE_HEALTHPROOF.map((item) => (
            <li className="flex items-center gap-3" key={item}>
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-300" />
              <span className="text-sm text-slate-600">{item}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="neu-surface p-6">
        <h2 className="text-xl font-semibold text-slate-800">
          With HealthProof
        </h2>
        <ul className="mt-5 space-y-3">
          {AFTER_HEALTHPROOF.map((item) => (
            <li className="flex items-center gap-3" key={item}>
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-(--hp-success)" />
              <span className="text-sm text-slate-700">{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
