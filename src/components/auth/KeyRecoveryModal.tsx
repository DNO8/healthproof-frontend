"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { sileo } from "sileo";
import { usePrivy } from "@privy-io/react-auth";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { getUserWithBackup } from "@/actions/get-user-with-backup";
import {
  decryptPrivateKey,
  createRecoveryPassword,
} from "@/services/encryption/key-backup";
import { saveKeyPair } from "@/services/encryption/keystore";
import { importPrivateKey } from "@/services/encryption/ecdh";

interface KeyRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KeyRecoveryModal({
  isOpen,
  onClose,
  onSuccess,
}: KeyRecoveryModalProps) {
  const t = useTranslations("keyRecovery");
  const { user } = usePrivy();
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const userId = user?.id;
  const userEmail = user?.email?.address;

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !userId) return null;

  async function handleRecover() {
    if (!password.trim() || !userEmail) {
      sileo.warning({
        title: t("passwordRequired"),
        description: !userEmail ? "Email not available" : t("enterPassword"),
      });
      return;
    }

    if (attempts >= 3) {
      sileo.error({
        title: t("tooManyAttempts"),
        description: t("contactSupport"),
        duration: 6000,
      });
      return;
    }

    setLoading(true);

    try {
      // Get user with encrypted private key
      const userWithBackup = await getUserWithBackup(userId!);

      if (!userWithBackup?.encrypted_private_key) {
        sileo.error({
          title: t("noBackup"),
          description: t("noBackupDesc"),
        });
        setLoading(false);
        return;
      }

      // Create recovery password from email + user input
      const recoveryPassword = createRecoveryPassword(
        userEmail,
        password.trim(),
      );

      // Decrypt private key
      const privateKeyJwk = await decryptPrivateKey(
        userWithBackup.encrypted_private_key,
        recoveryPassword,
      );

      if (!privateKeyJwk) {
        setAttempts((a) => a + 1);
        sileo.error({
          title: t("wrongPassword"),
          description: t("attemptsLeft", { count: 2 - attempts }),
        });
        setLoading(false);
        return;
      }

      // Import the private key into IndexedDB
      const privateKey = await importPrivateKey(JSON.parse(privateKeyJwk));
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        JSON.parse(userWithBackup.public_key ?? "{}"),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        [],
      );

      await saveKeyPair(userId!, { privateKey, publicKey });

      // Success
      clearConflict();
      sileo.success({
        title: t("recoverySuccess"),
        description: t("recoverySuccessDesc"),
      });
      onSuccess();
    } catch (err: unknown) {
      console.error("[KeyRecoveryModal] Recovery failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      sileo.error({
        title: t("recoveryFailed"),
        description: `${t("recoveryFailedDesc")}: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="neu-shell mx-4 w-full max-w-md border border-white/70 p-6">
        <h2 className="text-lg font-bold text-slate-800" id="recovery-title">{t("title")}</h2>
        <p className="mt-2 text-sm text-slate-600" id="recovery-desc">{t("description")}</p>

        <div className="mt-4 rounded-xl bg-sky-50 p-3">
          <p className="text-xs text-sky-700">{t("info")}</p>
        </div>

        <div className="mt-4">
          <label htmlFor="recovery-password" className="mb-1.5 block text-xs font-medium text-slate-700">
            {t("passwordLabel")}
          </label>
          <input
            id="recovery-password"
            aria-describedby="recovery-desc"
            className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRecover()}
            placeholder={t("passwordPlaceholder")}
            type="password"
            value={password}
          />
        </div>

        {attempts > 0 && (
          <p className="mt-2 text-xs text-amber-600" role="alert">
            {t("attemptsLeft", { count: 3 - attempts })}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            aria-label={t("recover")}
            className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
            disabled={loading || attempts >= 3}
            onClick={handleRecover}
            type="button"
          >
            {loading ? t("recovering") : t("recover")}
          </button>
          <button
            aria-label={t("cancel")}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
