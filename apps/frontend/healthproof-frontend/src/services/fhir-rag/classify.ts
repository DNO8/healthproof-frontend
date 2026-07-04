import "server-only";

import { logger } from "@/lib/logger";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { CLASSIFICATION_PROMPT } from "./prompts";
import type { DocumentType } from "./schema";
import { documentTypeSchema } from "./schema";

export async function classifyDocumentText(
  text: string,
  sessionId: string,
): Promise<DocumentType> {
  if (!text || text.trim().length === 0) {
    throw new Error("EmptyPayload");
  }

  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: text.slice(0, 20000) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 512,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const parsed = documentTypeSchema.parse(raw);

    logger.info(
      { sessionId, type: parsed.type, confidence: parsed.confidence },
      "classifyDocumentText completed",
    );

    return parsed;
  });
}
