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
  key_share text,              -- Shamir share 1 (encrypted with server secret)
  key_version integer DEFAULT 1, -- increments on key rotation
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