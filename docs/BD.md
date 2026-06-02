-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id text NOT NULL,
  wallet_address character varying NOT NULL UNIQUE,
  email character varying,
  full_name character varying,
  created_at timestamp without time zone DEFAULT now(),
  public_key text,
  key_share text,
  key_version integer DEFAULT 1,
  server_share_ciphertext text,
  server_share_dek_ciphertext text,
  server_share_kms_key_id text,
  master_secret_hash text,
  scheme_version integer DEFAULT 0,
  encrypted_private_key text,
  recovery_code_hash text,
  recovery_code_used_at timestamp with time zone,
  onboarding_completed_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_secrets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  document_id character varying NOT NULL UNIQUE,
  uploader_wallet character varying NOT NULL,
  patient_wallet character varying NOT NULL,
  iv character varying NOT NULL,
  encrypted_keys jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  uploader_public_key text,
  key_version integer DEFAULT 1,
  file_name text,
  episode_id text,
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
CREATE TABLE public.sync_state (
  contract_address character varying NOT NULL,
  last_block_number bigint NOT NULL,
  last_sync_at timestamp without time zone DEFAULT now(),
  CONSTRAINT sync_state_pkey PRIMARY KEY (contract_address)
);
CREATE TABLE public.audit_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  actor character varying NOT NULL,
  patient character varying NOT NULL,
  resource_id character varying NOT NULL,
  action_type character varying NOT NULL,
  block_number bigint NOT NULL,
  tx_hash character varying NOT NULL,
  timestamp timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT audit_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.indexed_orders (
  order_id character varying NOT NULL,
  patient_wallet character varying,
  doctor_wallet character varying,
  lab_wallet character varying,
  status integer,
  episode_id character varying,
  exam_type character varying,
  block_number bigint,
  tx_hash character varying,
  created_at timestamp without time zone,
  CONSTRAINT indexed_orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT indexed_orders_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT indexed_orders_doctor_wallet_fkey FOREIGN KEY (doctor_wallet) REFERENCES public.users(wallet_address)
);
CREATE TABLE public.indexed_episodes (
  episode_id character varying NOT NULL,
  patient_wallet character varying,
  doctor_wallet character varying,
  active boolean,
  episode_type character varying,
  block_number bigint,
  tx_hash character varying,
  created_at timestamp without time zone,
  CONSTRAINT indexed_episodes_pkey PRIMARY KEY (episode_id),
  CONSTRAINT indexed_episodes_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT indexed_episodes_doctor_wallet_fkey FOREIGN KEY (doctor_wallet) REFERENCES public.users(wallet_address)
);
CREATE TABLE public.EmergencyKeyEscrow (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requestId text NOT NULL UNIQUE,
  patientWallet text NOT NULL,
  guardianWallet text NOT NULL,
  encryptedKey text NOT NULL,
  expiresAt timestamp with time zone NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT EmergencyKeyEscrow_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permission_invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_wallet character varying NOT NULL,
  grantee_wallet character varying NOT NULL,
  document_ids ARRAY NOT NULL DEFAULT '{}'::text[],
  scope integer NOT NULL DEFAULT 0,
  expires_at_unix bigint DEFAULT 0,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'expired'::character varying]::text[])),
  signed_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  encrypted_keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  tx_hash character varying,
  created_at timestamp without time zone DEFAULT now(),
  responded_at timestamp without time zone,
  episode_id text,
  CONSTRAINT permission_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT permission_invitations_patient_wallet_fkey FOREIGN KEY (patient_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT permission_invitations_grantee_wallet_fkey FOREIGN KEY (grantee_wallet) REFERENCES public.users(wallet_address)
);