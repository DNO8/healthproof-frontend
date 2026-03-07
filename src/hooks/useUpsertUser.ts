"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { UserRole } from "@/types/domain.types";
import { upsertUser } from "@/actions/upsert-user";
import { clearDbUserCache } from "@/hooks/useDbUser";

const ROLE_KEY = "hp_selected_role";
const SESSION_KEY = "hp_upserted";
const VALID_ROLES: UserRole[] = ["patient", "laboratory", "medical_center"];

function extractEmail(
  user: ReturnType<typeof usePrivy>["user"],
): string | null {
  if (!user) return null;
  if (user.email?.address) return user.email.address;
  if (user.google?.email) return user.google.email;
  const walletAccount = user.linkedAccounts?.find(
    (a) => a.type === "wallet" && "address" in a,
  );
  if (walletAccount && "address" in walletAccount) return null;
  return null;
}

function extractName(user: ReturnType<typeof usePrivy>["user"]): string | null {
  if (!user) return null;
  if (user.google?.name) return user.google.name;
  return null;
}

export function useUpsertUser() {
  const { ready, authenticated, user } = usePrivy();
  const calledRef = useRef(false);

  const userId = user?.id;
  const email = extractEmail(user);
  const fullName = extractName(user);

  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (calledRef.current) return;

    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    const roleExplicit = Boolean(
      storedRole && VALID_ROLES.includes(storedRole),
    );

    // Skip if already upserted this session AND no explicit role pending
    const alreadyDone = sessionStorage.getItem(SESSION_KEY);
    if (alreadyDone === userId && !roleExplicit) return;

    calledRef.current = true;

    const role: UserRole = roleExplicit ? (storedRole as UserRole) : "patient";

    upsertUser({
      id: userId,
      email: email ?? "",
      role,
      roleExplicit,
      wallet_address: null,
      full_name: fullName,
    })
      .then((result) => {
        if (result.success) {
          sessionStorage.setItem(SESSION_KEY, userId);
          localStorage.removeItem(ROLE_KEY);
          clearDbUserCache();
        } else {
          console.error("upsertUser failed:", result.error);
          calledRef.current = false;
        }
      })
      .catch((err) => {
        console.error("Failed to upsert user:", err);
        calledRef.current = false;
      });
  }, [ready, authenticated, userId, email, fullName]);
}
