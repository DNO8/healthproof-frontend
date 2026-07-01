import "server-only";

import { logger } from "@/lib/logger";
import { retrieveContextForCategories } from "./embed";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { AUDIT_PROMPT } from "./prompts";
import {
  type AuditReport,
  auditReportSchema,
  type ExtractedDoc,
  type LabFilledFields,
} from "./schema";

export async function auditExtractedDoc(
  doc: ExtractedDoc,
  labFilledFields: LabFilledFields,
  sessionId: string,
): Promise<AuditReport> {
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
        { role: "system", content: AUDIT_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            context:
              context || "No additional knowledge base context available.",
            document: doc,
            labFilledFields,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const parsed = auditReportSchema.parse(raw);

    const normalized: AuditReport = {
      mappings: parsed.mappings,
      missing: parsed.missing,
      warnings: parsed.warnings,
      mustSupportTotal: parsed.mustSupportTotal,
      mustSupportFilled: parsed.mustSupportFilled,
    };

    logger.info(
      {
        sessionId,
        mappingCount: normalized.mappings.length,
        missingCount: normalized.missing.length,
        contextChunks: chunks.length,
      },
      "auditExtractedDoc completed",
    );

    return normalized;
  });
}
