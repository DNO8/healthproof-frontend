"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";

interface LogConsentData {
  sessionId: string;
  _privyToken?: string;
}

export const logConsent = withAuth(
  async (data: LogConsentData, auth: AuthContext) => {
    const { sessionId } = data;

    if (!isValidUuidV4(sessionId)) {
      return { error: "InvalidSessionId" };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("consent_log").insert({
      actor_wallet: auth.wallet.toLowerCase(),
      action: "openai_fhir_processing",
      session_id: sessionId,
      document_cid: null,
    });

    if (error) {
      // Unique violation on session_id is treated as idempotent success
      if (error.code === "23505") {
        logger.info(
          { sessionId, actor: auth.wallet.toLowerCase() },
          "logConsent duplicate session_id ignored",
        );
        return { success: true };
      }
      logger.error({ error: error.message, sessionId }, "logConsent failed");
      return { error: "ConsentLogFailed" };
    }

    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase() },
      "logConsent recorded",
    );
    return { success: true };
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  },
);
