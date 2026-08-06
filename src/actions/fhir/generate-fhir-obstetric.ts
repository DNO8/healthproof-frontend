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
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

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
  ): Promise<GenerateResult> => {
    const { report, audit, filledFields, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase() },
      "generateFhirObstetric started",
    );

    if (!isValidUuidV4(sessionId)) {
      throw new Error("InvalidSessionId");
    }

    const phiCheckReport = checkForPhiLeak(report);
    const phiCheckFields = checkForPhiLeak(filledFields);
    if (!phiCheckReport.safe || !phiCheckFields.safe) {
      logger.warn(
        {
          sessionId,
          leakedInReport: phiCheckReport.leaked.length,
          leakedInFields: phiCheckFields.leaked.length,
        },
        "generateFhirObstetric rejected: PHI leak detected",
      );
      throw new Error("PhiLeakDetected");
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
        throw new Error("FhirValidationFailed");
      }
      const phiCheckResult = checkForPhiLeak(result);
      if (!phiCheckResult.safe) {
        logger.warn(
          { sessionId, leakedCount: phiCheckResult.leaked.length },
          "generateFhirObstetric rejected: PHI leak detected in generated bundle",
        );
        throw new Error("PhiLeakDetected");
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { sessionId, error: message },
        "generateFhirObstetric failed",
      );
      throw new Error("OpenAIProcessingFailed");
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
