import { cookies } from "next/headers";

const PRIVY_TOKEN_COOKIE = "privy-token";
const PRIVY_ID_COOKIE = "privy-id-token";

export interface AuthContext {
  userId: string;
  wallet: string;
  token: string;
}

/**
 * Verify Privy authentication from cookies
 * Returns authenticated user context or throws error
 */
export async function verifyPrivyAuth(privyToken?: string): Promise<AuthContext> {
  const cookieStore = await cookies();
  const token = privyToken ?? cookieStore.get(PRIVY_TOKEN_COOKIE)?.value;
  const idToken = cookieStore.get(PRIVY_ID_COOKIE)?.value;

  if (!token) {
    throw new AuthError("No authentication token found", 401);
  }

  // Verify token with Privy API
  const response = await fetch("https://auth.privy.io/api/v1/sessions/verify", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new AuthError("Invalid or expired authentication", 401);
  }

  const session = await response.json();
  
  if (!session.user || !session.user.wallet_address) {
    throw new AuthError("No wallet connected", 401);
  }

  return {
    userId: session.user.id,
    wallet: session.user.wallet_address.toLowerCase(),
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
