import { FINAL_CTA_BULLETS } from "@/components/landing/constants";
import { Button } from "@/components/ui";

export function FinalCtaSection() {
  return (
    <div className="neu-shell mt-10 border border-white/70 p-7 text-center sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Get Started
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">
        Prepare your institution for verifiable healthcare
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
        Interoperability is not optional anymore. Healthcare institutions will
        soon need to prove:
      </p>
      <ul className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
        {FINAL_CTA_BULLETS.map((bullet) => (
          <li key={bullet}>
            <span className="neu-chip inline-flex px-4 py-2 text-xs font-semibold text-slate-600">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 sm:text-base">
        HealthProof provides the infrastructure to do that{" "}
        <strong className="text-slate-700">
          securely, privately, and instantly.
        </strong>
      </p>
      <div className="mt-6 flex justify-center">
        <Button
          className="min-w-[260px] cursor-pointer"
          size="lg"
          variant="primary"
        >
          Request a technical demo
        </Button>
      </div>
    </div>
  );
}
