"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface RegenerateKeysModalProps {
  onRegenerate: () => Promise<boolean>;
  onDismiss: () => void;
}

export function RegenerateKeysModal({ onRegenerate, onDismiss }: RegenerateKeysModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    const ok = await onRegenerate();
    if (!ok) {
      setError("No se pudieron generar las nuevas claves. Intenta de nuevo.");
      setLoading(false);
    }
    // If ok, useSyncKeys will show the recovery code modal automatically
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Claves de cifrado perdidas</h2>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          No se encontraron tus claves locales ni el respaldo en el servidor.
          Esto suele ocurrir al limpiar el navegador o usar un dispositivo nuevo.
        </p>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Advertencia:</strong> Si generas nuevas claves, los documentos
          cifrados anteriormente <strong>no podrán ser desencriptados</strong>.
          Los nuevos documentos usarán las claves nuevas.
        </div>

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
            type="button"
            onClick={handleRegenerate}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generar nuevas claves
          </button>
        </div>
      </div>
    </div>
  );
}
