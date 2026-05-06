"use server";

import { verifyPrivyAuth, getClientIP, AuthContext, AuthError } from "./server-auth";
import { checkRateLimit, RateLimitOptions, RateLimitError } from "./rate-limit";
import { PermissionError } from "./permissions";
import { getDeployerPrivateKey, getShamirKey, clearKeyCache, SecureKeyError } from "./secure-key";

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
export function isAuthSuccess<T>(result: AuthResponse<T>): result is AuthResult<T> {
  return result.success === true;
}

export function isAuthError<T>(result: AuthResponse<T>): result is AuthErrorResult {
  return result.success === false;
}

/**
 * Higher-order function to wrap server actions with auth, rate limiting, and permission checks
 */
export function withAuth<T, R>(
  handler: (data: T, auth: AuthContext) => Promise<R>,
  options: WithAuthOptions<T> = {}
): (data: T) => Promise<AuthResponse<R>> {
  const { 
    rateLimit, 
    requireOnChainPermission, 
    requireAuth = true 
  } = options;

  return async (data: T): Promise<AuthResponse<R>> => {
    try {
      // Rate limiting (applies even if auth is optional)
      if (rateLimit) {
        const actionName = handler.name || "unknown";
        await checkRateLimit(actionName, rateLimit);
      }

      // Authentication
      let auth: AuthContext | null = null;
      if (requireAuth) {
        auth = await verifyPrivyAuth();
      } else {
        auth = await verifyPrivyAuth().catch(() => null);
      }

      if (requireAuth && !auth) {
        return { success: false, error: "Authentication required", code: 401 };
      }

      // On-chain permission validation
      if (requireOnChainPermission && auth) {
        const hasPermission = await requireOnChainPermission(data, auth);
        if (!hasPermission) {
          console.warn(`[withAuth] Permission denied for ${auth.wallet}`, {
            action: handler.name,
            data,
          });
          return { success: false, error: "Permission denied", code: 403 };
        }
      }

      // Execute handler
      const result = await handler(data, auth!);
      
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
  actionName: string,
  rateLimit?: RateLimitOptions
): (data: T) => Promise<AuthResponse<R>> {
  return withAuth(handler, {
    requireAuth: true,
    rateLimit: rateLimit ?? { windowMs: 60000, maxRequests: 10 },
  });
}

/**
 * Audit log helper
 */
export function auditLog(
  action: string,
  auth: AuthContext,
  success: boolean,
  metadata?: Record<string, unknown>,
  error?: string
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
