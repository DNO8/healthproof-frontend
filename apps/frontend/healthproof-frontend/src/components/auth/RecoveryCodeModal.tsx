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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Guarda tu código de recuperación</h2>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Este código es necesario para recuperar tu cuenta en un nuevo dispositivo.
          Se muestra <strong>una sola vez</strong>. Guárdalo en papel o en un gestor de contraseñas.
        </p>

        <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
          <code className="block break-all text-center font-mono text-sm text-gray-800">
            {recoveryCode}
          </code>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Download className="h-4 w-4" />
            Descargar
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          He guardado mi código
        </button>
      </div>
    </div>
  );
}
