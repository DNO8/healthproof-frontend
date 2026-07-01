"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRoleOnChain } from "@/actions/healthcare-networks/register-entity-onchain";
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hp_onchain_role_updated"));
  }
}

export function useOnChainRole(walletAddress: string | null | undefined) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);
  const fetchedForRef = useRef<Set<string>>(new Set());
  const { getAccessToken } = usePrivy();

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

    if (fetchedForRef.current.has(walletAddress.toLowerCase())) {
      setLoading(false);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetchedForRef.current.add(walletAddress.toLowerCase());

    setLoading(true);
    try {
      const token = await getAccessToken().catch(() => null);
      const result = await getRoleOnChain({
        wallet: walletAddress,
        ...(token ? { _privyToken: token } : {}),
      });
      if (result.success) {
        const contractRole = result.data;
        const resolved =
          contractRole !== null
            ? (CONTRACT_TO_ROLE[contractRole] ?? null)
            : null;
        setRole(resolved);
        setCache(walletAddress, resolved);
      } else {
        setRole(null);
        fetchedForRef.current.delete(walletAddress.toLowerCase());
      }
    } catch (err) {
      console.error("useOnChainRole error:", err);
      setRole(null);
      fetchedForRef.current.delete(walletAddress.toLowerCase());
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [walletAddress, getAccessToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("hp_onchain_role_updated", handler);
    return () => window.removeEventListener("hp_onchain_role_updated", handler);
  }, [refetch]);

  return { role, loading, refetch };
}
