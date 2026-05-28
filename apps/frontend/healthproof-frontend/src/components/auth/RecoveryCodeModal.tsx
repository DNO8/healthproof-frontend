"use client";

import { useState } from "react";
import { Copy, Download, AlertTriangle, Check } from "lucide-react";

interface RecoveryCodeModalProps {
  recoveryCode: string;
  onDismiss: () => void;
}

export function RecoveryCodeModal({ recoveryCode, onDismiss }: RecoveryCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([recoveryCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "healthproof-recovery-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-6">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold sm:text-lg">Guarda tu código de recuperación</h2>
          </div>

          <p className="text-sm text-gray-600">
            Este código es necesario para recuperar tu cuenta en un nuevo dispositivo.
            Se muestra <strong>una sola vez</strong>. Guárdalo en papel o en un gestor de contraseñas.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6">
          <div className="mb-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 sm:p-4">
            <div className="max-h-[120px] overflow-y-auto">
              <code className="block break-all text-center font-mono text-xs text-gray-800 sm:text-sm">
                {recoveryCode}
              </code>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-100 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={onDismiss}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              He guardado mi código
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
