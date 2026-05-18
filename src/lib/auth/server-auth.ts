import { cookies } from "next/headers";
import { PrivyClient } from "@privy-io/server-auth";

const PRIVY_TOKEN_COOKIE = "privy-token";
const PRIVY_ID_COOKIE = "privy-id-token";

// Privy Server SDK — requires App ID + App Secret
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  process.env.PRIVY_APP_SECRET ?? ""
);

export interface AuthContext {
  userId: string;
  wallet: string;
  token: string;
}

/**
 * Verify Privy authentication using the official Server SDK.
 * Falls back to cookie-based token if no explicit token is provided.
 */
export async function verifyPrivyAuth(privyToken?: string): Promise<AuthContext> {
  const cookieStore = await cookies();
  const token = privyToken ?? cookieStore.get(PRIVY_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new AuthError("No authentication token found", 401);
  }

  // Verify token with Privy Server SDK
  const verifiedClaims = await privyClient.verifyAuthToken(token);

  if (!verifiedClaims.userId) {
    throw new AuthError("Invalid or expired authentication", 401);
  }

  // Fetch full user to get wallet address
  const user = await privyClient.getUser(verifiedClaims.userId);
  const wallet = user.wallet?.address ?? user.linkedAccounts.find((a: unknown) => (a as Record<string, unknown>).type === "wallet");
  const walletAddress = typeof wallet === "string" ? wallet : (wallet as { address?: string })?.address ?? "";

  if (!walletAddress) {
    throw new AuthError("No wallet connected", 401);
  }

  return {
    userId: verifiedClaims.userId,
    wallet: walletAddress.toLowerCase(),
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
