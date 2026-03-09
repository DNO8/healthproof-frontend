"use client";

import { useState, useEffect } from "react";
import {
  listUsersByOnChainRole,
  type FilteredUserOption,
} from "@/actions/list-users-by-onchain-role";
import type { UserRole } from "@/types/domain.types";

export type UserSelectProps = {
  value: string;
  onChange: (walletAddress: string) => void;
  label: string;
  placeholder: string;
  filterRole?: UserRole;
  excludeWallet?: string;
};

export function UserSelect({
  value,
  onChange,
  label,
  placeholder,
  filterRole,
  excludeWallet,
}: UserSelectProps) {
  const [users, setUsers] = useState<FilteredUserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listUsersByOnChainRole(filterRole, excludeWallet)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [filterRole, excludeWallet]);

  function formatLabel(u: FilteredUserOption) {
    const name = u.full_name || u.email || "Unknown";
    const shortWallet = `${u.wallet_address.slice(0, 6)}…${u.wallet_address.slice(-4)}`;
    return `${name} (${shortWallet})`;
  }

  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-medium text-slate-700"
        htmlFor="user-select"
      >
        {label}
      </label>
      <select
        id="user-select"
        className="neu-inset w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading…" : placeholder}
        </option>
        {users.map((u) => (
          <option key={u.wallet_address} value={u.wallet_address}>
            {formatLabel(u)}
          </option>
        ))}
      </select>
    </div>
  );
}
