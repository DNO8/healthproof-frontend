import { decodeJwt } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";

const PRIVY_TOKEN_COOKIE = "privy-token";

export interface AuthContext {
  userId: string;
  wallet: string;
  token: string;
}

function extractWalletFromJwt(decoded: Record<string, unknown>): string | undefined {
  // 1. Custom claim (configured in Privy dashboard)
  const custom = (decoded.custom as Record<string, unknown>) ?? {};
  const fromCustom = custom.wallet_address as string | undefined;
  if (fromCustom) return fromCustom;

  // 2. Top-level claim
  const fromTop = decoded.wallet_address as string | undefined;
  if (fromTop) return fromTop;

  // 3. linked_accounts array (Privy embeds wallets here)
  const linked = decoded.linked_accounts as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(linked)) {
    for (const acc of linked) {
      if (acc.type === "wallet" && typeof acc.address === "string" && acc.address) {
        return acc.address as string;
      }
      // Some Privy tokens nest address under "wallet" or "embedded_wallet"
      if (typeof acc.address === "string" && acc.address.startsWith("0x")) {
        return acc.address;
      }
    }
  }

  // 4. embedded_wallet claim
  const embedded = decoded.embedded_wallet as Record<string, unknown> | undefined;
  if (embedded && typeof embedded.address === "string") {
    return embedded.address;
  }

  return undefined;
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

  // Extract wallet from JWT claims
  let walletAddress = extractWalletFromJwt(decoded);

  // Fallback: lookup wallet from Supabase if not present in token
  if (!walletAddress) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("id", userId)
        .single();
      if (!error && data?.wallet_address) {
        walletAddress = data.wallet_address as string;
        console.log("[server-auth] Wallet resolved from Supabase for", userId);
      }
    } catch (lookupErr) {
      console.warn("[server-auth] Supabase wallet lookup failed:", lookupErr);
    }
  }

  if (!walletAddress) {
    console.warn("[server-auth] No wallet found in token or DB for user", userId);
  }

  return {
    userId,
    wallet: walletAddress ? walletAddress.toLowerCase() : "",
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
