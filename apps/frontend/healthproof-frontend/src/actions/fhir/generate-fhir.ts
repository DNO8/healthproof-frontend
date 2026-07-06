"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFhirBundle } from "@/services/fhir-rag/generate";
import type {
  AuditReport,
  ExtractedDoc,
  GenerateResult,
  LabFilledFields,
} from "@/services/fhir-rag/schema";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";
import { validateFhirBundle } from "@/services/fhir-rag/validate";
import { checkForPhiLeak } from "@/services/phi/phi-privacy-guard";

interface GenerateFhirData {
  doc: ExtractedDoc;
  audit: AuditReport;
  labFilledFields: LabFilledFields;
  sessionId: string;
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
    return { error: "ConsentRequired" };
  }
  return { ok: true };
}

export const generateFhir = withAuth(
  async (
    data: GenerateFhirData,
    auth: AuthContext,
  ): Promise<GenerateResult> => {
    const { doc, audit, labFilledFields, sessionId } = data;

    const consent = await verifyConsent(sessionId, auth.wallet);
    if ("error" in consent) {
      throw new Error(consent.error);
    }

    if (
      !doc ||
      typeof doc !== "object" ||
      !audit ||
      typeof audit !== "object"
    ) {
      throw new Error("EmptyPayload");
    }

    const phiCheckDoc = checkForPhiLeak(doc);
    const phiCheckFields = checkForPhiLeak(labFilledFields);
    if (!phiCheckDoc.safe || !phiCheckFields.safe) {
      logger.warn(
        {
          sessionId,
          leakedInDoc: phiCheckDoc.leaked.length,
          leakedInFields: phiCheckFields.leaked.length,
        },
        "generateFhir rejected: PHI leak detected",
      );
      throw new Error("PhiLeakDetected");
    }

    try {
      const result = await generateFhirBundle(
        doc,
        audit,
        labFilledFields,
        sessionId,
      );
      const validation = validateFhirBundle(result.bundle);

      if (!validation.valid) {
        logger.warn(
          { sessionId, errors: validation.errors },
          "generateFhir bundle validation failed",
        );
        throw new Error("InvalidPayload");
      }

      const phiCheckResult = checkForPhiLeak(result);
      if (!phiCheckResult.safe) {
        logger.warn(
          { sessionId, leakedCount: phiCheckResult.leaked.length },
          "generateFhir rejected: PHI leak detected in generated bundle",
        );
        throw new Error("PhiLeakDetected");
      }

      return result as GenerateResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ sessionId, error: message }, "generateFhir failed");
      throw new Error("OpenAIProcessingFailed");
    }
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 20 },
  },
);
