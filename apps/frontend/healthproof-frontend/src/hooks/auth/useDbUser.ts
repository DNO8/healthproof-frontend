"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getDbUser } from "@/actions/auth/get-user";

const CACHE_KEY = "hp_db_user";

export interface DbUser {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
  created_at: string;
  public_key: string | null;
  role: string | null;
}

function getCached(userId: string): DbUser | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DbUser;
    return parsed.id === userId ? parsed : null;
  } catch {
    return null;
  }
}

function setCache(user: DbUser) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

const INVALIDATE_EVENT = "hp_db_user_invalidate";

export function clearDbUserCache() {
  sessionStorage.removeItem(CACHE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INVALIDATE_EVENT));
  }
}

export function useDbUser() {
  const { ready, authenticated, user } = usePrivy();
  const userId = user?.id;
  const fetchedForRef = useRef<string | null>(null);

  const [dbUser, setDbUser] = useState<DbUser | null>(() =>
    userId ? getCached(userId) : null,
  );
  const [loading, setLoading] = useState(!dbUser);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getDbUser({ idOrWallet: userId });
      if (result.success && result.data) {
        setDbUser(result.data as unknown as DbUser);
        setCache(result.data as unknown as DbUser);
      }
    } catch (err) {
      console.error("getDbUser failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || !authenticated || !userId) {
      setLoading(false);
      return;
    }

    const cached = getCached(userId);
    if (cached) {
      setDbUser(cached);
      setLoading(false);
      fetchedForRef.current = userId;
      return;
    }

    if (fetchedForRef.current === userId) return;
    fetchedForRef.current = userId;
    refetch();
  }, [ready, authenticated, userId, refetch]);

  // Listen for cross-component cache invalidation (e.g. after profile save)
  useEffect(() => {
    if (!userId) return;
    const handler = () => {
      fetchedForRef.current = null;
      refetch();
    };
    window.addEventListener(INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(INVALIDATE_EVENT, handler);
  }, [userId, refetch]);

  return { dbUser, loading, refetch };
}
