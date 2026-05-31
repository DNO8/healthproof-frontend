"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield, KeyRound, AlertTriangle, RefreshCw, CheckCircle, CloudOff, Loader2 } from "lucide-react";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { hasKeyPair, getLocalShare1 } from "@/services/encryption/keystore";
import { getUserWithBackup } from "@/actions/auth/get-user-with-backup";

interface SecuritySectionProps {
  userId: string;
}

export function SecuritySection({ userId }: SecuritySectionProps) {
  const t = useTranslations("dashboard.profile.security");
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "mismatch">("loading");
  const [hasServerShare, setHasServerShare] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [hasLocalShare1, setHasLocalShare1] = useState(false);
  const requestRegenerate = useKeyConflictStore((s) => s.requestRegenerate);
  const setRequestRegenerate = useKeyConflictStore((s) => s.setRequestRegenerate);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [localExists, share1, userBackup] = await Promise.all([
          hasKeyPair(userId),
          getLocalShare1(userId),
          getUserWithBackup(userId),
        ]);
        if (cancelled) return;

        setHasLocalShare1(!!share1);
        setHasServerShare(!!userBackup?.server_share_ciphertext);
        setHasBackup(
          !!userBackup?.server_share_ciphertext && !!userBackup?.recovery_code_hash
        );

        const conflict = useKeyConflictStore.getState().conflict;
        if (conflict === "key_mismatch") {
          setStatus("mismatch");
        } else if (conflict === "missing_local_keys" || !localExists) {
          setStatus("missing");
        } else {
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("missing");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleRegenerate = () => {
    setRequestRegenerate(true);
    // The RegenerateKeysModal in providers.tsx will pick this up automatically
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-800">{t("title")}</h2>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        {/* Status row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            {status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("checking")}
              </div>
            )}

            {status === "ok" && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                {t("keysOk")}
              </div>
            )}

            {(status === "missing" || status === "mismatch") && (
              <div className="flex items-start gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {status === "mismatch" ? t("keysMismatch") : t("keysMissing")}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-700/80">
              <span className="inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                {hasLocalShare1 ? t("localSharePresent") : t("localShareMissing")}
              </span>
              <span className="inline-flex items-center gap-1">
                <CloudOff className="h-3 w-3" />
                {hasServerShare ? t("serverSharePresent") : t("serverShareMissing")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={requestRegenerate}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
          >
            {requestRegenerate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("regenerateKeys")}
          </button>
        </div>

        {/* Info / warning text */}
        <div className="mt-4 rounded-xl border border-amber-100 bg-white/60 p-3 text-xs leading-relaxed text-amber-800">
          <p className="font-medium">{t("warningTitle")}</p>
          <p className="mt-1 text-amber-700/80">{t("warningBody")}</p>
          {!hasBackup && (
            <p className="mt-1 text-amber-700/80">{t("noBackupNote")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
