-- HealthProof HL7/FHIR RAG setup
-- Run this in the Supabase SQL Editor for the project connected to the frontend.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base for LOINC + Chilean guidelines
CREATE TABLE IF NOT EXISTS public.fhir_knowledge (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL CHECK (category IN ('loinc', 'guideline', 'profile')),
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_knowledge_category ON public.fhir_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_fhir_knowledge_embedding ON public.fhir_knowledge USING ivfflat (embedding vector_cosine_ops);

-- Consent log for AI processing (no PHI)
CREATE TABLE IF NOT EXISTS public.consent_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_wallet text NOT NULL,
    action text NOT NULL,
    session_id text NOT NULL UNIQUE,
    document_cid text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_actor ON public.consent_log(actor_wallet);
CREATE INDEX IF NOT EXISTS idx_consent_log_session ON public.consent_log(session_id);

-- Document metadata for FHIR bundles (no raw PHI)
CREATE TABLE IF NOT EXISTS public.document_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id text NOT NULL UNIQUE,
    document_type text NOT NULL,
    standard text,
    classification text,
    patient_wallet text NOT NULL,
    uploader_wallet text NOT NULL,
    uploader_public_key text,
    related_cid text,
    fhir_compliance jsonb,
    session_id text,
    episode_id text,
    file_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_metadata_patient ON public.document_metadata(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_document_metadata_related ON public.document_metadata(related_cid);

-- Extend document_secrets if it already exists, otherwise create it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'document_secrets'
    ) THEN
        CREATE TABLE public.document_secrets (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id varchar(255) NOT NULL UNIQUE,
            uploader_wallet text NOT NULL,
            patient_wallet text NOT NULL,
            iv text NOT NULL,
            encrypted_keys jsonb NOT NULL,
            uploader_public_key text,
            file_name text,
            episode_id text,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Add missing columns to existing document_secrets (idempotent)
ALTER TABLE public.document_secrets
    ADD COLUMN IF NOT EXISTS uploader_public_key text,
    ADD COLUMN IF NOT EXISTS file_name text,
    ADD COLUMN IF NOT EXISTS episode_id text;

CREATE INDEX IF NOT EXISTS idx_document_secrets_patient ON public.document_secrets(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_document_secrets_uploader ON public.document_secrets(uploader_wallet);

-- RPC: semantic search over knowledge base
CREATE OR REPLACE FUNCTION public.match_fhir_knowledge(
    query_embedding vector(1536),
    match_count int DEFAULT 8,
    filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fk.id,
        fk.content,
        fk.metadata,
        1 - (fk.embedding <=> query_embedding) AS similarity
    FROM public.fhir_knowledge fk
    WHERE fk.embedding IS NOT NULL
      AND (filter = '{}'::jsonb OR fk.metadata @> filter)
    ORDER BY fk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- RPC: publish a PDF + FHIR bundle pair atomically
CREATE OR REPLACE FUNCTION public.publish_fhir_document(
    pdf_document_id text,
    pdf_uploader_wallet text,
    pdf_patient_wallet text,
    pdf_iv text,
    pdf_encrypted_keys jsonb,
    pdf_uploader_public_key text,
    pdf_file_name text,
    fhir_document_id text,
    fhir_uploader_wallet text,
    fhir_patient_wallet text,
    fhir_iv text,
    fhir_encrypted_keys jsonb,
    fhir_uploader_public_key text,
    fhir_file_name text,
    related_cid text,
    document_type text,
    standard text,
    classification text,
    fhir_compliance jsonb,
    consent_session_id text,
    patient_wallet text,
    pdf_episode_id text DEFAULT NULL,
    fhir_episode_id text DEFAULT NULL,
    episode_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert PDF secret
    INSERT INTO public.document_secrets (
        document_id, uploader_wallet, patient_wallet, iv, encrypted_keys,
        uploader_public_key, file_name, episode_id
    ) VALUES (
        pdf_document_id, pdf_uploader_wallet, pdf_patient_wallet, pdf_iv,
        pdf_encrypted_keys, pdf_uploader_public_key, pdf_file_name, pdf_episode_id
    )
    ON CONFLICT (document_id) DO UPDATE SET
        iv = EXCLUDED.iv,
        encrypted_keys = EXCLUDED.encrypted_keys,
        uploader_public_key = EXCLUDED.uploader_public_key,
        file_name = EXCLUDED.file_name,
        episode_id = EXCLUDED.episode_id;

    -- Insert FHIR bundle secret
    INSERT INTO public.document_secrets (
        document_id, uploader_wallet, patient_wallet, iv, encrypted_keys,
        uploader_public_key, file_name, episode_id
    ) VALUES (
        fhir_document_id, fhir_uploader_wallet, fhir_patient_wallet, fhir_iv,
        fhir_encrypted_keys, fhir_uploader_public_key, fhir_file_name, fhir_episode_id
    )
    ON CONFLICT (document_id) DO UPDATE SET
        iv = EXCLUDED.iv,
        encrypted_keys = EXCLUDED.encrypted_keys,
        uploader_public_key = EXCLUDED.uploader_public_key,
        file_name = EXCLUDED.file_name,
        episode_id = EXCLUDED.episode_id;

    -- Link metadata
    INSERT INTO public.document_metadata (
        document_id, document_type, standard, classification, patient_wallet,
        uploader_wallet, uploader_public_key, related_cid, fhir_compliance,
        session_id, episode_id, file_name
    ) VALUES (
        fhir_document_id, document_type, standard, classification,
        patient_wallet, fhir_uploader_wallet, fhir_uploader_public_key,
        related_cid, fhir_compliance, consent_session_id, episode_id, fhir_file_name
    )
    ON CONFLICT (document_id) DO UPDATE SET
        standard = EXCLUDED.standard,
        classification = EXCLUDED.classification,
        uploader_public_key = EXCLUDED.uploader_public_key,
        related_cid = EXCLUDED.related_cid,
        fhir_compliance = EXCLUDED.fhir_compliance,
        session_id = EXCLUDED.session_id,
        episode_id = EXCLUDED.episode_id,
        file_name = EXCLUDED.file_name;

    -- Update consent log with the related document CID
    UPDATE public.consent_log
    SET document_cid = fhir_document_id
    WHERE session_id = consent_session_id;

    RETURN true;
END;
$$;
