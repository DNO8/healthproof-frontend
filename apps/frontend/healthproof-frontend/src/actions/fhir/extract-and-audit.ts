"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditExtractedDoc } from "@/services/fhir-rag/audit";
import { extractMedicalExams } from "@/services/fhir-rag/extract";
import type {
  AuditReport,
  ExtractedDoc,
  LabFilledFields,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";

interface ExtractAndAuditData {
  text: string;
  sessionId: string;
  labFilledFields?: LabFilledFields;
  _privyToken?: string;
}

async function verifyConsent(
  sessionId: string,
  actorWallet: string,
): Promise<{ ok: true } | { error: string }> {
  if (!isValidUuidV4(sessionId)) {
    return { error: "InvalidSessionId" };
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consent_log")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("actor_wallet", actorWallet.toLowerCase())
    .single();

  if (error || !data) {
    logger.warn(
      { sessionId, actorWallet: actorWallet.toLowerCase(), dbError: error?.message },
      "verifyConsent failed: ConsentRequired",
    );
    return { error: "ConsentRequired" };
  }
  return { ok: true };
}

export const extractAndAudit = withAuth(
  async (data: ExtractAndAuditData, auth: AuthContext) => {
    const { text, sessionId, labFilledFields = {} } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase(), textLength: text.length },
      "extractAndAudit started",
    );

    const consent = await verifyConsent(sessionId, auth.wallet);
    if ("error" in consent) {
      return { error: consent.error };
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      return { error: "EmptyPayload" };
    }

    try {
      const doc = await extractMedicalExams(text, sessionId);
      const audit = await auditExtractedDoc(doc, labFilledFields, sessionId);

      return { doc, audit } as { doc: ExtractedDoc; audit: AuditReport };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "extractAndAudit failed");
      return { error: "OpenAIProcessingFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 5 },
  },
);
