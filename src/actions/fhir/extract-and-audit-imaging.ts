"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { auditImagingDoc } from "@/services/fhir-rag/audit-imaging";
import { extractImagingUltrasound } from "@/services/fhir-rag/extract-imaging";
import type {
  AuditReport,
  AuditSuggestions,
  ImagingReport,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

interface ExtractAndAuditImagingData {
  text: string;
  sessionId: string;
  _privyToken?: string;
}

interface ExtractAndAuditImagingResult {
  report: ImagingReport;
  audit: AuditReport;
  suggestions: AuditSuggestions;
}

export const extractAndAuditImaging = withAuth(
  async (
    data: ExtractAndAuditImagingData,
    auth: AuthContext,
  ): Promise<ExtractAndAuditImagingResult | { error: string }> => {
    const { text, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase(), textLength: text.length },
      "extractAndAuditImaging started",
    );

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      return { error: "EmptyPayload" };
    }

    const phiCheck = checkForPhiLeak(text);
    if (!phiCheck.safe) {
      logger.warn(
        { sessionId, leakedCount: phiCheck.leaked.length },
        "extractAndAuditImaging rejected: PHI leak detected",
      );
      return { error: "PhiLeakDetected" };
    }

    try {
      const report = await extractImagingUltrasound(text, sessionId);
      const phiCheckReport = checkForPhiLeak(report);
      if (!phiCheckReport.safe) {
        logger.warn(
          { sessionId, leakedCount: phiCheckReport.leaked.length },
          "extractAndAuditImaging rejected: PHI leak detected in AI output",
        );
        return { error: "PhiLeakDetected" };
      }
      const { audit, suggestions } = await auditImagingDoc(report, sessionId);
      return { report, audit, suggestions };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { sessionId, error: message },
        "extractAndAuditImaging failed",
      );
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
