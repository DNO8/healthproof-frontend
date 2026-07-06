"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { auditImagingDoc } from "@/services/fhir-rag/audit-imaging";
import type {
  AuditReport,
  AuditSuggestions,
  ImagingReport,
} from "@/services/fhir-rag/schema";
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

interface AuditImagingManualData {
  report: ImagingReport;
  sessionId: string;
  _privyToken?: string;
}

interface AuditImagingManualResult {
  report: ImagingReport;
  audit: AuditReport;
  suggestions: AuditSuggestions;
}

export const auditImagingManual = withAuth(
  async (
    data: AuditImagingManualData,
    auth: AuthContext,
  ): Promise<AuditImagingManualResult | { error: string }> => {
    const { report, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase() },
      "auditImagingManual started",
    );

    if (typeof report !== "object" || report === null) {
      return { error: "EmptyPayload" };
    }

    const phiCheck = checkForPhiLeak(report);
    if (!phiCheck.safe) {
      logger.warn(
        { sessionId, leakedCount: phiCheck.leaked.length },
        "auditImagingManual rejected: PHI leak detected",
      );
      return { error: "PhiLeakDetected" };
    }

    try {
      const { audit, suggestions } = await auditImagingDoc(report, sessionId);
      return { report, audit, suggestions };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "auditImagingManual failed");
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
