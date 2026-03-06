"use client";

import Link from "next/link";
import { useState } from "react";
import { sileo } from "sileo";
import { updateProfile } from "@/app/auth/update-profile";
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
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await updateProfile({ id: userId, full_name: fullName });

      if (result.error) {
        sileo.error({
          title: "Error",
          description: result.error,
        });
        return;
      }

      clearDbUserCache();
      sileo.success({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
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
          Email
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
          Role
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
          Full Name
        </label>
        <input
          className={inputClass}
          id="fullName"
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          type="text"
          value={fullName}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="walletAddress">
          Embedded Wallet
        </label>
        <input
          className={readOnlyClass}
          id="walletAddress"
          readOnly
          type="text"
          value={walletAddress || "No wallet linked yet"}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {walletAddress
            ? "Used for on-chain signing."
            : "A wallet will be created when you need on-chain features."}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          className="rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
        <Link
          className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          href="/dashboard"
        >
          Back to Dashboard
        </Link>
      </div>
    </form>
  );
}
