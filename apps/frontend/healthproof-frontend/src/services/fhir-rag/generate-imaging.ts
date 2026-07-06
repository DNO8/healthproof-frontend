import "server-only";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { toUcum } from "@/lib/ucum-units";
import { countMustSupport } from "./must-support";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { ABDOMINAL_ULTRASOUND_GENERATION_PROMPT } from "./prompts";
import type { AuditReport, GenerateResult, ImagingReport } from "./schema";
import { FHIR_GUIDE_VERSION, fhirBundleSchema } from "./schema";

export type ImagingFilledFields = Record<string, string>;

export async function generateImagingBundle(
  report: ImagingReport,
  audit: AuditReport,
  filledFields: ImagingFilledFields,
  sessionId: string,
): Promise<GenerateResult> {
  const normalizedFields = normalizeImagingUnits(filledFields);
  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ABDOMINAL_ULTRASOUND_GENERATION_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              report,
              audit,
              filledFields: normalizedFields,
            },
            null,
            2,
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8192,
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
      "generateImagingBundle completed",
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

function normalizeImagingUnits(
  fields: ImagingFilledFields,
): ImagingFilledFields {
  const normalized: ImagingFilledFields = {};
  for (const [key, value] of Object.entries(fields)) {
    normalized[key] = key.endsWith(".unit") ? (toUcum(value) ?? value) : value;
  }
  return normalized;
}
