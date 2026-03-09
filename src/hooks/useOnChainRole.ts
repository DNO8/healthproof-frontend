"use client";

import { useState, useEffect, useCallback } from "react";
import { getRoleOnChain } from "@/actions/register-entity-onchain";
import { CONTRACT_TO_ROLE, type UserRole } from "@/types/domain.types";

const CACHE_KEY = "hp_onchain_role";

interface CachedRole {
  wallet: string;
  role: UserRole | null;
  ts: number;
}

function getCached(wallet: string): UserRole | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRole;
    if (parsed.wallet !== wallet.toLowerCase()) return null;
    if (Date.now() - parsed.ts > 5 * 60 * 1000) return null;
    return parsed.role;
  } catch {
    return null;
  }
}

function setCache(wallet: string, role: UserRole | null) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ wallet: wallet.toLowerCase(), role, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function clearOnChainRoleCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

export function useOnChainRole(walletAddress: string | null | undefined) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!walletAddress) {
      setRole(null);
      setLoading(false);
      return;
    }

    const cached = getCached(walletAddress);
    if (cached) {
      setRole(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const contractRole = await getRoleOnChain(walletAddress);
      const resolved =
        contractRole !== null ? (CONTRACT_TO_ROLE[contractRole] ?? null) : null;
      setRole(resolved);
      setCache(walletAddress, resolved);
    } catch (err) {
      console.error("useOnChainRole error:", err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { role, loading, refetch };
}
