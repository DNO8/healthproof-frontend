"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { sileo } from "sileo";

export function KeyConflictBanner() {
  const t = useTranslations("keyConflict");
  const conflict = useKeyConflictStore((s) => s.conflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!conflict) return null;

  const title =
    conflict === "missing_local_keys"
      ? t("missingLocalKeys")
      : t("keyMismatch");

  const description =
    conflict === "missing_local_keys"
      ? t("missingLocalKeysDesc")
      : t("keyMismatchDesc");

  const handleRegenerate = () => {
    // Clear the session storage flag to force key regeneration
    sessionStorage.removeItem("hp_keys_synced");
    // Clear the conflict to hide the banner
    clearConflict();
    // Show warning toast
    sileo.warning({
      title: t("regenerateKeys"),
      description: t("regenerateWarning"),
      duration: 5000,
    });
    // Small delay to show the toast before reload
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="fixed inset-x-0 top-[60px] z-50 flex justify-center px-4 py-3">
      <div className="neu-shell w-full max-w-2xl border border-amber-200 bg-amber-50/90 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl leading-none">⚠️</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">{title}</h3>
            <p className="mt-1 text-xs text-amber-800">{description}</p>

            <div className="mt-3 rounded-xl bg-amber-100/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                {t("actionRequired")}
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-800">
                <li>• {t("useOriginalBrowser")}</li>
                <li>• {t("contactSupport")}</li>
              </ul>
            </div>

            {/* Regenerate option for users who want to reset keys (will lose access to old encrypted data) */}
            {(conflict === "missing_local_keys" || conflict === "key_mismatch") && (
              <div className="mt-3 border-t border-amber-200 pt-3">
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
                    type="button"
                  >
                    {t("regenerateKeys")}
                  </button>
                ) : (
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-red-700">
                      {t("confirmRegenerate")}
                    </p>
                    <p className="mt-1 text-[10px] text-red-600">
                      {t("regenerateWarning")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleRegenerate}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        type="button"
                      >
                        {t("regenerateKeys")}
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            className="rounded-lg p-1 text-amber-400 transition hover:bg-amber-100 hover:text-amber-600"
            onClick={clearConflict}
            type="button"
            aria-label={t("dismiss")}
          >
            <svg
              fill="none"
              height="18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="18"
            >
              <title>{t("dismiss")}</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
