"use client";

import { usePrivy } from "@privy-io/react-auth";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteKeyPair } from "@/services/encryption/keystore";
import { useKeyConflictStore } from "@/state/key-conflict.store";

export function KeyConflictBanner() {
  const t = useTranslations("keyConflict");
  const { user } = usePrivy();
  const conflict = useKeyConflictStore((s) => s.conflict);
  const isRecovering = useKeyConflictStore((s) => s.isRecovering);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);
  const setRequestRegenerate = useKeyConflictStore(
    (s) => s.setRequestRegenerate,
  );

  if (!conflict) return null;

  const title =
    conflict === "missing_local_keys"
      ? isRecovering
        ? t("recoveringTitle")
        : t("missingLocalKeys")
      : t("keyMismatch");

  const description =
    conflict === "missing_local_keys"
      ? isRecovering
        ? t("recoveringDesc")
        : t("missingLocalKeysDesc")
      : t("keyMismatchDesc");

  const handleClearAndRetry = async () => {
    const userId = user?.id;
    if (userId) {
      await deleteKeyPair(userId);
    }
    window.location.reload();
  };

  const handleRequestRegenerate = () => {
    setRequestRegenerate(true);
    clearConflict();
  };

  return (
    <div className="fixed inset-x-0 top-[60px] z-50 flex justify-center px-4 py-3">
      <div className="neu-shell w-full max-w-2xl border border-amber-200 bg-amber-50/90 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl leading-none">
            {isRecovering ? "🔐" : "⚠️"}
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">{title}</h3>
            <p className="mt-1 text-xs text-amber-800">{description}</p>

            {isRecovering && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("recoveringWait")}</span>
              </div>
            )}

            {!isRecovering && conflict === "key_mismatch" && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-amber-100/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    {t("actionRequired")}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-800">
                    <li>• {t("useOriginalBrowser")}</li>
                    <li>• {t("contactSupport")}</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleClearAndRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("clearAndRetry")}
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestRegenerate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-800"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t("regenerateKeys")}
                  </button>
                </div>
              </div>
            )}
          </div>
          {!isRecovering && (
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
          )}
        </div>
      </div>
    </div>
  );
}
