import "server-only";

import { logger } from "@/lib/logger";
import { retrieveContextForCategories } from "./embed";
import { countMustSupport } from "./must-support";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { GENERATION_PROMPT } from "./prompts";
import {
  type AuditReport,
  type ExtractedDoc,
  type GenerateResult,
  generateResultSchema,
  type LabFilledFields,
} from "./schema";

export async function generateFhirBundle(
  doc: ExtractedDoc,
  audit: AuditReport,
  labFilledFields: LabFilledFields,
  sessionId: string,
): Promise<GenerateResult> {
  const query = doc.exams.map((e) => e.rawName).join("\n");
  const chunks = await retrieveContextForCategories(
    query,
    ["loinc", "guideline"],
    8,
  );
  const context = chunks.map((c) => c.content).join("\n\n");

  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: GENERATION_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            context:
              context || "No additional knowledge base context available.",
            document: doc,
            audit,
            labFilledFields,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;

    const validated = generateResultSchema.safeParse(raw);
    if (!validated.success) {
      logger.warn(
        { sessionId, error: validated.error.message },
        "generateFhirBundle invalid schema",
      );
      throw new Error("InvalidPayload");
    }

    const bundle = validated.data.bundle;
    const { total, filled } = countMustSupport(bundle);
    const score = total === 0 ? 0 : Math.round((filled / total) * 100) / 100;

    logger.info(
      { sessionId, score, total, filled },
      "generateFhirBundle completed",
    );

    return {
      bundle,
      compliance: {
        score,
        mustSupportTotal: total,
        mustSupportFilled: filled,
        guiaVersion: "CL-Core-1.8.4_CLIPS-0.2.0",
      },
    };
  });
}
