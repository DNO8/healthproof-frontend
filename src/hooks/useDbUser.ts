"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getDbUser } from "@/actions/get-user";

const CACHE_KEY = "hp_db_user";

export interface DbUser {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
  created_at: string;
  public_key: string | null;
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

export function clearDbUserCache() {
  sessionStorage.removeItem(CACHE_KEY);
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
      const data = await getDbUser(userId);
      if (data) {
        setDbUser(data as DbUser);
        setCache(data as DbUser);
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

  return { dbUser, loading, refetch };
}
