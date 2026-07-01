import "server-only";

import { logger } from "@/lib/logger";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { EXTRACTION_PROMPT } from "./prompts";
import type { ExtractedDoc } from "./schema";
import { extractedDocSchema } from "./schema";

export async function extractMedicalExams(
  text: string,
  sessionId: string,
): Promise<ExtractedDoc> {
  if (!text || text.trim().length === 0) {
    throw new Error("EmptyPayload");
  }

  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: text.slice(0, 20000) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const parsed = extractedDocSchema.parse(raw);

    logger.info(
      { sessionId, examCount: parsed.exams?.length ?? 0 },
      "extractMedicalExams completed",
    );

    return parsed;
  });
}
