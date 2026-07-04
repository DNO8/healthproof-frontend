"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { classifyDocumentText } from "@/services/fhir-rag/classify";
import type { DocumentType } from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";

interface ClassifyDocumentData {
  text: string;
  sessionId: string;
  _privyToken?: string;
}

export const classifyDocument = withAuth(
  async (data: ClassifyDocumentData, auth: AuthContext) => {
    const { text, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase(), textLength: text.length },
      "classifyDocument started",
    );

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      return { error: "EmptyPayload" };
    }

    try {
      const result = await classifyDocumentText(text, sessionId);
      return result as DocumentType;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "classifyDocument failed");
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 20 },
  },
);
