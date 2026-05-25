"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

interface RecoveryInputModalProps {
  onRecover: (code: string) => Promise<boolean>;
  onDismiss: () => void;
}

export function RecoveryInputModal({ onRecover, onDismiss }: RecoveryInputModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalized = code.replace(/\s/g, "");
    if (normalized.length < 8) {
      setError("Código inválido");
      setLoading(false);
      return;
    }

    const ok = await onRecover(normalized);
    if (!ok) {
      setError("Código incorrecto o expirado. Inténtalo de nuevo.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <KeyRound className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Recuperar cuenta</h2>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Ingresa tu código de recuperación para acceder a tu cuenta desde este dispositivo.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Pega tu código de recuperación aquí..."
            rows={4}
            className="mb-3 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />

          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Recuperar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
