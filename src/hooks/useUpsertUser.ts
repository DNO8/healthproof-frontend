"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { UserRole } from "@/types/domain.types";
import { upsertUser } from "@/app/auth/actions";

const ROLE_KEY = "hp_selected_role";
const SESSION_KEY = "hp_upserted";
const VALID_ROLES: UserRole[] = ["patient", "laboratory", "medical_center"];

export function useUpsertUser() {
  const { ready, authenticated, user } = usePrivy();
  const calledRef = useRef(false);

  const userId = user?.id;
  const email = user?.email?.address;

  useEffect(() => {
    if (!ready || !authenticated || !userId || !email) return;
    if (calledRef.current) return;

    const alreadyDone = sessionStorage.getItem(SESSION_KEY);
    if (alreadyDone === userId) return;

    calledRef.current = true;

    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    const role: UserRole =
      storedRole && VALID_ROLES.includes(storedRole) ? storedRole : "patient";

    upsertUser({
      id: userId,
      email,
      role,
      wallet_address: null,
      full_name: null,
    })
      .then((result) => {
        if (result.success) {
          sessionStorage.setItem(SESSION_KEY, userId);
          localStorage.removeItem(ROLE_KEY);
        } else {
          console.error("upsertUser failed:", result.error);
          calledRef.current = false;
        }
      })
      .catch((err) => {
        console.error("Failed to upsert user:", err);
        calledRef.current = false;
      });
  }, [ready, authenticated, userId, email]);
}
