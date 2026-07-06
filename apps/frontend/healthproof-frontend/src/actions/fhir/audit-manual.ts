"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditExtractedDoc } from "@/services/fhir-rag/audit";
import {
  type AuditReport,
  type ExtractedDoc,
  extractedDocSchema,
  isValidUuidV4,
} from "@/services/fhir-rag/schema";
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

interface AuditManualData {
  doc: ExtractedDoc;
  sessionId: string;
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
    return { error: "ConsentRequired" };
  }
  return { ok: true };
}

export const auditManual = withAuth(
  async (data: AuditManualData, auth: AuthContext) => {
    const { doc, sessionId } = data;

    const consent = await verifyConsent(sessionId, auth.wallet);
    if ("error" in consent) {
      return { error: consent.error };
    }

    const parsed = extractedDocSchema.safeParse(doc);
    if (!parsed.success) {
      logger.warn(
        {
          sessionId,
          actor: auth.wallet.toLowerCase(),
          error: parsed.error.message,
        },
        "auditManual invalid doc schema",
      );
      return { error: "InvalidPayload" };
    }

    const phiCheck = checkForPhiLeak(parsed.data);
    if (!phiCheck.safe) {
      logger.warn(
        { sessionId, leakedCount: phiCheck.leaked.length },
        "auditManual rejected: PHI leak detected",
      );
      return { error: "PhiLeakDetected" };
    }

    try {
      const audit: AuditReport = await auditExtractedDoc(
        parsed.data,
        {},
        sessionId,
      );
      logger.info(
        { sessionId, actor: auth.wallet.toLowerCase() },
        "auditManual completed",
      );
      return { success: true, data: { doc: parsed.data, audit } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "auditManual failed");
      return { error: "AuditFailed" };
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 20 },
  },
);
