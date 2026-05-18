"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useLogout, useWallets } from "@privy-io/react-auth";
import { sileo } from "sileo";
import { upsertUser } from "@/actions/upsert-user";
import { clearDbUserCache } from "@/hooks/useDbUser";

const SESSION_KEY = "hp_upserted";

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

function extractWallet(
  wallets: ReturnType<typeof useWallets>["wallets"],
): string | null {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (embedded?.address) return embedded.address;
  const external = wallets.find(
    (w) => w.walletClientType !== "privy" && w.address,
  );
  return external?.address ?? null;
}

export function useUpsertUser() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { logout } = useLogout();
  const calledRef = useRef(false);

  const userId = user?.id;
  const email = extractEmail(user);
  const fullName = extractName(user);
  const walletAddress = extractWallet(wallets);

  useEffect(() => {
    if (!ready || !authenticated || !userId) return;
    if (calledRef.current) return;

    const alreadyDone = sessionStorage.getItem(SESSION_KEY);
    if (alreadyDone === userId) return;

    // Wait until wallet is available so the server dev-fallback can use it
    if (!walletAddress) return;

    calledRef.current = true;

    (async () => {
      const privyToken = await getAccessToken();

      // Read intended role from signup flow
      const intendedRole = typeof window !== "undefined"
        ? localStorage.getItem("hp_intended_role")
        : null;

      // Retry helper for transient auth failures
      async function tryUpsert(attempt: number): Promise<void> {
        const result = await upsertUser({
          id: userId,
          email: email ?? "",
          wallet_address: walletAddress,
          full_name: fullName,
          role: intendedRole ?? undefined,
          _privyToken: privyToken ?? undefined,
        });

        if ("success" in result && result.success) {
          sessionStorage.setItem(SESSION_KEY, userId);
          clearDbUserCache();
          return;
        }

        if ("code" in result && result.code === 409) {
          sileo.error({
            title: "Account already exists",
            description:
              "An account with this email is already registered. Please sign in instead.",
            duration: 6000,
          });
          await logout();
          window.location.href = "/auth";
          return;
        }

        const isAuthError = result.error?.toLowerCase().includes("authentication") ||
                            result.error?.toLowerCase().includes("token");

        if (isAuthError && attempt < 3) {
          const delay = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
          console.warn(`[useUpsertUser] Auth failed, retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
          await new Promise((r) => setTimeout(r, delay));
          // Refresh token before retry
          const freshToken = await getAccessToken();
          return tryUpsert(attempt + 1);
        }

        console.error("upsertUser failed:", result.error);
        calledRef.current = false;
      }

      try {
        await tryUpsert(0);
      } catch (err) {
        console.error("Failed to upsert user:", err);
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, userId, email, fullName, walletAddress, logout]);
}
