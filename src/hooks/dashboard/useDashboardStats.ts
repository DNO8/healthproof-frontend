"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardStats, type DashboardStats } from "@/actions/dashboard/dashboard-stats";
import type { UserRole } from "@/types/domain.types";

const CACHE_KEY = "hp_dashboard_stats";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedStats {
  wallet: string;
  role: string;
  stats: DashboardStats;
  ts: number;
}

function getCached(wallet: string, role: string): DashboardStats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStats;
    if (parsed.wallet !== wallet.toLowerCase()) return null;
    if (parsed.role !== role) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.stats;
  } catch {
    return null;
  }
}

function setCache(wallet: string, role: string, stats: DashboardStats) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ wallet: wallet.toLowerCase(), role, stats, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function clearDashboardStatsCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

export function useDashboardStats(
  wallet: string | null | undefined,
  role: UserRole | null,
) {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);
  const fetchedForRef = useRef<Set<string>>(new Set());

  const refetch = useCallback(async () => {
    if (!wallet || !role) {
      setStats({});
      setLoading(false);
      return;
    }

    const cacheKey = `${wallet.toLowerCase()}:${role}`;
    const cached = getCached(wallet, role);
    if (cached) {
      setStats(cached);
      setLoading(false);
      return;
    }

    // Avoid duplicate fetches for the same (wallet, role) in the same session
    if (fetchedForRef.current.has(cacheKey)) {
      setLoading(false);
      return;
    }

    // Cooldown after failure (persisted in sessionStorage)
    try {
      const lastErr = sessionStorage.getItem("hp_dashboard_stats_error");
      if (lastErr && Date.now() - parseInt(lastErr, 10) < 30_000) {
        console.warn("[useDashboardStats] In error cooldown, skipping");
        setLoading(false);
        return;
      }
    } catch {
      /* ignore */
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetchedForRef.current.add(cacheKey);

    setLoading(true);
    try {
      const result = await getDashboardStats(wallet, role);
      setStats(result);
      setCache(wallet, role, result);
      try {
        sessionStorage.removeItem("hp_dashboard_stats_error");
      } catch { /* ignore */ }
    } catch (err) {
      console.error("[useDashboardStats]", err);
      setStats({});
      try {
        sessionStorage.setItem("hp_dashboard_stats_error", String(Date.now()));
      } catch { /* ignore */ }
      // Remove from fetched set so we can retry after cooldown
      fetchedForRef.current.delete(cacheKey);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [wallet, role]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
