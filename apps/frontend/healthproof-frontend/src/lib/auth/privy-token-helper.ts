"use client";

import { usePrivy } from "@privy-io/react-auth";

/**
 * Hook that returns a helper to inject the current Privy access token
 * into server-action payloads. This bypasses stale cookies when switching
 * accounts in the same browser.
 *
 * Usage:
 *   const withPrivyToken = useWithPrivyToken();
 *   const result = await myAction(await withPrivyToken({ id: userId, ... }));
 */
export function useWithPrivyToken() {
  const { getAccessToken } = usePrivy();

  return async <T extends Record<string, unknown>>(
    data: T,
  ): Promise<T & { _privyToken?: string }> => {
    try {
      const token = await getAccessToken();
      return { ...data, ...(token ? { _privyToken: token } : {}) };
    } catch {
      return data;
    }
  };
}

/**
 * Standalone async helper when you already have a token getter.
 * Use inside client components that already call usePrivy().
 */
export async function withPrivyToken<T extends Record<string, unknown>>(
  data: T,
  getAccessToken: () => Promise<string | null>,
): Promise<T & { _privyToken?: string }> {
  try {
    const token = await getAccessToken();
    return { ...data, ...(token ? { _privyToken: token } : {}) };
  } catch {
    return data;
  }
}
