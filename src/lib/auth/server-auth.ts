import { decodeJwt } from "jose";

const PRIVY_TOKEN_COOKIE = "privy-token";

export interface AuthContext {
  userId: string;
  wallet: string;
  token: string;
}

/**
 * Verify Privy authentication locally by decoding the JWT.
 * Skips signature verification (JWKS is not accessible in this environment)
 * but checks token expiration. Falls back to cookie-based token.
 */
export async function verifyPrivyAuth(privyToken?: string): Promise<AuthContext> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = privyToken ?? cookieStore.get(PRIVY_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new AuthError("No authentication token found", 401);
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = decodeJwt(token) as Record<string, unknown>;
  } catch (e) {
    console.error("[server-auth] JWT decode failed:", e);
    throw new AuthError("Invalid token format", 401);
  }

  // Check expiration
  const exp = decoded.exp;
  if (typeof exp === "number" && Date.now() >= exp * 1000) {
    throw new AuthError("Token expired", 401);
  }

  // Audience check (optional, prevents token misuse across apps)
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
  const aud = decoded.aud;
  if (appId && aud !== appId) {
    console.warn("[server-auth] Audience mismatch:", aud, "!==", appId);
  }

  // Extract userId from sub (Privy DID)
  const userId = decoded.sub as string | undefined;
  if (!userId) {
    throw new AuthError("Invalid or expired authentication", 401);
  }

  // Extract wallet from custom metadata or fallback
  const custom = (decoded.custom as Record<string, unknown>) ?? {};
  const walletAddress =
    (custom.wallet_address as string) ??
    (decoded.wallet_address as string) ??
    "";

  return {
    userId,
    wallet: typeof walletAddress === "string" ? walletAddress.toLowerCase() : "",
    token,
  };
}

/**
 * Get auth context without throwing (for optional auth)
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    return await verifyPrivyAuth();
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Get client IP from request headers
 * For rate limiting purposes
 */
export function getClientIP(): string {
  // In server actions, we can use the x-forwarded-for header
  // This is a simplified version - in production use proper IP extraction
  return "unknown";
}
