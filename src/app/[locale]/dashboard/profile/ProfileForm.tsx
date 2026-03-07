"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/actions/update-profile";
import { clearDbUserCache } from "@/hooks/useDbUser";

type ProfileFormProps = {
  userId: string;
  email: string;
  fullName: string;
  walletAddress: string;
  role: string;
  roleLabel: string;
};

export function ProfileForm({
  userId,
  email,
  fullName: initialName,
  walletAddress,
  role,
  roleLabel,
}: ProfileFormProps) {
  const t = useTranslations("dashboard.profile");
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await updateProfile({ id: userId, full_name: fullName });

      if (result.error) {
        sileo.error({
          title: t("errorTitle"),
          description: result.error,
        });
        return;
      }

      clearDbUserCache();
      sileo.success({
        title: t("updated"),
        description: t("updatedDesc"),
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/60 bg-white/40 px-4 py-2.5 text-sm text-slate-800 shadow-inner outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
  const labelClass = "mb-1.5 block text-xs font-medium text-slate-600";
  const readOnlyClass =
    "w-full rounded-xl border border-white/40 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-500";

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSave}>
      <div>
        <label className={labelClass} htmlFor="email">
          {t("emailLabel")}
        </label>
        <input
          className={readOnlyClass}
          id="email"
          readOnly
          type="email"
          value={email}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="role">
          {t("roleLabel")}
        </label>
        <input
          className={readOnlyClass}
          id="role"
          readOnly
          type="text"
          value={`${roleLabel} (${role})`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="fullName">
          {t("fullNameLabel")}
        </label>
        <input
          className={inputClass}
          id="fullName"
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("fullNamePlaceholder")}
          type="text"
          value={fullName}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="walletAddress">
          {t("walletLabel")}
        </label>
        <input
          className={readOnlyClass}
          id="walletAddress"
          readOnly
          type="text"
          value={walletAddress || t("noWallet")}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {walletAddress ? t("walletHint") : t("noWalletHint")}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          className="rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
          disabled={saving}
          type="submit"
        >
          {saving ? t("saving") : t("saveProfile")}
        </button>
        <Link
          className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          href="/dashboard"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </form>
  );
}
