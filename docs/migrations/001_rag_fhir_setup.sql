-- HealthProof RAG FHIR MVP — Supabase migration
-- Requires pgvector extension enabled.

-- Enable vector extension (may fail if not supported by Supabase project; ensure extension is enabled first)
create extension if not exists vector;

-- RAG knowledge base
-- Table: fhir_knowledge
-- PHI: NONE. This table only contains public Chilean FHIR/LOINC guidance.
create table if not exists fhir_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fhir_knowledge_metadata
  on fhir_knowledge using gin (metadata);

create index if not exists idx_fhir_knowledge_embedding
  on fhir_knowledge using hnsw (embedding vector_cosine_ops);

-- RPC: semantic search over the knowledge base
-- Invoked only from server actions using service-role key.
create or replace function match_fhir_knowledge(
  query_embedding vector(1536),
  match_count int default 8,
  filter jsonb default '{}'
) returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata,
         1 - (embedding <=> query_embedding) as similarity
  from fhir_knowledge
  where metadata @> filter
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Consent log for OpenAI FHIR processing
-- PHI: none. Stores only actor wallet, action, session UUID and optional CID.
create table if not exists consent_log (
  id uuid primary key default gen_random_uuid(),
  actor_wallet varchar not null references users(wallet_address),
  action text not null check (action = 'openai_fhir_processing'),
  session_id uuid not null unique,
  document_cid varchar null references document_secrets(document_id),
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_log_session
  on consent_log (session_id);

-- RLS deny-all for anon/auth roles; access is only via service-role server actions.
alter table consent_log enable row level security;

-- Document metadata for FHIR bundles (no PHI)
-- Links a FHIR bundle document_id to its parent PDF related_cid (1:1).
create table if not exists document_metadata (
  id uuid primary key default gen_random_uuid(),
  document_id varchar not null unique references document_secrets(document_id),
  related_cid varchar not null unique references document_secrets(document_id),
  document_type text not null,
  standard text not null,
  classification text not null,
  fhir_compliance jsonb not null,
  created_at timestamptz not null default now(),
  check (related_cid is not null)
);

create index if not exists idx_document_metadata_document_type
  on document_metadata (document_type);

create index if not exists idx_document_metadata_related_cid
  on document_metadata (related_cid);

-- RLS deny-all for anon/auth roles; access is only via service-role server actions.
alter table document_metadata enable row level security;

-- Ensure document_secrets has the required columns for the MVP.
-- file_name and uploader_public_key are required; episode_id may be null.
-- If the existing table differs, adjust manually before applying this migration.
do $$
begin
  -- The columns must exist in the existing document_secrets table:
  -- document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, episode_id
  -- This migration does not drop existing columns.
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'document_secrets' and column_name = 'file_name'
  ) then
    raise exception 'Column document_secrets.file_name is missing. Add it before applying this migration.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'document_secrets' and column_name = 'uploader_public_key'
  ) then
    raise exception 'Column document_secrets.uploader_public_key is missing. Add it before applying this migration.';
  end if;
end
$$;

-- RPC: transactional publish of a PDF + FHIR bundle pair.
-- Receives all explicit columns; id and created_at use table defaults.
create or replace function publish_fhir_document(
  pdf_document_id varchar, pdf_uploader_wallet varchar, pdf_patient_wallet varchar,
  pdf_iv varchar, pdf_encrypted_keys jsonb, pdf_uploader_public_key text, pdf_file_name text,
  pdf_episode_id varchar,
  fhir_document_id varchar, fhir_uploader_wallet varchar, fhir_patient_wallet varchar,
  fhir_iv varchar, fhir_encrypted_keys jsonb, fhir_uploader_public_key text, fhir_file_name text,
  fhir_episode_id varchar,
  related_cid varchar, document_type text, standard text, classification text,
  fhir_compliance jsonb, consent_session uuid
) returns void language plpgsql as $$
declare
  ZERO_BYTES32 constant varchar := '0x0000000000000000000000000000000000000000000000000000000000000000';
  pdf_episode_id_clean varchar := nullif(pdf_episode_id, ZERO_BYTES32);
  fhir_episode_id_clean varchar := nullif(fhir_episode_id, ZERO_BYTES32);
begin
  -- Insert PDF secret (idempotent)
  insert into document_secrets (document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, episode_id)
    values (pdf_document_id, pdf_file_name, pdf_uploader_wallet, pdf_patient_wallet, pdf_iv, pdf_encrypted_keys, pdf_uploader_public_key, pdf_episode_id_clean)
    on conflict (document_id) do nothing;

  -- Insert FHIR bundle secret (idempotent)
  insert into document_secrets (document_id, file_name, uploader_wallet, patient_wallet, iv, encrypted_keys, uploader_public_key, episode_id)
    values (fhir_document_id, fhir_file_name, fhir_uploader_wallet, fhir_patient_wallet, fhir_iv, fhir_encrypted_keys, fhir_uploader_public_key, fhir_episode_id_clean)
    on conflict (document_id) do nothing;

  -- Link bundle to its PDF (idempotent)
  insert into document_metadata (document_id, related_cid, document_type, standard, classification, fhir_compliance)
    values (fhir_document_id, related_cid, document_type, standard, classification, fhir_compliance)
    on conflict (document_id) do nothing;

  -- Bind consent session to the FHIR document (idempotent for retries, but only nulls)
  update consent_log set document_cid = fhir_document_id
    where session_id = consent_session and document_cid is null;
end;
$$;
