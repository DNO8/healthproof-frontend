import "server-only";

import { logger } from "@/lib/logger";
import { buildImagingSuggestions } from "@/services/loinc/build-imaging-suggestions";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { ABDOMINAL_ULTRASOUND_LOINC_CONTEXT } from "./prompts";
import type {
  AuditReport,
  AuditSuggestions,
  ImagingReport,
  SuggestionField,
} from "./schema";
import { auditReportSchema, auditSuggestionsSchema } from "./schema";

const ABDOMINAL_ULTRASOUND_AUDIT_PROMPT = `Eres un auditor FHIR para Chile (CL-Core 1.8.4 + CLIPS 0.2.0) especializado en ecografías abdominales. Recibirás un informe de ecografía abdominal extraído y contexto de códigos LOINC.

Devuelve exclusivamente un JSON:
{
  "mappings": [{ "rawName": string, "loincCode": string|null, "display": string|null, "confirmed": boolean }],
  "missing": [{ "examIndex": number, "field": string, "reason": string }],
  "warnings": [string]
}

Reglas:
- Solo sugiere códigos LOINC que aparezcan en el contexto proporcionado. Nunca inventes códigos.
- "confirmed": true si el código LOINC está claramente asociado a la medida y a la región anatómica; false si es ambiguo.
- "missing" lista campos Must Support faltantes para cada medida: valor, unidad, región, lateralidad, LOINC, bodySite.
- No inventes datos clínicos.

${ABDOMINAL_ULTRASOUND_LOINC_CONTEXT}
`;

export async function auditImagingDoc(
  report: ImagingReport,
  sessionId: string,
): Promise<{ audit: AuditReport; suggestions: AuditSuggestions }> {
  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ABDOMINAL_ULTRASOUND_AUDIT_PROMPT },
        { role: "user", content: JSON.stringify(report, null, 2) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const audit = auditReportSchema.parse(raw);
    const suggestions = await buildSuggestions(report, audit);

    logger.info(
      {
        sessionId,
        mappings: audit.mappings.length,
        missing: audit.missing.length,
      },
      "auditImagingDoc completed",
    );

    return { audit, suggestions };
  });
}

async function buildSuggestions(
  report: ImagingReport,
  audit: AuditReport,
): Promise<AuditSuggestions> {
  const suggestions: AuditSuggestions = {};
  for (let i = 0; i < report.measurements.length; i++) {
    const measurement = report.measurements[i];
    const mapping = audit.mappings[i];
    const { options, apiFailed } = await buildImagingSuggestions(
      measurement.name,
      mapping?.loincCode,
    );

    if (options.length > 0) {
      const field: SuggestionField = {
        field: "loincCode",
        type: "choice",
        options,
      };
      suggestions[measurement.name] = field;
    }

    if (apiFailed) {
      suggestions[`${i}.apiFailed`] = {
        field: "apiFailed",
        type: "text",
      };
    }
  }
  return auditSuggestionsSchema.parse(suggestions);
}
