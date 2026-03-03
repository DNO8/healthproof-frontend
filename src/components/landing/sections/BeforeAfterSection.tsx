import Image from "next/image";
import {
  POST_BLOCKCHAIN_ASSETS,
  POST_LABELS,
  PRE_BLOCKCHAIN_ASSETS,
  PRE_LABELS,
} from "@/components/landing/constants";

export function BeforeAfterSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <article className="neu-surface p-6">
        <h2 className="text-xl font-semibold text-slate-800">
          Antes de HealthProof
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Archivos dispersos, evidencia difícil de auditar y control manual de
          acceso.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {PRE_BLOCKCHAIN_ASSETS.map((asset, index) => (
            <li
              className="neu-inset flex flex-col items-center gap-2 p-3 text-center"
              key={asset}
            >
              <Image
                alt={PRE_LABELS[index] ?? "asset pre"}
                className="h-10 w-10 object-contain"
                height={40}
                src={asset}
                width={40}
              />
              <span className="text-xs font-medium text-slate-600">
                {PRE_LABELS[index]}
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className="neu-surface p-6">
        <h2 className="text-xl font-semibold text-slate-800">
          Con HealthProof
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Evidencia anclada en blockchain, permisos granulares y validación
          instantánea.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {POST_BLOCKCHAIN_ASSETS.map((asset, index) => (
            <li
              className="neu-inset flex flex-col items-center gap-2 p-3 text-center"
              key={asset}
            >
              <Image
                alt={POST_LABELS[index] ?? "asset post"}
                className="h-10 w-10 object-contain"
                height={40}
                src={asset}
                width={40}
              />
              <span className="text-xs font-medium text-slate-600">
                {POST_LABELS[index]}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
