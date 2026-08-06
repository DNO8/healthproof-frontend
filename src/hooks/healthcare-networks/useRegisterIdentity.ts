"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
import { sileo } from "sileo";
import {
  getEntityOnChain,
  registerEntityOnChain,
  verifyEntityOnChain,
} from "@/actions/healthcare-networks/register-entity-onchain";
import { clearOnChainRoleCache } from "@/hooks/healthcare-networks/useOnChainRole";
import {
  CONTRACT_TO_ROLE,
  ROLE_TO_CONTRACT,
  type UserRole,
} from "@/types/domain.types";

const ROLE_KEY = "hp_selected_role"; // transient: cleared after registration
const INTENDED_KEY = "hp_intended_role"; // persistent: survives across sessions
const REGISTERED_KEY = "hp_onchain_registered"; // sessionStorage: set after success
const ATTEMPTS_KEY = "hp_reg_attempts"; // sessionStorage: retry counter
const MAX_ATTEMPTS = 10;
const VALID_ROLES: UserRole[] = ["patient", "doctor"];

function resolveWalletAddress(
  wallets: ReturnType<typeof useWallets>["wallets"],
): string | null {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (embedded?.address) return embedded.address;

  const external = wallets.find(
    (w) => w.walletClientType !== "privy" && w.address,
  );
  return external?.address ?? null;
}

export function useRegisterIdentity() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const ranForRef = useRef<{ userId: string; wallet: string } | null>(null);

  const walletAddress = resolveWalletAddress(wallets);
  const inProgressRef = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!ready || !authenticated || !userId || !walletAddress) return;

    const alreadyRan = ranForRef.current;
    if (
      alreadyRan &&
      alreadyRan.userId === userId &&
      alreadyRan.wallet === walletAddress
    ) {
      return;
    }

    if (inProgressRef.current) return;

    // Detect user switch and clear stale role data from previous account
    const lastUserId = localStorage.getItem("hp_last_user_id");
    if (lastUserId && lastUserId !== userId) {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(INTENDED_KEY);
      sessionStorage.removeItem(REGISTERED_KEY);
      sessionStorage.removeItem(ATTEMPTS_KEY);
    }
    localStorage.setItem("hp_last_user_id", userId);

    ranForRef.current = { userId, wallet: walletAddress };

    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    const intendedRole = localStorage.getItem(INTENDED_KEY) as UserRole | null;
    const roleToUse = (storedRole ?? intendedRole) as UserRole | null;

    if (!roleToUse || !VALID_ROLES.includes(roleToUse)) return;

    // Only trust the sessionStorage cache when there is no fresh signup role pending.
    // If hp_selected_role is set, the user just signed up and we must always proceed.
    if (!storedRole) {
      const alreadyRegistered = sessionStorage.getItem(REGISTERED_KEY);
      if (alreadyRegistered === walletAddress) return;
    }

    // Prevent infinite retry loop if the chain is not confirming transactions
    const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
    if (attempts >= MAX_ATTEMPTS) {
      console.warn(
        "[useRegisterIdentity] Max attempts reached. Chain may not be producing blocks.",
      );
      sileo.error({
        title: "Blockchain unavailable",
        description:
          "Could not register identity on-chain. The network may be down. Try again later.",
        duration: 8000,
      });
      return;
    }
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts + 1));

    inProgressRef.current = true;
    console.log(
      "[useRegisterIdentity] Registering wallet:",
      walletAddress,
      "as role:",
      roleToUse,
    );

    (async () => {
      try {
        const privyToken = await getAccessToken();
        const tokenOpt = privyToken ? { _privyToken: privyToken } : {};

        // Check if already registered on-chain
        const result = await getEntityOnChain({
          wallet: walletAddress,
          ...tokenOpt,
        });
        if (result.success && result.data && result.data.role !== 0) {
          const onChainUserRole = CONTRACT_TO_ROLE[result.data.role] ?? null;

          // Same role — all good
          if (onChainUserRole === roleToUse) {
            console.log(
              "[useRegisterIdentity] Already correctly registered as:",
              roleToUse,
            );
            localStorage.setItem(INTENDED_KEY, roleToUse);
            localStorage.removeItem(ROLE_KEY);
            sessionStorage.setItem(REGISTERED_KEY, walletAddress);
            clearOnChainRoleCache();
            ranForRef.current = null;
            return;
          }

          // Role mismatch — BLOCK re-registration to prevent data loss and compliance issues
          console.warn(
            "[useRegisterIdentity] Role mismatch blocked. On-chain:",
            onChainUserRole,
            "requested:",
            roleToUse,
          );
          localStorage.setItem(INTENDED_KEY, onChainUserRole); // accept on-chain role as source of truth
          localStorage.removeItem(ROLE_KEY);
          sessionStorage.setItem(REGISTERED_KEY, walletAddress);
          clearOnChainRoleCache();
          sileo.error({
            title: "Role already assigned",
            description: `Your wallet is already registered as a ${onChainUserRole}. Contact support to change roles.`,
            duration: 8000,
          });
          ranForRef.current = null;
          return;
        }

        // Register on-chain via deployer admin
        const contractRole = ROLE_TO_CONTRACT[roleToUse];
        console.log(
          "[useRegisterIdentity] Sending registerEntityOnChain with contractRole:",
          contractRole,
        );
        const regResult = await registerEntityOnChain({
          wallet: walletAddress,
          role: contractRole,
          ...tokenOpt,
        });

        if ("error" in regResult) {
          const isRpcError =
            regResult.error.includes("fetch") ||
            regResult.error.includes("ECONNREFUSED") ||
            regResult.error.includes("network") ||
            regResult.error.includes("timeout");
          const isRateLimit = regResult.error
            .toLowerCase()
            .includes("rate limit");

          console.error(
            "[useRegisterIdentity] Registration failed:",
            regResult.error,
          );
          sileo.error({
            title: isRpcError
              ? "Network error"
              : isRateLimit
                ? "Please wait"
                : "Registration failed",
            description: isRateLimit
              ? "Too many registration attempts. Please wait a minute and refresh."
              : isRpcError
                ? "Could not connect to the Hygieia network. Please try again later."
                : regResult.error.slice(0, 120),
            duration: 6000,
          });
          // Don't reset ranForRef on rate limit so the effect doesn't retry immediately
          if (!isRateLimit) {
            ranForRef.current = null;
          }
          inProgressRef.current = false;
          return;
        }

        if (regResult.success) {
          console.log(
            "[useRegisterIdentity] Registered. TxHash:",
            regResult.data.txHash,
          );
        }

        // Verify entity on-chain
        const verResult = await verifyEntityOnChain({
          wallet: walletAddress,
          ...tokenOpt,
        });
        if (!verResult.success) {
          console.warn(
            "[useRegisterIdentity] On-chain verification failed:",
            verResult.error,
          );
        }

        localStorage.setItem(INTENDED_KEY, roleToUse);
        localStorage.removeItem(ROLE_KEY);
        sessionStorage.setItem(REGISTERED_KEY, walletAddress);
        sessionStorage.removeItem(ATTEMPTS_KEY);
        clearOnChainRoleCache();

        sileo.success({
          title: "Identity registered",
          description: `Your ${roleToUse} identity has been registered on-chain.`,
          duration: 4000,
        });
      } catch (err) {
        console.error("[useRegisterIdentity] Unexpected error:", err);
        ranForRef.current = null;
      } finally {
        inProgressRef.current = false;
      }
    })();
  }, [ready, authenticated, userId, walletAddress, getAccessToken]);
}
