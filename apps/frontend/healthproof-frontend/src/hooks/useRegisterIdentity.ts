"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { sileo } from "sileo";
import {
  registerEntityOnChain,
  verifyEntityOnChain,
  getEntityOnChain,
} from "@/actions/register-entity-onchain";
import { ROLE_TO_CONTRACT, CONTRACT_TO_ROLE, type UserRole } from "@/types/domain.types";
import { clearOnChainRoleCache } from "@/hooks/useOnChainRole";

const ROLE_KEY = "hp_selected_role";           // transient: cleared after registration
const INTENDED_KEY = "hp_intended_role";        // persistent: survives across sessions
const REGISTERED_KEY = "hp_onchain_registered"; // sessionStorage: set after success
const ATTEMPTS_KEY = "hp_reg_attempts";         // sessionStorage: retry counter
const MAX_ATTEMPTS = 2;
const VALID_ROLES: UserRole[] = ["patient", "doctor", "lab"];


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
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const calledRef = useRef(false);

  const walletAddress = resolveWalletAddress(wallets);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (!walletAddress || calledRef.current) return;

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
      console.warn("[useRegisterIdentity] Max attempts reached. Chain may not be producing blocks.");
      sileo.error({
        title: "Blockchain unavailable",
        description: "Could not register identity on-chain. The network may be down. Try again later.",
        duration: 8000,
      });
      return;
    }
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts + 1));

    calledRef.current = true;
    console.log("[useRegisterIdentity] Registering wallet:", walletAddress, "as role:", roleToUse);

    (async () => {
      try {
        const privyToken = await getAccessToken();
        const tokenOpt = privyToken ? { _privyToken: privyToken } : {};

        // Check if already registered on-chain WITH THE CORRECT ROLE
        const result = await getEntityOnChain({ wallet: walletAddress, ...tokenOpt });
        if (result.success && result.data && result.data.role !== 0) {
          const onChainUserRole = CONTRACT_TO_ROLE[result.data.role] ?? null;
          if (onChainUserRole === roleToUse) {
            console.log("[useRegisterIdentity] Already correctly registered as:", roleToUse);
            localStorage.setItem(INTENDED_KEY, roleToUse);
            localStorage.removeItem(ROLE_KEY);
            sessionStorage.setItem(REGISTERED_KEY, walletAddress);
            clearOnChainRoleCache();
            calledRef.current = false;
            return;
          }
          console.log("[useRegisterIdentity] Role mismatch on-chain:", onChainUserRole, "→ re-registering as:", roleToUse);
          sessionStorage.removeItem(REGISTERED_KEY); // force re-check next session too
        }

        // Register on-chain via deployer admin
        const contractRole = ROLE_TO_CONTRACT[roleToUse];
        console.log("[useRegisterIdentity] Sending registerEntityOnChain with contractRole:", contractRole);
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

          console.error("[useRegisterIdentity] Registration failed:", regResult.error);
          sileo.error({
            title: isRpcError ? "Network error" : "Registration failed",
            description: isRpcError
              ? "Could not connect to the Hygieia network. Please try again later."
              : regResult.error.slice(0, 120),
            duration: 6000,
          });
          calledRef.current = false;
          return;
        }

        if (regResult.success) {
          console.log("[useRegisterIdentity] Registered. TxHash:", regResult.data.txHash);
        }

        // Verify entity on-chain
        const verResult = await verifyEntityOnChain({ wallet: walletAddress, ...tokenOpt });
        if (!verResult.success) {
          console.warn("[useRegisterIdentity] On-chain verification failed:", verResult.error);
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
        calledRef.current = false;
      }
    })();
  }, [ready, authenticated, walletAddress]);
}
