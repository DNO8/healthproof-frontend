"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, KeyRound } from "lucide-react";

interface RegenerateKeysModalProps {
  onRegenerate: () => Promise<boolean>;
  onDismiss: () => void;
  onSwitchToRecovery?: () => void;
}

export function RegenerateKeysModal({ onRegenerate, onDismiss, onSwitchToRecovery }: RegenerateKeysModalProps) {
  const t = useTranslations("keyRecovery.regenerate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const CONFIRM_PHRASE = t("confirmPlaceholder");
  const canRegenerate = confirmText.trim() === CONFIRM_PHRASE;

  const handleRegenerate = async () => {
    if (!canRegenerate) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await onRegenerate();
      if (!ok) {
        setError(t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-6">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
          </div>

          <p className="text-sm text-gray-600">
            {t("body")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6">
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>{t("warning")}</strong>
          </div>

          <div className="mb-3 space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              {t("confirmLabel")}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium uppercase tracking-wider focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white p-4 sm:p-6 sm:pt-3">
          {onSwitchToRecovery && (
            <button
              type="button"
              onClick={onSwitchToRecovery}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-50 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              <KeyRound className="h-4 w-4" />
              {t("haveCode")}
            </button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={loading || !canRegenerate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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
