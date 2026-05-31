"use server";

import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";
import { cookies } from "next/headers";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const JWKS_URI = PRIVY_APP_ID
  ? `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`
  : "";

const jwks = JWKS_URI ? createRemoteJWKSet(new URL(JWKS_URI)) : null;

/**
 * Verify a Privy JWT token.
 * Prefers an explicitly passed token (e.g. from client Authorization header),
 * then falls back to the privy-token cookie.
 * Uses Privy's JWKS for signature verification.
 * @returns The verified JWT payload.
 * @throws Error if token is missing, invalid, or expired.
 */
export async function verifyPrivyToken(privyToken?: string): Promise<JWTPayload> {
  const cookieStore = await cookies();
  const token = privyToken ?? cookieStore.get("privy-token")?.value;
  if (!token) {
    throw new Error("Unauthorized: no authentication token");
  }
  if (!jwks) {
    throw new Error("Unauthorized: JWKS not configured");
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "privy.io",
    audience: PRIVY_APP_ID,
    clockTolerance: 60,
  });
  return payload;
}

/**
 * Verify the authenticated user matches the expected userId or walletAddress.
 * Used for HIPAA-compliant access control on sensitive endpoints.
 * @throws Error if the authenticated user does not match the expected identity.
 */
export async function verifySelf(expectedIdOrWallet: string, privyToken?: string): Promise<void> {
  const payload = await verifyPrivyToken(privyToken);
  const userId = (payload.sub ?? payload.userId) as string | undefined;
  const wallet = (payload.wallet_address as string | undefined)?.toLowerCase();
  const target = expectedIdOrWallet.toLowerCase();
  if (!userId || (userId !== target && wallet !== target)) {
    throw new Error("Unauthorized: can only access your own data");
  }
}

/**
 * Verify that the caller is authenticated (no ownership check).
 * Used for endpoints where the resource is public by design
 * but we still want to require authentication.
 */
export async function requireAuth(privyToken?: string): Promise<void> {
  await verifyPrivyToken(privyToken);
}
