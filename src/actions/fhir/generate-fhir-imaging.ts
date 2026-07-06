"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { generateImagingBundle } from "@/services/fhir-rag/generate-imaging";
import type {
  AuditReport,
  GenerateResult,
  ImagingReport,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";
import { validateFhirBundle } from "@/services/fhir-rag/validate";
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

interface GenerateFhirImagingData {
  report: ImagingReport;
  audit: AuditReport;
  filledFields: Record<string, string>;
  sessionId: string;
  _privyToken?: string;
}

export const generateFhirImaging = withAuth(
  async (
    data: GenerateFhirImagingData,
    auth: AuthContext,
  ): Promise<GenerateResult | { error: string }> => {
    const { report, audit, filledFields, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase() },
      "generateFhirImaging started",
    );

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
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
        "generateFhirImaging rejected: PHI leak detected",
      );
      return { error: "PhiLeakDetected" };
    }

    try {
      const result = await generateImagingBundle(
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
      const phiCheckResult = checkForPhiLeak(result);
      if (!phiCheckResult.safe) {
        logger.warn(
          { sessionId, leakedCount: phiCheckResult.leaked.length },
          "generateFhirImaging rejected: PHI leak detected in generated bundle",
        );
        return { error: "PhiLeakDetected" };
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "generateFhirImaging failed");
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
