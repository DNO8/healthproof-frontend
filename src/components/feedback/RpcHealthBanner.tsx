"use client";

import { useRpcHealth } from "@/hooks/admin/useRpcHealth";

export function RpcHealthBanner() {
  const { checked, healthy } = useRpcHealth();

  if (!checked || healthy !== false) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-100 flex items-center justify-center gap-2 bg-red-100 px-4 py-2 text-center text-sm font-medium text-red-700 shadow-md">
      <span>⚠️</span>
      <span>
        The Hygieia network is currently unreachable. On-chain operations
        (registration, permissions) will not work until the network is restored.
      </span>
    </div>
  );
}
