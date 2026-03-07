"use client";

import { useState, useEffect } from "react";
import {
  listUsersByRole,
  type UserOption,
} from "@/actions/list-users-by-role";

type UserSelectProps = {
  dbRole: string;
  value: string;
  onChange: (userId: string) => void;
  label: string;
  placeholder: string;
  excludeId?: string;
};

export function UserSelect({
  dbRole,
  value,
  onChange,
  label,
  placeholder,
  excludeId,
}: UserSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listUsersByRole(dbRole)
      .then((list) => {
        setUsers(excludeId ? list.filter((u) => u.id !== excludeId) : list);
      })
      .finally(() => setLoading(false));
  }, [dbRole, excludeId]);

  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-medium text-slate-700"
        htmlFor={`user-select-${dbRole}`}
      >
        {label}
      </label>
      <select
        id={`user-select-${dbRole}`}
        className="neu-inset w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading…" : placeholder}
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name || u.email || u.id.slice(0, 20)}
          </option>
        ))}
      </select>
    </div>
  );
}
