"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, type DashboardStats } from "@/actions/dashboard-stats";
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

  const refetch = useCallback(async () => {
    if (!wallet || !role) {
      setStats({});
      setLoading(false);
      return;
    }

    const cached = getCached(wallet, role);
    if (cached) {
      setStats(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getDashboardStats(wallet, role);
      setStats(result);
      setCache(wallet, role, result);
    } catch (err) {
      console.error("[useDashboardStats]", err);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [wallet, role]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
