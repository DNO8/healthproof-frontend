"use client";

import { usePrivy, PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { setTokenGetter } from "@/services/api/interceptors";
import { useUpsertUser } from "@/hooks/auth/useUpsertUser";
import { useSyncWallet } from "@/hooks/auth/useSyncWallet";
import { useSyncKeys } from "@/hooks/auth/useSyncKeys";
import { useRegisterIdentity } from "@/hooks/healthcare-networks/useRegisterIdentity";
import { useSwitchToHygieia } from "@/hooks/admin/useSwitchToHygieia";
import { KeyConflictBanner } from "@/components/feedback/KeyConflictBanner";
import { RpcHealthBanner } from "@/components/feedback/RpcHealthBanner";
import { RecoveryCodeModal } from "@/components/auth/RecoveryCodeModal";
import { RecoveryInputModal } from "@/components/auth/RecoveryInputModal";
import { RegenerateKeysModal } from "@/components/auth/RegenerateKeysModal";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

function PrivyTokenSync({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  useUpsertUser();
  useSyncWallet();
  useSwitchToHygieia();
  const { recoveryState, recoverWithCode, dismissRecoveryCode, regenerateKeys } = useSyncKeys();
  useRegisterIdentity();

  return (
    <>
      <RpcHealthBanner />
      <KeyConflictBanner />
      {recoveryState.step === "show_recovery_code" && recoveryState.recoveryCode && (
        <RecoveryCodeModal
          recoveryCode={recoveryState.recoveryCode}
          onDismiss={dismissRecoveryCode}
        />
      )}
      {recoveryState.step === "needs_input" && (
        <RecoveryInputModal
          onRecover={recoverWithCode}
          onDismiss={dismissRecoveryCode}
        />
      )}
      {recoveryState.needsRegeneration && (
        <RegenerateKeysModal
          onRegenerate={regenerateKeys}
          onDismiss={dismissRecoveryCode}
        />
      )}
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        loginMethods: ["email", "wallet", "google"],
        appearance: {
          theme: "light",
          accentColor: "#93C5FD",
          logo: "/images/logo/healthproof-logo.png",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <PrivyTokenSync>{children}</PrivyTokenSync>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
