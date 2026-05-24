# HealthProof — Verifiable Health Data Infrastructure

HealthProof is a **Web3 medical verification and interoperability infrastructure** that enables patients, laboratories, and healthcare providers in Chile to securely exchange medical documents while preserving **patient sovereignty, data confidentiality, and legal compliance**.

The protocol combines **client-side hybrid encryption (ECDH + AES-GCM), sovereign blockchain infrastructure (Avalanche L1), and distributed storage** to ensure that medical records remain private, portable, and interoperable across institutions.

**Legal context:** HealthProof is designed to comply with **Chilean Law 21.668** (published May 28, 2024), which modifies Law 20.584 to establish the **interoperability of clinical records** across public and private healthcare providers. The law mandates that providers adopt measures enabling interoperability, guarantee continuity of patient care, and ensure proper protection and conservation of records for at least 15 years.

---

# Table of Contents

- [Vision](#vision)
- [Legal Compliance (Chile)](#legal-compliance-chile)
- [Architecture Overview](#architecture-overview)
  - [Client Layer](#client-layer)
  - [Protocol Layer](#protocol-layer)
  - [Security & Encryption Layer](#security--encryption-layer)
  - [Storage Layer](#storage-layer)
  - [Blockchain Layer (Hygieia L1)](#blockchain-layer-hygieia-l1)
- [Encryption Deep Dive](#encryption-deep-dive)
- [Authentication (Privy)](#authentication-privy)
- [Smart Contracts](#smart-contracts)
- [Database Schema](#database-schema)
- [Meta-Transactions (EIP-2771)](#meta-transactions-eip-2771)
- [Guardians & Key Recovery](#guardians--key-recovery)
- [Interoperability & Distributed Nodes (Roadmap)](#interoperability--distributed-nodes-roadmap)
- [Technology Stack](#technology-stack)
- [Monorepo Structure](#monorepo-structure)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Contract Addresses](#contract-addresses)
- [Roadmap](#roadmap)

---

# Vision

Healthcare systems today suffer from critical structural problems:

- **Fragmented medical records**: A patient with chronic illness has their history scattered across clinics, labs, and hospitals.
- **Lack of interoperability**: Institutions cannot share essential data to guarantee continuity of care.
- **Limited patient control**: Patients do not decide who accesses their sensitive data or for how long.
- **Data residency gaps**: Medical data often leaves national territory, violating sovereignty and legal requirements.

HealthProof introduces a new paradigm:

> **Patients become the sovereign controllers of their medical records through cryptographic key ownership, while healthcare providers can verify medical documents and interoperate without relying on centralized intermediaries or foreign infrastructure.**

---

# Legal Compliance (Chile)

## Law 21.668 — Interoperability of Clinical Records

Published in the *Diario Oficial* on **May 28, 2024**, Law 21.668 modifies Law 20.584 (Rights and Duties of Persons regarding Healthcare) to establish:

### Key Legal Mandates

| Mandate | HealthProof Implementation |
|---------|---------------------------|
| **Interoperability between providers** | Distributed node network with encrypted replication; every provider runs a node that replicates data it is authorized to access. |
| **Continuity of patient care** | Real-time permission grants via on-chain `PermissionManager`; emergency access (break-the-glass) for critical scenarios. |
| **Data conservation (15 years)** | Each node commits to long-term replication; `document_secrets` include `storage_node` mapping for traceability. |
| **Proper protection & confidentiality** | Client-side ECDH + AES-GCM encryption; documents are unreadable to any node or attacker without the patient's private key. |
| **Custody by each provider** | Each provider (lab, clinic) stores only the documents it emits, fulfilling the legal requirement that each custodies its own records. |
| **Access to essential data for continuity of care** | Permission system allows doctors to request and patients to grant access to specific documents or full episodes. |

### Regulatory Gap to Close

The Ministry of Health has **18 months** (until November 2025) to publish the technical regulation detailing the "form and conditions" of interoperability. HealthProof positions itself as a **reference implementation** for a distributed, privacy-preserving, sovereign standard.

---

# Architecture Overview

HealthProof follows a **multi-layer protocol architecture**, separating clinical interaction, cryptographic security, distributed storage, and blockchain verification.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
│  Next.js 16 App · Privy Auth · i18n (es/en) · Neumorphism UI   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   PROTOCOL LAYER                                │
│  Identity · Permissions · Documents · Episodes · Orders · Audit │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│              SECURITY & ENCRYPTION LAYER                        │
│  ECDH P-256 · AES-GCM · HKDF · IndexedDB · Key Backup/Recovery  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                │
│  Encrypted blobs · IPFS/Pinata (current) · Private nodes (future)│
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│              BLOCKCHAIN LAYER (Hygieia L1)                      │
│  IdentityRegistry · PermissionManager · GuardianRegistry · ... │
│  UUPS Proxies · EIP-2771 Meta-TX · Native currency: HVE        │
└─────────────────────────────────────────────────────────────────┘
```

## Client Layer

The **HealthProof Clinical Client** (`apps/frontend/healthproof-frontend`) provides role-based interfaces for:

- **Patients**: View documents, grant/revoke permissions, manage guardians, scan QR codes.
- **Doctors**: Issue medical orders, request document access, verify permissions.
- **Laboratories**: Receive orders, upload exam results, share via QR.
- **Institutions / Medical Centers**: Manage staff, verify network participants.

Users authenticate via **Privy** (email OTP, Google OAuth, or external wallets like MetaMask). The system auto-generates an ECDH P-256 key pair on first login and stores the private key in the browser's IndexedDB.

## Protocol Layer

Core domain modules live under `src/features/` and `src/actions/`:

| Module | Responsibility |
|--------|---------------|
| `features/permissions` | QR generation, permission payload building, on-chain grant/revoke |
| `features/documents` | Document listing, metadata retrieval |
| `features/medical-orders` | Create order, list orders, get results |
| `actions/*-onchain.ts` | Server actions that interact with Hygieia via Wagmi + Viem |
| `actions/permissions/*` | Invitation flow (send/accept/reject/cancel), permission keys |
| `actions/auth/*` | User lookup, public key retrieval, backup management |

## Security & Encryption Layer

See [Encryption Deep Dive](#encryption-deep-dive).

## Storage Layer

Currently, encrypted medical documents are uploaded to **Pinata IPFS** (public IPFS network). This is a **transitional architecture**.

**Planned migration (Phase 1):** Replace Pinata with **private object storage** (S3-compatible or MinIO) hosted in Chile to comply with data residency.

**Long-term vision (Phase 3):** Each healthcare provider runs its own **IPFS private-swarm / libp2p node**. Documents replicate across the national healthcare network, but only the encrypted blobs travel; decryption keys never leave the patient's control.

## Blockchain Layer (Hygieia L1)

**Hygieia** is HealthProof's own Avalanche Layer 1 (Subnet), deployed via `avalanche-cli`.

| Parameter | Value |
|-----------|-------|
| **Chain ID** | `21668` |
| **Native currency** | `HVE` |
| **VM** | Subnet-EVM |
| **Deployment** | AWS-hosted node, RPC in Chile |
| **Consensus** | Avalanche (proof-of-stake subnet validators) |

### Why a dedicated L1?

1. **Sovereignty**: Transaction history, identity registry, and audit trail remain on infrastructure controlled by the Chilean healthcare network.
2. **Performance**: Fast finality (~1s) and low fees, suitable for high-throughput medical orders and permissions.
3. **Compliance**: No dependency on foreign L1s; regulatory audits can inspect the chain directly.
4. **Interoperability foundation**: Smart contracts govern which nodes are authorized to join the network (`HealthcareNetworkRegistry`).

---

# Encryption Deep Dive

HealthProof uses a **hybrid encryption scheme** combining the **Web Crypto API** with on-chain identity:

## 1. Key Generation (ECDH P-256)

On first authentication, the browser generates a non-extractable ECDH P-256 key pair:

```
Public Key  → exported as JWK → saved to DB (users.public_key)
Private Key → non-extractable CryptoKey → saved to IndexedDB
```

The private key is marked `non-extractable` (Web Crypto), meaning no JavaScript (including malicious XSS) can export it in raw form.

## 2. Document Encryption (AES-GCM)

When a lab uploads a document:

1. **Generate AES-256-GCM session key** (random, one per document).
2. **Encrypt the file** with AES-GCM → produces ciphertext + IV.
3. **Wrap the session key** for each authorized recipient using ECDH:
   - Derive shared secret between lab's private key and patient's public key (ECDH).
   - Derive wrapping key via HKDF-SHA-256.
   - Wrap AES session key → `encrypted_key`.
4. **Store**:
   - Encrypted blob → storage layer (IPFS / future node).
   - `document_secrets` row → `document_id`, `uploader_wallet`, `patient_wallet`, `iv`, `encrypted_keys` JSONB.

## 3. Document Decryption

When a patient (or authorized doctor) downloads:

1. Fetch encrypted blob from storage.
2. Fetch `document_secrets` row → obtain `iv` and `encrypted_keys[myWallet]`.
3. Use **patient's private ECDH key** (from IndexedDB) to derive shared secret with uploader's public key.
4. HKDF → unwrap AES session key.
5. AES-GCM decrypt → original document.

## 4. Sharing (Re-wrap)

When a patient shares with a doctor:

1. Patient uses their private key + doctor's public key to re-wrap the AES session key.
2. New `encrypted_key` is saved to `permission_keys` table and/or included in a QR code.
3. On-chain `PermissionManager.grantPermission` registers the authorization.

## 5. Key Backup & Recovery

To prevent lockout when switching devices:

- On first login, the private ECDH key is **exported temporarily** (as JWK), encrypted with PBKDF2+AES-GCM using a key derived from `userId + SHAMIR_ENCRYPTION_KEY`, and stored in the DB as `users.encrypted_private_key`.
- On new browser/device: detect empty IndexedDB → attempt auto-recovery from backup.
- **Key Conflict Prevention**: If the user has encrypted documents (`document_secrets`) but IndexedDB keys mismatch, a global `KeyConflictBanner` warns and blocks uploads/shares until resolved.

> **Note:** True **Shamir Secret Sharing** (threshold cryptography splitting the key among multiple guardians) is a **future enhancement** planned to integrate with `GuardianRegistry`. The current backup is single-party encrypted storage.

---

# Authentication (Privy)

HealthProof migrated from Supabase Auth to **Privy** (`@privy-io/react-auth`).

## Supported Login Methods

- **Email + OTP**: User receives a one-time code via email. Privy auto-creates an MPC-based embedded Ethereum wallet.
- **Google OAuth**: One-click social login; embedded wallet created automatically.
- **External Wallet**: User connects an existing wallet (MetaMask, Rainbow, etc.) via Privy's wallet modal.

## Embedded Wallets (MPC)

```tsx
// providers.tsx
embeddedWallets: {
  ethereum: {
    createOnLogin: "users-without-wallets",
  },
}
```

Privy's embedded wallets use **Multi-Party Computation (MPC)**: the private key is split into shards distributed between Privy, the user's device, and (optionally) a recovery service. No single party holds the complete key.

### Custodial vs. Non-Custodial Reality

- **Embedded wallets** offer great UX (no seed phrase) but the user does not hold the full private key.
- **External wallets** (MetaMask) are fully non-custodial: the user owns the seed phrase and the key never touches Privy's servers.
- **Data sovereignty** in HealthProof is enforced at the **ECDH encryption layer**, not the wallet layer. Even if Privy disappeared, a patient with their ECDH private key (backed up or recovered) can still decrypt their medical documents.

## Future: Wallet Migration Path

A planned feature will allow users who started with an embedded wallet to **link and migrate to an external wallet** while preserving their identity, on-chain permissions, and encrypted data history.

---

# Smart Contracts

All contracts are **UUPS Upgradeable Proxies** deployed on Hygieia (Avalanche L1, `chainId 21668`).

| Contract | Role |
|----------|------|
| `IdentityRegistry` | Role-based identity (PATIENT, DOCTOR, LAB, INSTITUTION, ADMIN). `hasRole()`, `grantRole()`, `revokeRole()`. |
| `GuardianRegistry` | Guardian appointment for patients. Used for future key recovery and emergency access delegation. |
| `PermissionManager` | O(1) permission lookups. `grantPermission()`, `revokePermission()`, `hasAccess()`. |
| `ClinicalEpisodeRegistry` | Grouping of medical orders and documents under a single clinical episode. |
| `MedicalOrderRegistry` | Issuance of medical orders by doctors, assignment to labs. |
| `MedicalDocumentRegistry` | Registration of document metadata (hashes, URIs). |
| `HealthcareNetworkRegistry` | Registry of authorized healthcare institutions and their nodes. |
| `AuditTrail` | Immutable event log: order creation, document upload, permission grants/revocations. |
| `HealthProofKernel` | Core protocol coordinator. |
| `HealthProofGateway` | Proxy entry point for gasless meta-transactions and role-checked actions. |
| `HealthProofProtocol` | High-level protocol orchestration. |
| `TrustedForwarder` | EIP-2771 trusted forwarder for meta-transactions. |

### Meta-Transactions (EIP-2771)

Users sign transactions off-chain (no gas). A relayer (deployer or dedicated service) submits them via `TrustedForwarder`. The target contract extracts the original signer's address from the appended signature.

This is essential for patients using embedded wallets who may not hold HVE gas tokens.

---

# Database Schema

HealthProof uses **Supabase (PostgreSQL)** for structured data. Roles, permissions, and audit events live on-chain; the database stores encryption metadata and user profiles.

## Tables (Current — 3 Tables)

### 1. `users`

```sql
id TEXT PRIMARY KEY,           -- Privy DID (did:privy:...)
wallet_address TEXT UNIQUE,   -- Ethereum address
email TEXT,
full_name TEXT,
public_key TEXT,              -- JWK of ECDH public key
encrypted_private_key TEXT,   -- PBKDF2+AES-GCM encrypted backup
created_at TIMESTAMPTZ
```

> `role` has been removed from the DB and now lives **on-chain** in `IdentityRegistry`.

### 2. `document_secrets`

```sql
id UUID PRIMARY KEY,
document_id VARCHAR UNIQUE,       -- CID or storage path
file_name TEXT,                   -- human-readable name
uploader_wallet TEXT REFERENCES users(wallet_address),
patient_wallet TEXT REFERENCES users(wallet_address),
iv TEXT,                          -- AES-GCM initialization vector
encrypted_keys JSONB,             -- { wallet_address: wrapped_key }
uploader_public_key TEXT,         -- JWK of uploader's pubkey at upload time
created_at TIMESTAMPTZ
```

### 3. `permission_keys`

```sql
id UUID PRIMARY KEY,
document_id TEXT REFERENCES document_secrets(document_id),
patient_wallet TEXT REFERENCES users(wallet_address),
grantee_wallet TEXT REFERENCES users(wallet_address),
encrypted_key TEXT,               -- re-wrapped AES session key for grantee
created_at TIMESTAMPTZ,
UNIQUE(document_id, grantee_wallet)
```

### Future Additions

- **`storage_node`** column in `document_secrets`: tracks which physical node (IPFS/libp2p endpoint) holds the encrypted blob.
- **`invitations`** table: tracks pending permission invitations before on-chain execution (already implemented via server actions).

---

# Meta-Transactions (EIP-2771)

```typescript
// 1. User signs off-chain
const signed = await signMetaTransaction(
  walletClient,
  CONTRACT_ADDRESSES.PermissionManager,
  "grantPermission",
  [patientWallet, granteeWallet, scope, resourceId, expiry],
  PermissionManagerAbi
);

// 2. Server relays
const result = await grantPermissionOnChain({ request, ...payload });
```

**Benefits:**
- Patients do not need HVE tokens.
- Embedded wallet users experience gasless UX.
- The relayer pays gas, subsidized by the network or institution.

---

# Guardians & Key Recovery

## GuardianRegistry (On-Chain)

Patients can appoint **guardians** (trusted family members or doctors) who gain limited authority:

- **Future**: Participate in **Shamir Secret Sharing** threshold recovery (e.g., 2-of-3 guardians needed to reconstruct the patient's ECDH private key if the patient loses all devices).
- **Emergency access**: A guardian may trigger a time-locked emergency permission request, logged immutably in `AuditTrail`.

## Key Conflict Prevention

The system prevents accidental ECDH key regeneration when encrypted data exists:

```
IndexedDB keys match DB public_key → OK
IndexedDB empty + DB has key + documents exist → conflict (missing_local_keys)
IndexedDB keys differ + documents exist → conflict (key_mismatch)
```

Global `KeyConflictBanner` blocks uploads/shares until the user resolves the conflict via `KeyRecoveryModal`.

---

# Interoperability & Distributed Nodes (Roadmap)

This is HealthProof's **Phase 3-4 vision** and directly addresses **Law 21.668**.

## Current State (Phase 0)

- Encrypted documents stored on **public IPFS via Pinata**.
- All nodes (frontend + backend) connect to a single storage provider.
- Data leaves Chilean territory (IPFS global DHT).

## Phase 1 — Private Storage in Chile

Replace Pinata with **S3-compatible or MinIO buckets** hosted on Chilean servers. The encrypted blobs never leave national territory. This satisfies immediate data-residency compliance.

## Phase 2 — Institution-Owned Endpoints

Each clinic or lab configures its own storage endpoint:

```sql
ALTER TABLE document_secrets ADD COLUMN storage_node TEXT;
```

- Lab A stores its documents on `node-a.healthproof.cl`.
- The patient accesses them via the HealthProof frontend, which routes the download request to the correct node.
- The node only serves the **encrypted blob**; it cannot decrypt it.

## Phase 3 — Private P2P Healthcare Network

Implement an **IPFS private swarm** or **libp2p permissioned network**:

- Only nodes registered in `HealthcareNetworkRegistry` can join.
- Node identity is tied to an on-chain `INSTITUTION` role.
- Encrypted documents replicate across the network (e.g., 3 copies: emitter node + patient cache + regional archive).
- Content is never announced to the public IPFS DHT.

## Phase 4 — National Interoperability Grid

- Every certified healthcare provider in Chile runs a HealthProof node.
- The node validates its own data (digital signatures from the emitter) and replicates peers' data under SLAs encoded on-chain.
- Patients have a **single unified view** of their clinical history, aggregated from all nodes, decrypted locally with their private key.
- The Ministry of Health can audit the network via `AuditTrail` on Hygieia without accessing patient data.

### Interoperability Without Centralization

| Traditional Approach | HealthProof Distributed Approach |
|-------------------|----------------------------------|
| Single national database (monopoly, honeypot) | Each provider custodies its own data (Law 21.668 compliant) |
| Unencrypted or weakly encrypted exports | End-to-end ECDH encryption; nodes only store ciphertext |
| Complex HL7/FHIR point-to-point integrations | Standardized protocol via smart contracts + encrypted blob replication |
| Patient has no audit trail | Every access logged immutably on-chain |

---

# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 16 (App Router) | React framework with Server Actions |
| TypeScript | Type safety |
| TailwindCSS + custom neumorphism | UI styling |
| Sileo | Toast notifications |
| `next-intl` | i18n (Spanish / English) |
| Zustand | Global state (auth, permissions, UI, key conflicts) |
| React Query | Server state caching |

## Web3

| Technology | Purpose |
|------------|---------|
| Privy (`@privy-io/react-auth`) | Authentication + embedded/external wallets |
| Wagmi | Ethereum React hooks |
| Viem | Modern TypeScript Ethereum library (wallet client, encoding) |
| `qrcode.react` | QR code generation for permission sharing |

## Encryption

| Technology | Purpose |
|------------|---------|
| Web Crypto API (`crypto.subtle`) | ECDH P-256, AES-GCM, HKDF, PBKDF2 |
| IndexedDB | Non-extractable private key storage |

## Blockchain

| Technology | Purpose |
|------------|---------|
| Hardhat | Smart contract development, testing, deployment |
| OpenZeppelin UUPS | Upgradeable proxy pattern |
| EIP-2771 | Meta-transaction standard |
| Avalanche-CLI | L1 / Subnet deployment |

## Backend & Database

| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Structured data: users, document_secrets, permission_keys |
| Pinata (transitional) | IPFS pinning for encrypted blobs |
| Server Actions (Next.js) | Secure backend logic without separate API layer |

---

# Monorepo Structure

```
healthproof/
├── apps/
│   ├── backend/              # (future) dedicated backend services
│   └── frontend/
│       └── healthproof-frontend/   # Next.js 16 application
│           ├── src/
│           │   ├── app/[locale]/      # i18n routing (es, en)
│           │   │   ├── auth/
│           │   │   ├── dashboard/
│           │   │   │   ├── documents/
│           │   │   │   ├── guardians/
│           │   │   │   ├── kernel/
│           │   │   │   ├── permissions/
│           │   │   │   ├── profile/
│           │   │   │   ├── share/
│           │   │   │   └── upload/
│           │   │   └── landing/
│           │   ├── actions/         # Server Actions (on-chain + DB)
│           │   ├── components/
│           │   ├── features/        # Domain modules
│           │   ├── hooks/           # React hooks (auth, keys, sync)
│           │   ├── lib/             # Utilities, env, contracts, metatx
│           │   ├── services/        # Encryption, storage, API
│           │   ├── state/           # Zustand stores
│           │   └── types/           # Domain & API types
│           ├── messages/en.json
│           ├── messages/es.json
│           └── public/
├── infra/
│   └── avalanche/
│       ├── contracts/           # Solidity smart contracts
│       │   ├── src/
│       │   └── test/
│       └── network/             # Subnet configuration
├── packages/
│   ├── blockchain-sdk/          # Shared blockchain utilities
│   ├── contracts/               # Contract ABIs & deployment scripts
│   ├── did/                     # DID utilities
│   └── encryption/              # Shared encryption helpers
├── docs/
│   └── architecture-debt-v1.2.md
└── supabase_migrations/         # SQL migrations
```

---

# Environment Variables

Create a `.env` file in `apps/frontend/healthproof-frontend/`:

```bash
# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Supabase (Database only — auth handled by Privy)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Pinata / Storage (Phase 0 — will migrate to private storage)
PINATA_JWT_SECRET=your-pinata-jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://your-gateway.mypinata.cloud

# Blockchain
NEXT_PUBLIC_RPC_URL=http://your-hygieia-node:9654/ext/bc/.../rpc
NEXT_PUBLIC_CHAIN_ID=21668

# Contract Addresses (Hygieia L1)
NEXT_PUBLIC_IDENTITY_REGISTRY=0x...
NEXT_PUBLIC_GUARDIAN_REGISTRY=0x...
NEXT_PUBLIC_PERMISSION_MANAGER=0x...
NEXT_PUBLIC_CLINICAL_EPISODE_REGISTRY=0x...
NEXT_PUBLIC_MEDICAL_ORDER_REGISTRY=0x...
NEXT_PUBLIC_MEDICAL_DOCUMENT_REGISTRY=0x...
NEXT_PUBLIC_HEALTHCARE_NETWORK_REGISTRY=0x...
NEXT_PUBLIC_AUDIT_TRAIL=0x...
NEXT_PUBLIC_HEALTHPROOF_KERNEL=0x...
NEXT_PUBLIC_HEALTHPROOF_GATEWAY=0x...
NEXT_PUBLIC_HEALTHPROOF_PROTOCOL=0x...
NEXT_PUBLIC_TRUSTED_FORWARDER=0x...

# Server-side secrets
DEPLOYER_PRIVATE_KEY=0x...
SHAMIR_ENCRYPTION_KEY=your-shamir-key
```

---

# Quick Start

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Git

## Install

```bash
git clone https://github.com/jpgsChile/healthproof
cd healthproof
pnpm install
```

## Configure Environment

```bash
cd apps/frontend/healthproof-frontend
cp .env.example .env
# Fill in all required variables
```

## Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
```

## Smart Contract Development

```bash
cd infra/avalanche/contracts
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deployHealthProofUUPS.ts --network hygieia
```

---

# Contract Addresses

## Hygieia L1 (Production / Staging)

**RPC:** `http://3.141.110.34:9654/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc`  
**Chain ID:** `21668`  
**Deployer:** `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC`

| Contract | Proxy Address |
|----------|---------------|
| IdentityRegistry | `0x68EA48917a3f9416613A48788BCe54578395a315` |
| GuardianRegistry | `0xE742a4b5F98453027fA3A9b0de106e237B6746B1` |
| PermissionManager | `0xb91b7959e715c059cE10eBEbe3288dA9d8012961` |
| ClinicalEpisodeRegistry | `0x207Ac23cf698ce54ad2AE2391be5df4b8c66430F` |
| MedicalOrderRegistry | `0x9E1222D98DBc740bbD406b5945084D363888CeA0` |
| MedicalDocumentRegistry | `0x5b190A85fb41D7C1d173a4501f12b81c28F59824` |
| HealthcareNetworkRegistry | `0x724820e539ae50f5fe7434fc9a6Cd2B17F832D31` |
| AuditTrail | `0x1AA001Cd20F35F3F4EF1A945053CeE4Acc24aDb4` |
| HealthProofKernel | `0xcad00692aa206527F64Fc683dB0f711dc49CB176` |
| HealthProofGateway | `0x68adE62397958E78A728313D27d3B1227Abf93d3` |
| HealthProofProtocol | `0x0D6F31D23704631417D8C55360aF2D493A578BF2` |
| TrustedForwarder | `0xC76413e3c098DC67cfdE4C2E92351792EC6924bf` |

> **Note:** Contracts are UUPS upgradeable. Implementation addresses are tracked separately.

---

# Roadmap

## Completed

- [x] ECDH P-256 hybrid encryption system
- [x] Key backup & recovery (PBKDF2 + IndexedDB)
- [x] Key conflict prevention (Zustand store + banner)
- [x] Privy authentication (email, Google, wallet)
- [x] Hygieia Avalanche L1 deployment
- [x] UUPS smart contract suite (Identity, Permission, Guardian, Episode, Order, Document registries)
- [x] EIP-2771 meta-transactions (gasless UX)
- [x] Role-based dashboard (Patient, Doctor, Lab, Institution, Admin)
- [x] Permission invitation flow (send / accept / reject / cancel)
- [x] QR-code based permission sharing
- [x] Neumorphism UI design system
- [x] i18n (Spanish / English)

## In Progress

- [ ] Fix email/OTP on-chain registration (currently only Google login registers correctly)
- [ ] Migrate storage from Pinata/IPFS public → private Chilean-hosted storage
- [ ] Add `storage_node` column to `document_secrets`
- [ ] Implement break-the-glass emergency access (compliance with Law 21.668 urgent care continuity)

## Short Term

- [ ] Wallet linking & migration (embedded → external wallet)
- [ ] Multi-document permission grants (batch select in UI)
- [ ] Push notifications for permission invitations
- [ ] Document versioning & correction workflow
- [ ] Enhanced audit dashboard for institutions

## Medium Term

- [ ] Institution-owned storage nodes (Phase 2)
- [ ] IPFS private swarm / libp2p permissioned network (Phase 3)
- [ ] Shamir Secret Sharing threshold recovery using `GuardianRegistry`
- [ ] Mobile app (React Native) with biometric key protection (WebAuthn / Secure Enclave)
- [ ] Integration with Chilean Ministry of Health regulation (once technical norm is published)

## Long Term

- [ ] National healthcare provider onboarding (every certified clinic/lab runs a node)
- [ ] On-chain SLA agreements for data replication and 15-year conservation
- [ ] Federated learning on encrypted medical data (privacy-preserving AI diagnostics)
- [ ] Cross-border interoperability agreements (MERCOSUR / Pacific Alliance health data corridors)

---

# Contributing

We welcome contributions from healthcare engineers, cryptographers, and blockchain developers focused on **privacy-preserving medical infrastructure**.

Please open an issue or pull request at:  
https://github.com/jpgsChile/healthproof

---

# License

[License to be defined]

---

> **Disclaimer:** HealthProof is an experimental infrastructure project. It is not yet certified for production medical use in Chile. Clinical deployment requires review by the **Ministry of Health** and **Superintendence of Health** under the forthcoming technical regulation of Law 21.668.
