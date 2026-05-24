"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { sileo } from "sileo";
import { rotateUserKeys } from "@/actions/auth/rotate-user-keys";

export function KeyRotationButton() {
  const t = useTranslations("profile");
  const { user } = usePrivy();
  const [rotating, setRotating] = useState(false);

  const userId = user?.id;

  async function handleRotate() {
    if (!userId) return;
    if (!confirm(t("rotateConfirm"))) return;

    setRotating(true);
    try {
      const result = await rotateUserKeys({ userId });
      if (result.success) {
        sileo.success({
          title: t("rotateSuccess"),
          description: t("rotateSuccessDesc", { version: result.data.newVersion }),
        });
      } else {
        sileo.error({
          title: t("rotateError"),
          description: result.error || t("rotateErrorDesc"),
        });
      }
    } catch (err) {
      sileo.error({
        title: t("rotateError"),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="neu-shell mt-4 p-4">
      <h3 className="text-sm font-semibold text-slate-700">{t("keyManagement")}</h3>
      <p className="mt-1 text-xs text-slate-500">{t("keyManagementDesc")}</p>
      <button
        type="button"
        onClick={handleRotate}
        disabled={rotating || !userId}
        className="mt-3 inline-flex items-center rounded-xl border border-white/60 bg-(--hp-primary) px-4 py-2 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
      >
        {rotating ? t("rotating") : t("rotateKeys")}
      </button>
    </div>
  );
}
