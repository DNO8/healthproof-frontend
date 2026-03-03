import { Button } from "@/components/ui";

export function FinalCtaSection() {
  return (
    <div className="neu-shell mt-10 border border-white/70 p-7 text-center sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Capítulo final
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">
        Lleva tu flujo clínico a una capa verificable
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
        Implementa HealthProof en tus procesos críticos y convierte cada
        intercambio en evidencia trazable y auditable.
      </p>
      <div className="mt-6 flex justify-center">
        <Button
          className="min-w-[260px] cursor-pointer"
          size="lg"
          variant="primary"
        >
          Solicitar demo técnica
        </Button>
      </div>
    </div>
  );
}
