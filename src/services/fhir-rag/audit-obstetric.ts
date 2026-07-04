import "server-only";

import { logger } from "@/lib/logger";
import { searchObstetricLoinc } from "./loinc-subset";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { OBSTETRIC_LOINC_CONTEXT } from "./prompts";
import type { AuditReport, AuditSuggestions, ObstetricReport } from "./schema";
import { auditReportSchema, auditSuggestionsSchema } from "./schema";

const OBSTETRIC_AUDIT_PROMPT = `Eres un auditor FHIR para Chile (CL-Core 1.8.4 + CLIPS 0.2.0) especializado en ecografías obstétricas. Recibirás un informe de ecografía obstétrica extraído y contexto de códigos LOINC.

Devuelve exclusivamente un JSON:
{
  "mappings": [{ "rawName": string, "loincCode": string|null, "display": string|null, "confirmed": boolean }],
  "missing": [{ "examIndex": number, "field": string, "reason": string }],
  "warnings": [string]
}

Reglas:
- Solo sugiere códigos LOINC que aparezcan en el contexto proporcionado. Nunca inventes códigos.
- "confirmed": true si el código LOINC está claramente asociado a la medida (BPD, HC, AC, FL, PFE, ILA, edad gestacional); false si es ambiguo.
- "missing" lista campos Must Support faltantes para cada medida: valor, unidad, edad gestacional asociada.
- No inventes datos clínicos.

${OBSTETRIC_LOINC_CONTEXT}
`;

export async function auditObstetricDoc(
  report: ObstetricReport,
  sessionId: string,
): Promise<{ audit: AuditReport; suggestions: AuditSuggestions }> {
  return withOpenAIRetry(async (model) => {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: OBSTETRIC_AUDIT_PROMPT },
        { role: "user", content: JSON.stringify(report, null, 2) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as unknown;
    const audit = auditReportSchema.parse(raw);
    const suggestions = buildSuggestions(audit);

    logger.info(
      {
        sessionId,
        mappings: audit.mappings.length,
        missing: audit.missing.length,
      },
      "auditObstetricDoc completed",
    );

    return { audit, suggestions };
  });
}

function buildSuggestions(audit: AuditReport): AuditSuggestions {
  const suggestions: AuditSuggestions = {};
  for (const mapping of audit.mappings) {
    const found = searchObstetricLoinc(mapping.rawName, 4);
    if (found.length > 0) {
      suggestions[mapping.rawName] = {
        field: "loincCode",
        type: "choice",
        options: found.map((entry) => ({
          code: entry.code,
          system: "http://loinc.org",
          display: entry.spanishDisplay || entry.display,
        })),
      };
    }
  }
  return auditSuggestionsSchema.parse(suggestions);
}
