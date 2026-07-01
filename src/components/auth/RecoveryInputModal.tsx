"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface RecoveryInputModalProps {
  onRecover: (code: string) => Promise<boolean>;
  onDismiss: () => void;
}

export function RecoveryInputModal({
  onRecover,
  onDismiss,
}: RecoveryInputModalProps) {
  const t = useTranslations("keyRecovery.recoveryInput");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalized = code.replace(/\s/g, "");
    if (normalized.length < 8) {
      setError(t("invalid"));
      setLoading(false);
      return;
    }

    const ok = await onRecover(normalized);
    if (!ok) {
      setError(t("wrongOrExpired"));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-6">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <KeyRound className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
          </div>

          <p className="text-sm text-gray-600">{t("info")}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("placeholder")}
              className="max-h-32 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
              rows={3}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>

        <div className="sticky bottom-0 bg-white p-4 sm:p-6 sm:pt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("action")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
