"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { auditObstetricDoc } from "@/services/fhir-rag/audit-obstetric";
import { extractObstetricUltrasound } from "@/services/fhir-rag/extract-obstetric";
import type {
  AuditReport,
  AuditSuggestions,
  ObstetricReport,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";

interface ExtractAndAuditObstetricData {
  text: string;
  sessionId: string;
  _privyToken?: string;
}

interface ExtractAndAuditObstetricResult {
  report: ObstetricReport;
  audit: AuditReport;
  suggestions: AuditSuggestions;
}

export const extractAndAuditObstetric = withAuth(
  async (
    data: ExtractAndAuditObstetricData,
    auth: AuthContext,
  ): Promise<ExtractAndAuditObstetricResult | { error: string }> => {
    const { text, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase(), textLength: text.length },
      "extractAndAuditObstetric started",
    );

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      return { error: "EmptyPayload" };
    }

    try {
      const report = await extractObstetricUltrasound(text, sessionId);
      const { audit, suggestions } = await auditObstetricDoc(report, sessionId);
      return { report, audit, suggestions };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { sessionId, error: message },
        "extractAndAuditObstetric failed",
      );
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
