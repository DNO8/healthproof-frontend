"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { generateObstetricBundle } from "@/services/fhir-rag/generate-obstetric";
import type {
  AuditReport,
  GenerateResult,
  ObstetricReport,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";
import { validateFhirBundle } from "@/services/fhir-rag/validate";

interface GenerateFhirObstetricData {
  report: ObstetricReport;
  audit: AuditReport;
  filledFields: Record<string, string>;
  sessionId: string;
  _privyToken?: string;
}

export const generateFhirObstetric = withAuth(
  async (
    data: GenerateFhirObstetricData,
    auth: AuthContext,
  ): Promise<GenerateResult | { error: string }> => {
    const { report, audit, filledFields, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase() },
      "generateFhirObstetric started",
    );

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
    }

    try {
      const result = await generateObstetricBundle(
        report,
        audit,
        filledFields,
        sessionId,
      );
      const validation = validateFhirBundle(result.bundle);
      if (!validation.valid) {
        logger.error(
          { sessionId, errors: validation.errors },
          "validateFhirBundle failed",
        );
        return { error: "FhirValidationFailed" };
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { sessionId, error: message },
        "generateFhirObstetric failed",
      );
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
