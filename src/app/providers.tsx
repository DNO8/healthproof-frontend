"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { setTokenGetter } from "@/services/api/interceptors";
import { useUpsertUser } from "@/hooks/useUpsertUser";
import { useSyncWallet } from "@/hooks/useSyncWallet";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

function PrivyTokenSync({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  useUpsertUser();
  useSyncWallet();

  return <>{children}</>;
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
            createOnLogin: "all-users",
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
