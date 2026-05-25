-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.document_secrets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  document_id character varying NOT NULL UNIQUE,
  uploader_wallet character varying NOT NULL,
  patient_wallet character varying NOT NULL,
  iv character varying NOT NULL,
  encrypted_keys jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  uploader_public_key text,
  CONSTRAINT document_secrets_pkey PRIMARY KEY (id),
  CONSTRAINT document_secrets_uploader_wallet_fkey FOREIGN KEY (uploader_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT document_secrets_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address)
);
CREATE TABLE public.permission_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  document_id character varying NOT NULL,
  patient_wallet character varying NOT NULL,
  grantee_wallet character varying NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT permission_keys_pkey PRIMARY KEY (id),
  CONSTRAINT permission_keys_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_secrets(document_id),
  CONSTRAINT permission_keys_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT permission_keys_grantee_wallet_fkey FOREIGN KEY (grantee_wallet) REFERENCES public.users(wallet_address)
);
CREATE TABLE public.users (
  id text NOT NULL,
  wallet_address character varying NOT NULL UNIQUE,
  email character varying,
  full_name character varying,
  created_at timestamp without time zone DEFAULT now(),
  public_key text,
  encrypted_private_key text,  -- legacy backup (PBKDF2+AES-GCM), migrate to key_share
  key_share text,              -- legacy Shamir share 1 (encrypted with server secret)
  key_version integer DEFAULT 1, -- increments on key rotation
  -- New SSS(2,3) + KMS fields
  server_share_ciphertext text,        -- share2 encrypted with AES-GCM + DEK
  server_share_dek_ciphertext text,    -- DEK encrypted by AWS KMS CMK
  server_share_kms_key_id text,        -- AWS KMS CMK ARN/ID
  recovery_code_hash text,             -- SHA-256(normalized recovery code)
  recovery_code_used_at timestamp without time zone,
  master_secret_hash text,             -- SHA-256(master_secret) for integrity
  scheme_version integer DEFAULT 1,    -- 1=legacy, 2=SSS(2,3)+KMS
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sync_state (
  contract_address character varying NOT NULL PRIMARY KEY,
  last_block_number text NOT NULL,
  last_sync_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.permission_invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_wallet character varying NOT NULL,
  grantee_wallet character varying NOT NULL,
  document_ids text[] NOT NULL DEFAULT '{}',
  scope integer NOT NULL DEFAULT 0,
  expires_at_unix bigint DEFAULT 0,
  status character varying NOT NULL DEFAULT 'pending',
  signed_requests jsonb NOT NULL DEFAULT '[]',
  encrypted_keys jsonb NOT NULL DEFAULT '{}',
  tx_hash character varying,
  created_at timestamp without time zone DEFAULT now(),
  responded_at timestamp without time zone,
  CONSTRAINT permission_invitations_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT permission_invitations_grantee_wallet_fkey FOREIGN KEY (grantee_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT permission_invitations_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired'))
);

CREATE TABLE public.audit_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor character varying NOT NULL,
  patient character varying NOT NULL,
  resource_id character varying NOT NULL,
  action_type character varying NOT NULL,
  block_number integer NOT NULL,
  tx_hash character varying NOT NULL,
  timestamp timestamp without time zone NOT NULL,
  UNIQUE(tx_hash, resource_id, action_type)
);

-- Recovery magic links: single-use, time-limited tokens for recovery code delivery
CREATE TABLE public.recovery_magic_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id),
  token_hash character varying NOT NULL,          -- SHA-256(token)
  jti character varying NOT NULL UNIQUE,          -- unique token id
  expires_at timestamp without time zone NOT NULL,
  consumed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now()
);

-- Recovery audit log
CREATE TABLE public.recovery_audit (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id),
  action character varying NOT NULL,              -- 'fetch_share', 'issue_magic_link', 'consume_magic_link', 'recovery_success', 'recovery_fail'
  ip_address character varying,
  user_agent character varying,
  metadata jsonb DEFAULT '{}',
  created_at timestamp without time zone DEFAULT now()
);