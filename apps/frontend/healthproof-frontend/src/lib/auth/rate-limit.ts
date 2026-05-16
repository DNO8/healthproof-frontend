import { getClientIP } from "./server-auth";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store
// Key: "ip:actionName"
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limit: 10 requests per 60 seconds
const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_MAX_REQUESTS = 10;

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * Check rate limit for current IP and action
 * Throws error if limit exceeded
 */
export async function checkRateLimit(
  actionName: string,
  options: RateLimitOptions = {}
): Promise<void> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  
  const ip = getClientIP();
  const key = `${ip}:${actionName}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter}s`,
      retryAfter
    );
  }

  // Increment count
  entry.count++;
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Clean up expired entries periodically
 * Run this every 5 minutes in a cron job or background task
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
