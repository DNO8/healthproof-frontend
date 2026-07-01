"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import {
  DOC_CLASSIFICATION,
  DOC_TYPE,
  FHIR_STANDARD,
  NO_CLASSIFICATION,
  NO_STANDARD,
  ZERO_BYTES32,
} from "@/lib/medical-constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuidV4 } from "@/services/fhir-rag/schema";

interface DocumentPayload {
  documentId: string;
  iv: string;
  encryptedKeys: Record<string, unknown>;
  uploaderPublicKey: string;
  fileName: string;
}

interface PublishFhirDocumentData {
  pdf: DocumentPayload;
  fhir: DocumentPayload;
  relatedCid: string;
  documentType: string;
  standard: string;
  classification: string;
  fhirCompliance: {
    score: number;
    mustSupportTotal: number;
    mustSupportFilled: number;
    guiaVersion: string;
  };
  patientWallet: string;
  episodeId: string;
  sessionId: string;
  _privyToken?: string;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-zA-Z0-9]{55})$/;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const IV_RE = /^[A-Za-z0-9_-]+$/;

function isValidEvmAddress(value: string): boolean {
  return typeof value === "string" && EVM_ADDRESS_RE.test(value);
}

function isValidCid(value: string): boolean {
  return typeof value === "string" && CID_RE.test(value);
}

function isValidBytes32(value: string): boolean {
  return typeof value === "string" && BYTES32_RE.test(value);
}

function isValidJwkEcdhP256(jwk: unknown): boolean {
  if (typeof jwk !== "object" || jwk === null) return false;
  const k = jwk as Record<string, unknown>;
  return (
    k.kty === "EC" &&
    k.crv === "P-256" &&
    typeof k.x === "string" &&
    k.x.length > 0 &&
    typeof k.y === "string" &&
    k.y.length > 0
  );
}

function validateDocumentPayload(
  payload: DocumentPayload,
  label: string,
): { error: string } | null {
  if (!isValidCid(payload.documentId)) {
    return { error: `InvalidCid_${label}` };
  }
  if (!payload.iv || !IV_RE.test(payload.iv)) {
    return { error: `InvalidIv_${label}` };
  }
  if (
    !payload.encryptedKeys ||
    Object.keys(payload.encryptedKeys).length === 0
  ) {
    return { error: `EmptyEncryptedKeys_${label}` };
  }
  for (const [wallet, key] of Object.entries(payload.encryptedKeys)) {
    if (!isValidEvmAddress(wallet)) {
      return { error: `InvalidRecipient_${label}` };
    }
    if (!key || typeof key !== "object") {
      return { error: `InvalidKeyFormat_${label}` };
    }
  }
  if (
    !payload.uploaderPublicKey ||
    !isValidJwkEcdhP256(JSON.parse(payload.uploaderPublicKey))
  ) {
    return { error: `InvalidUploaderPublicKey_${label}` };
  }
  if (!payload.fileName || payload.fileName.trim().length === 0) {
    return { error: `EmptyFileName_${label}` };
  }
  return null;
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

export const publishFhirDocument = withAuth(
  async (data: PublishFhirDocumentData, auth: AuthContext) => {
    const uploaderWallet = auth.wallet.toLowerCase();
    const patientWallet = data.patientWallet.toLowerCase();

    const consent = await verifyConsent(data.sessionId, auth.wallet);
    if ("error" in consent) {
      return { error: consent.error };
    }

    if (!isValidEvmAddress(patientWallet)) {
      return { error: "InvalidPatientWallet" };
    }
    if (
      !isValidCid(data.relatedCid) ||
      data.relatedCid !== data.pdf.documentId
    ) {
      return { error: "InvalidRelatedCid" };
    }
    if (data.fhir.documentId === data.pdf.documentId) {
      return { error: "DuplicateDocumentIds" };
    }
    if (data.pdf.uploaderPublicKey !== data.fhir.uploaderPublicKey) {
      return { error: "InconsistentUploadKeys" };
    }
    if (!isValidBytes32(data.episodeId) && data.episodeId !== ZERO_BYTES32) {
      return { error: "InvalidEpisodeId" };
    }

    const pdfValidation = validateDocumentPayload(data.pdf, "pdf");
    if (pdfValidation) return pdfValidation;
    const fhirValidation = validateDocumentPayload(data.fhir, "fhir");
    if (fhirValidation) return fhirValidation;

    const allowedDocTypes = Object.values(DOC_TYPE);
    if (
      !allowedDocTypes.includes(
        data.documentType as typeof DOC_TYPE.MEDICAL_RESULT,
      )
    ) {
      return { error: "InvalidDocumentType" };
    }
    const allowedStandards = [NO_STANDARD, FHIR_STANDARD.R4];
    if (!allowedStandards.includes(data.standard)) {
      return { error: "InvalidStandard" };
    }
    const allowedClassifications = [
      NO_CLASSIFICATION,
      DOC_CLASSIFICATION.LAB,
      DOC_CLASSIFICATION.DIAGNOSTIC,
    ];
    if (!allowedClassifications.includes(data.classification)) {
      return { error: "InvalidClassification" };
    }

    const { fhirCompliance } = data;
    if (
      typeof fhirCompliance.score !== "number" ||
      fhirCompliance.score < 0 ||
      fhirCompliance.score > 1 ||
      !Number.isInteger(fhirCompliance.mustSupportTotal) ||
      fhirCompliance.mustSupportTotal < 0 ||
      !Number.isInteger(fhirCompliance.mustSupportFilled) ||
      fhirCompliance.mustSupportFilled < 0 ||
      fhirCompliance.mustSupportFilled > fhirCompliance.mustSupportTotal ||
      fhirCompliance.guiaVersion !== "CL-Core-1.8.4_CLIPS-0.2.0"
    ) {
      return { error: "InvalidComplianceValues" };
    }

    const supabase = createAdminClient();
    const { error: rpcError } = await supabase.rpc("publish_fhir_document", {
      pdf_document_id: data.pdf.documentId,
      pdf_uploader_wallet: uploaderWallet,
      pdf_patient_wallet: patientWallet,
      pdf_iv: data.pdf.iv,
      pdf_encrypted_keys: data.pdf.encryptedKeys,
      pdf_uploader_public_key: data.pdf.uploaderPublicKey,
      pdf_file_name: data.pdf.fileName,
      pdf_episode_id: data.episodeId,
      fhir_document_id: data.fhir.documentId,
      fhir_uploader_wallet: uploaderWallet,
      fhir_patient_wallet: patientWallet,
      fhir_iv: data.fhir.iv,
      fhir_encrypted_keys: data.fhir.encryptedKeys,
      fhir_uploader_public_key: data.fhir.uploaderPublicKey,
      fhir_file_name: data.fhir.fileName,
      fhir_episode_id: data.episodeId,
      related_cid: data.relatedCid,
      document_type: data.documentType,
      standard: data.standard,
      classification: data.classification,
      fhir_compliance: {
        score: fhirCompliance.score,
        must_support_total: fhirCompliance.mustSupportTotal,
        must_support_filled: fhirCompliance.mustSupportFilled,
        guia_version: fhirCompliance.guiaVersion,
      },
      consent_session_id: data.sessionId,
    });

    if (rpcError) {
      logger.error(
        { sessionId: data.sessionId, error: rpcError.message },
        "publishFhirDocument RPC failed",
      );
      return { error: "PublishFailed" };
    }

    logger.info(
      {
        sessionId: data.sessionId,
        actor: uploaderWallet,
        documentType: data.documentType,
      },
      "publishFhirDocument completed",
    );
    return { success: true };
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 5 },
  },
);
