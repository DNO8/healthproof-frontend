import "server-only";

import OpenAI from "openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export async function withOpenAIRetry<T>(
  fn: (model: string) => Promise<T>,
  options: {
    primaryModel?: string;
    fallbackModel?: string;
    maxRetries?: number;
  } = {},
): Promise<T> {
  const {
    primaryModel = "gpt-4o-mini",
    fallbackModel = "gpt-4o",
    maxRetries = 2,
  } = options;
  let lastError: unknown;
  let usedFallback = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(usedFallback ? fallbackModel : primaryModel);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;
      const isRateLimit = message.includes("429") || status === 429;
      const isServerError = typeof status === "number" && status >= 500;
      const isFormatError =
        message.includes("response_format") || message.includes("invalid_json");

      if (!isRateLimit && !isServerError && !isFormatError) break;

      if (isFormatError && !usedFallback) {
        usedFallback = true;
        logger.info(
          { fallback: true, from: primaryModel, to: fallbackModel },
          "OpenAI fallback triggered",
        );
      } else {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(
    {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
    "OpenAI request failed",
  );
  throw new Error(
    "OpenAI request failed: " +
      (lastError instanceof Error ? lastError.message : String(lastError)),
  );
}
