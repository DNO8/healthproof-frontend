"use client";

import { useEffect, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";
import { sileo } from "sileo";
import {
  registerEntityOnChain,
  verifyEntityOnChain,
  getEntityOnChain,
} from "@/actions/register-entity-onchain";
import { registerDeployerAsGuardian } from "@/actions/setup-deployer-certifier";
import { ROLE_TO_CONTRACT, type UserRole } from "@/types/domain.types";
import { clearOnChainRoleCache } from "@/hooks/useOnChainRole";

const ROLE_KEY = "hp_selected_role";
const REGISTERED_KEY = "hp_onchain_registered";
const VALID_ROLES: UserRole[] = ["patient", "doctor", "lab"];

export function useRegisterIdentity() {
  const { wallets } = useWallets();
  const calledRef = useRef(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address;

  useEffect(() => {
    if (!walletAddress || calledRef.current) return;

    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    if (!storedRole || !VALID_ROLES.includes(storedRole)) return;

    const alreadyRegistered = sessionStorage.getItem(REGISTERED_KEY);
    if (alreadyRegistered === walletAddress) return;

    calledRef.current = true;

    (async () => {
      try {
        // Check if already registered on-chain
        const existing = await getEntityOnChain(walletAddress);
        if (existing && existing.role !== 0) {
          // Already registered — just clear the localStorage key
          localStorage.removeItem(ROLE_KEY);
          sessionStorage.setItem(REGISTERED_KEY, walletAddress);
          clearOnChainRoleCache();
          calledRef.current = false;
          return;
        }

        // Register on-chain via deployer admin
        const contractRole = ROLE_TO_CONTRACT[storedRole];
        const regResult = await registerEntityOnChain({
          wallet: walletAddress,
          role: contractRole,
        });

        if ("error" in regResult) {
          console.error("On-chain registration failed:", regResult.error);
          sileo.error({
            title: "Registration failed",
            description: regResult.error.slice(0, 120),
            duration: 5000,
          });
          calledRef.current = false;
          return;
        }

        // Verify entity on-chain
        const verResult = await verifyEntityOnChain(walletAddress);
        if ("error" in verResult) {
          console.warn("On-chain verification failed:", verResult.error);
        }

        // Register deployer as guardian (needed for permission grant/revoke proxy)
        const guardianResult = await registerDeployerAsGuardian(walletAddress);
        if ("error" in guardianResult) {
          console.warn("Guardian registration failed:", guardianResult.error);
        }

        localStorage.removeItem(ROLE_KEY);
        sessionStorage.setItem(REGISTERED_KEY, walletAddress);
        clearOnChainRoleCache();

        sileo.success({
          title: "Identity registered",
          description: `Your ${storedRole} identity has been registered on-chain.`,
          duration: 4000,
        });
      } catch (err) {
        console.error("useRegisterIdentity error:", err);
        calledRef.current = false;
      }
    })();
  }, [walletAddress]);
}
