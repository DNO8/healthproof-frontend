"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type ProfileFormProps = {
  email: string;
  fullName: string;
  walletAddress: string;
  role: string;
  roleLabel: string;
};

export function ProfileForm({
  email,
  fullName: initialName,
  walletAddress: initialWallet,
  role,
  roleLabel,
}: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [walletAddress, setWalletAddress] = useState(initialWallet);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          wallet_address: walletAddress.trim() || null,
        },
      });

      if (error) {
        sileo.error({
          title: "Error",
          description: error.message,
        });
        return;
      }

      sileo.success({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
        duration: 3000,
      });

      router.refresh();
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
          Wallet Address
        </label>
        <input
          className={inputClass}
          id="walletAddress"
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x... (optional for now)"
          type="text"
          value={walletAddress}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Required for on-chain signing. Wallet connect integration coming soon.
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
