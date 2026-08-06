import { PermissionError } from "./permissions";
import {
  checkRateLimit,
  RateLimitError,
  type RateLimitOptions,
} from "./rate-limit";
import {
  clearKeyCache,
  getDeployerPrivateKey,
  getShamirKey,
  SecureKeyError,
} from "./secure-key";
import { type AuthContext, AuthError, verifyPrivyAuth } from "./server-auth";

export { getDeployerPrivateKey, getShamirKey, clearKeyCache };
export type { AuthContext } from "./server-auth";

export interface WithAuthOptions<T = unknown> {
  rateLimit?: RateLimitOptions;
  requireOnChainPermission?: (data: T, auth: AuthContext) => Promise<boolean>;
  requireAuth?: boolean; // defaults to true
}

export interface AuthResult<T> {
  success: true;
  data: T;
}

export interface AuthErrorResult {
  success: false;
  error: string;
  code: number;
}

export type AuthResponse<T> = AuthResult<T> | AuthErrorResult;

// Type guard helpers
export function isAuthSuccess<T>(
  result: AuthResponse<T>,
): result is AuthResult<T> {
  return result.success === true;
}

export function isAuthError<T>(
  result: AuthResponse<T>,
): result is AuthErrorResult {
  return result.success === false;
}

/**
 * Higher-order function to wrap server actions with auth, rate limiting, and permission checks
 */
type WithPrivyToken<T> = T & { _privyToken?: string };

export function withAuth<T, R>(
  handler: (data: T, auth: AuthContext) => Promise<R>,
  options: WithAuthOptions<T> = {},
): (data: WithPrivyToken<T>) => Promise<AuthResponse<R>> {
  const { rateLimit, requireOnChainPermission, requireAuth = true } = options;

  return async (data: WithPrivyToken<T>): Promise<AuthResponse<R>> => {
    try {
      // Extract optional explicit token (needed for local dev without Secure cookies)
      const { _privyToken, ...cleanData } = data as unknown as Record<
        string,
        unknown
      >;

      // Authentication
      let auth: AuthContext | null = null;
      try {
        auth = await verifyPrivyAuth(_privyToken as string | undefined);
      } catch (err) {
        // In development, a 401 "no token" error means Privy Secure cookies are
        // blocked on HTTP localhost. Allow fallback below instead of hard failing.
        if (
          process.env.NODE_ENV === "development" &&
          err instanceof AuthError &&
          err.statusCode === 401
        ) {
          auth = null;
        } else if (!requireAuth) {
          auth = null;
        } else {
          throw err;
        }
      }

      // Development fallback: when Privy Secure cookies are blocked on HTTP localhost,
      // allow auth context from the wallet present in the payload.
      if (requireAuth && !auth && process.env.NODE_ENV === "development") {
        const walletFromPayload =
          (cleanData as unknown as Record<string, unknown>)?.wallet ??
          (cleanData as unknown as Record<string, unknown>)?.wallet_address;
        if (
          typeof walletFromPayload === "string" &&
          walletFromPayload.startsWith("0x")
        ) {
          console.warn(
            "[withAuth] DEV BYPASS ACTIVE: using wallet from payload instead of Privy token. " +
              "This is insecure and should only be used on localhost.",
          );
          auth = {
            userId: "dev-user",
            wallet: walletFromPayload.toLowerCase(),
            token: "dev-token",
          };
        }
      }

      if (requireAuth && !auth) {
        return { success: false, error: "Authentication required", code: 401 };
      }

      // Rate limiting with per-user bucket (wallet) when authenticated, IP fallback otherwise
      if (rateLimit) {
        const actionName = handler.name || "unknown";
        await checkRateLimit(actionName, rateLimit, auth?.wallet ?? undefined);
      }

      // On-chain permission validation
      if (requireOnChainPermission && auth) {
        const hasPermission = await requireOnChainPermission(
          cleanData as T,
          auth,
        );
        if (!hasPermission) {
          console.warn(`[withAuth] Permission denied for ${auth.wallet}`, {
            action: handler.name,
            data: cleanData,
          });
          return { success: false, error: "Permission denied", code: 403 };
        }
      }

      // Execute handler
      // biome-ignore lint/style/noNonNullAssertion: auth is validated above when required
      const result = await handler(cleanData as T, auth!);

      return { success: true, data: result };
    } catch (error) {
      // Handle specific error types
      if (error instanceof AuthError) {
        return { success: false, error: error.message, code: error.statusCode };
      }

      if (error instanceof RateLimitError) {
        return { success: false, error: error.message, code: 429 };
      }

      if (error instanceof PermissionError) {
        return { success: false, error: error.message, code: 403 };
      }

      if (error instanceof SecureKeyError) {
        console.error("[withAuth] Secure key error:", error.message);
        return { success: false, error: "Internal error", code: 500 };
      }

      // Unknown error
      console.error("[withAuth] Unexpected error:", error);
      return { success: false, error: "Internal server error", code: 500 };
    }
  };
}

/**
 * Simplified wrapper for actions that only need auth + rate limiting
 */
export function withBasicAuth<T, R>(
  handler: (data: T, auth: AuthContext) => Promise<R>,
  _actionName: string,
  rateLimit?: RateLimitOptions,
): (data: WithPrivyToken<T>) => Promise<AuthResponse<R>> {
  return withAuth(handler, {
    requireAuth: true,
    rateLimit: rateLimit ?? { windowMs: 60000, maxRequests: 10 },
  });
}

function getClientIP(): string {
  return "unknown";
}

/**
 * Audit log helper
 */
export function auditLog(
  action: string,
  auth: AuthContext,
  success: boolean,
  metadata?: Record<string, unknown>,
  error?: string,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    user: auth.wallet,
    userId: auth.userId,
    success,
    ip: getClientIP(),
    metadata,
    error,
  };

  if (success) {
    console.log("[AUDIT]", JSON.stringify(logEntry));
  } else {
    console.warn("[AUDIT]", JSON.stringify(logEntry));
  }
}
