import "server-only";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { countMustSupport } from "./must-support";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { OBSTETRIC_GENERATION_PROMPT } from "./prompts";
import type { AuditReport, GenerateResult, ObstetricReport } from "./schema";
import { FHIR_GUIDE_VERSION, fhirBundleSchema } from "./schema";

export type ObstetricFilledFields = Record<string, string>;

export async function generateObstetricBundle(
  report: ObstetricReport,
  audit: AuditReport,
  filledFields: ObstetricFilledFields,
  sessionId: string,
): Promise<GenerateResult> {
  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: OBSTETRIC_GENERATION_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              report,
              audit,
              filledFields,
            },
            null,
            2,
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const parsed = z
      .object({
        bundle: fhirBundleSchema,
      })
      .parse(raw);

    const bundle = parsed.bundle;
    const mustSupportCount = countMustSupport(bundle);

    logger.info(
      {
        sessionId,
        entries: bundle.entry.length,
        score: mustSupportCount.filled / Math.max(1, mustSupportCount.total),
      },
      "generateObstetricBundle completed",
    );

    return {
      bundle,
      compliance: {
        score: mustSupportCount.filled / Math.max(1, mustSupportCount.total),
        mustSupportTotal: mustSupportCount.total,
        mustSupportFilled: mustSupportCount.filled,
        guiaVersion: FHIR_GUIDE_VERSION,
      },
    };
  });
}
