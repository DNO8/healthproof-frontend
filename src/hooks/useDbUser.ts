"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { UserRole } from "@/types/domain.types";
import { getDbUser } from "@/app/auth/get-user";

const CACHE_KEY = "hp_db_user";

interface DbUser {
  id: string;
  email: string;
  role: UserRole;
  wallet_address: string | null;
  full_name: string | null;
  is_verified: boolean;
  created_at: string;
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
  const fetchedRef = useRef(false);

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
        const normalized: DbUser = { ...data, role: data.role as UserRole };
        setDbUser(normalized);
        setCache(normalized);
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

    if (getCached(userId)) {
      setDbUser(getCached(userId));
      setLoading(false);
      fetchedRef.current = true;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    refetch();
  }, [ready, authenticated, userId, refetch]);

  return { dbUser, loading, refetch };
}
