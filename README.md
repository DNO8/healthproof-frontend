# HealthProof — Decentralized Medical Data Sovereignty Protocol

> **Patient-centric, blockchain-verified, end-to-end encrypted medical records.**

HealthProof is a decentralized protocol that gives patients full sovereignty over their clinical data. Medical documents are encrypted client-side, stored on IPFS, and registered on-chain on **Hygieia**, a dedicated Avalanche L1 blockchain. Access is granted through cryptographic permissions — not through centralized databases that institutions control.

---

## Table of Contents

- [Overview](#overview)
- [Protocol Architecture](#protocol-architecture)
- [Clinical Workflow](#clinical-workflow)
- [On-Chain Contracts](#on-chain-contracts)
- [Hybrid Encryption System](#hybrid-encryption-system)
- [Off-Chain Storage](#off-chain-storage)
- [Role-Based Access](#role-based-access)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Hygieia L1 Deployment](#hygieia-l1-deployment)

---

## Overview

Traditional electronic health record (EHR) systems store medical data in siloed, institution-controlled databases. Patients have little visibility or control over who accesses their information, and data portability between providers is severely limited.

HealthProof addresses these problems by:

- **Storing clinical documents encrypted on IPFS** — no institution holds the plaintext.
- **Recording provenance on Hygieia (Avalanche L1)** — every document registration, permission grant, and clinical event is immutably logged on a dedicated healthcare blockchain.
- **Granting patients cryptographic control** — only the patient (or their authorized delegate) can decrypt and share their records via ECDH key exchange and QR-based permission flows.
- **Enforcing role-based identity on-chain** — doctors, laboratories, and institutions are registered and verified in the `IdentityRegistry` smart contract before they can participate in clinical workflows.

---

## Protocol Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                    │
│  Privy Auth · Embedded Wallets · ECDH Encryption · IPFS  │
└────────────────────────┬─────────────────────────────────┘
                         │ Server Actions (viem)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  HealthProofGateway                       │
│           Unified entry point for the protocol           │
└────────────────────────┬─────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  HealthProofKernel  │
              │  Module registry    │
              │  Pause / Governance │
              └──────────┬──────────┘
                         │
     ┌───────────┬───────┼───────┬────────────┐
     ▼           ▼       ▼       ▼            ▼
  Identity   Clinical  Medical  Medical   Permission
  Registry   Episode   Order    Document   Manager
             Registry  Registry Registry
```

The protocol follows a **modular Kernel pattern**. The `HealthProofKernel` acts as a registry of modules. The `HealthProofGateway` is the single entry point that routes operations to the appropriate module. Each module is a standalone contract responsible for a specific domain.

---

## Clinical Workflow

The end-to-end clinical flow involves three actors: **Doctor**, **Laboratory**, and **Patient**.

```
 DOCTOR                    LABORATORY                 PATIENT
   │                           │                         │
   ├─ 1. Open Episode ─────────┤                         │
   ├─ 2. Create Order ─────────┤                         │
   │                           │                         │
   │                           ├─ 3. Upload Results ─────┤
   │                           │    (Encrypt + IPFS +    │
   │                           │     register on-chain)  │
   │                           │                         │
   │                           │     4. View Documents ──┤
   │                           │                         │
   │     6. Scan QR ◄──────────┼──── 5. Share via QR ────┤
   │    (Decrypt + View)       │    (Grant permission +  │
   │                           │     re-wrap ECDH key)   │
```

1. **Doctor** opens a clinical episode and creates a medical order for a specific exam.
2. **Laboratory** receives the patient (out-of-band in MVP), performs the exam, encrypts the results client-side with AES-256-GCM, uploads the ciphertext to IPFS, and registers the document hash on-chain.
3. **Patient** views their documents in the dashboard (decrypted locally using their ECDH private key stored in IndexedDB).
4. **Patient** shares results with the doctor by generating a QR code that contains a re-wrapped AES key and an on-chain permission grant.
5. **Doctor** scans the QR, verifies the on-chain permission, unwraps the AES key, and decrypts the document.

---

## On-Chain Contracts

All contracts are deployed on **Hygieia** (Avalanche L1, chainId `21668`) and written in Solidity `^0.8.20`. The L1 runs on a dedicated AWS-hosted node with native currency **HVE**.

| Contract | Responsibility |
|----------|----------------|
| **IdentityRegistry** | Register and verify entities (patients, doctors, labs, institutions) with on-chain roles |
| **GuardianRegistry** | Manage legal guardians for minors or incapacitated patients |
| **PermissionManager** | Grant and revoke scoped access permissions for medical resources |
| **ClinicalEpisodeRegistry** | Open, track, and close clinical episodes |
| **MedicalOrderRegistry** | Create medical orders for exams, assign laboratories, track order status |
| **MedicalDocumentRegistry** | Register document metadata (CID, hash) on-chain for provenance |
| **HealthcareNetworkRegistry** | Register healthcare institutions and their network relationships |
| **AuditTrail** | Immutable event log for protocol-wide auditing |
| **HealthProofKernel** | Module registry, protocol pause, admin/governance roles |
| **HealthProofGateway** | Single entry point that routes calls through the Kernel to modules |
| **HealthProofProtocol** | Orchestrator for permissions, documents, and audit trail |

### On-Chain Role Enum

```solidity
enum Role { PATIENT, DOCTOR, LAB, INSTITUTION, CERTIFIER, ADMIN }
```

Roles are assigned during identity registration and verified on-chain. The frontend reads roles from the `IdentityRegistry` to render role-specific dashboards.

---

## Hybrid Encryption System

HealthProof implements a **ECDH P-256 hybrid encryption** scheme to ensure that no server or third party ever sees medical data in plaintext.

```
┌─────────────┐     AES-256-GCM      ┌────────────┐
│  Raw File   │ ──────────────────► │ Ciphertext │ ──► IPFS
└─────────────┘                      └────────────┘
       │
  AES Session Key
       │
       ├─── Wrap for Lab ──────► ECDH(lab.pub, lab.priv) → encrypted_key[lab]
       └─── Wrap for Patient ──► ECDH(lab.priv, patient.pub) → encrypted_key[patient]
```

- **Upload:** The lab generates a random AES-256-GCM session key, encrypts the file, then wraps the session key for each authorized party using ECDH key agreement (P-256) + HKDF derivation.
- **Download:** The recipient unwraps the AES key using their private ECDH key (stored as a non-extractable `CryptoKey` in IndexedDB), then decrypts the file locally.
- **Sharing:** The patient re-wraps the AES key for a new recipient (e.g., a doctor) using `rewrapKeyForRecipient`, without ever exposing the plaintext key to the server.

### Key Management

| Component | Storage | Purpose |
|-----------|---------|---------|
| ECDH Private Key | IndexedDB (`non-extractable`) | Decrypt / re-wrap AES keys |
| ECDH Public Key | Supabase `users.public_key` | Enable other parties to wrap keys for this user |
| AES Session Key | Never persisted in plaintext | Per-document encryption |
| Wrapped Keys | Supabase `document_secrets.encrypted_keys` (JSONB) | Encrypted AES keys per recipient |

---

## Off-Chain Storage

The protocol uses a minimal off-chain database (Supabase / PostgreSQL) to store **only non-sensitive metadata and encrypted key material**. No plaintext medical data is ever stored in the database.

### Database Schema (3 tables)

```
users
  ├── id (TEXT PK)              — Privy DID (did:privy:xxx)
  ├── wallet_address (UNIQUE)   — Embedded wallet (lowercase)
  ├── email, full_name
  ├── public_key (TEXT)         — ECDH P-256 public key (JWK)
  └── created_at

document_secrets
  ├── document_id (UNIQUE)      — IPFS CID
  ├── uploader_wallet (FK)      — Lab that uploaded
  ├── patient_wallet (FK)       — Patient owner
  ├── iv (VARCHAR)              — AES-GCM initialization vector
  ├── encrypted_keys (JSONB)    — { wallet: { data, iv } } per recipient
  └── created_at

permission_keys
  ├── document_id (FK)          — References document_secrets
  ├── patient_wallet (FK)       — Granting patient
  ├── grantee_wallet (FK)       — Receiving party
  ├── encrypted_key (TEXT)      — Re-wrapped AES key for grantee
  └── created_at
```

All role management, permissions, orders, and clinical episodes live **on-chain**. The database serves as a caching and key-distribution layer only.

---

## Role-Based Access

The frontend renders distinct dashboards based on the user's on-chain role, queried from the `IdentityRegistry` at login.

### Patient Dashboard

| Action | Description | Status |
|--------|-------------|--------|
| Share Results | Generate QR to grant access to a doctor or lab | Active |
| My Documents | View all documents where the patient is the owner | Active |
| Active Permissions | List and revoke granted permissions | Planned |
| Audit Log | View on-chain history of access events | Planned |

### Doctor Dashboard

| Action | Description | Status |
|--------|-------------|--------|
| Scan Patient QR | Scan QR to receive access and decrypt results | Active |
| Create Order | Issue a medical order linked to a clinical episode | Active |
| Clinical Episodes | Open, lookup, and close clinical episodes | Active |
| Admin Panel | Protocol administration (entities, pause) | Active |

### Laboratory Dashboard

| Action | Description | Status |
|--------|-------------|--------|
| Scan Patient QR | Receive patient access via QR scan | Active |
| Upload Results | Encrypt and upload exam results to IPFS | Active |
| Pending Orders | View assigned medical orders | Planned |
| Results History | Browse uploaded results | Planned |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Server Actions, React Compiler) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, Neumorphism design system |
| **Auth** | Privy (email, wallet, social login + embedded wallets) |
| **Blockchain** | Hygieia (Avalanche L1, chainId 21668), Solidity ^0.8.20 |
| **Client-Side Chain** | viem + wagmi |
| **Encryption** | Web Crypto API (AES-256-GCM, ECDH P-256, HKDF) |
| **File Storage** | IPFS via Pinata |
| **Database** | Supabase (PostgreSQL) |
| **i18n** | next-intl (English, Spanish) |
| **State** | Zustand |
| **Notifications** | Sileo |
| **Linter** | Biome |

---

## Project Structure

```
src/
├── actions/                  # Next.js Server Actions (on-chain + off-chain)
│   ├── register-entity-onchain.ts
│   ├── medical-orders-onchain.ts
│   ├── clinical-episodes-onchain.ts
│   ├── register-document-onchain.ts
│   ├── grant-permission-onchain.ts
│   ├── revoke-permission-onchain.ts
│   ├── list-users-by-onchain-role.ts
│   ├── save-document-secret.ts
│   ├── upload-to-ipfs.ts
│   └── ...
│
├── app/[locale]/
│   ├── page.tsx              # Landing page (storytelling + neumorphism)
│   ├── auth/page.tsx         # Role selection → Privy authentication
│   └── dashboard/
│       ├── page.tsx          # Role-aware dashboard (patient/doctor/lab)
│       ├── DashboardActions.tsx
│       ├── CreateOrderModal.tsx
│       ├── ManageEpisodeModal.tsx
│       ├── UploadResultsModal.tsx
│       ├── ShareResultsModal.tsx
│       ├── MyDocumentsModal.tsx
│       ├── ScanQRModal.tsx
│       └── AdminPanel.tsx
│
├── components/               # Shared UI components
├── features/                 # Domain feature modules
├── hooks/                    # Custom React hooks
│   ├── useOnChainRole.ts     # Read role from IdentityRegistry
│   ├── useRegisterIdentity.ts # Auto-register on-chain identity
│   ├── useSyncWallet.ts      # Sync embedded wallet to DB
│   └── useSyncKeys.ts        # Generate & store ECDH keys
│
├── lib/
│   ├── contracts.ts          # Contract addresses + chain config
│   ├── abis/                 # Contract ABIs (JSON)
│   └── supabase/             # Supabase client (admin + server)
│
├── services/
│   ├── encryption/           # ECDH, AES-GCM, key wrapping, rewrap
│   └── storage/              # IPFS upload, hybrid encrypted upload, download
│
├── state/                    # Zustand stores (auth, permissions, UI)
└── types/                    # TypeScript types (domain, API, blockchain)
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Blockchain — Hygieia L1
NEXT_PUBLIC_RPC_URL=http://18.223.252.59:9650/ext/bc/.../rpc
NEXT_PUBLIC_CHAIN_ID=21668
NEXT_PUBLIC_DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...

# Contract addresses (all NEXT_PUBLIC_*)
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PERMISSION_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_CLINICAL_EPISODE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_MEDICAL_ORDER_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_MEDICAL_DOCUMENT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_HEALTHCARE_NETWORK_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AUDIT_TRAIL_ADDRESS=0x...
NEXT_PUBLIC_HEALTH_PROOF_KERNEL_ADDRESS=0x...
NEXT_PUBLIC_HEALTH_PROOF_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_HEALTH_PROOF_PROTOCOL_ADDRESS=0x...

# IPFS
PINATA_JWT_SECRET=your_pinata_jwt
```

> **Security:** `DEPLOYER_PRIVATE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-side only and must never be exposed to the client.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in the required values

# 3. Run development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

### First-Time Setup

1. Register as a **Patient**, **Doctor**, or **Lab** on the auth page.
2. The system automatically creates an embedded wallet (Privy), registers your identity on-chain, and generates your ECDH key pair.
3. Your on-chain role determines which dashboard and actions are available.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run Biome linter |
| `npm run format` | Format code with Biome |

---

## Hygieia L1 Deployment

**Network:** Hygieia (Avalanche L1) — `chainId 21668`
**RPC:** `http://18.223.252.59:9650/ext/bc/kZYSkYiknAeZJbwtz4M6tN9YmbriGiLQwLKR4Pr7S2UEXQQuW/rpc`
**Currency:** HVE (18 decimals)
**Infrastructure:** AWS-hosted Avalanche node

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0xA0cB58636cFc93Ba57b687DD7A6b60B6ccd5932A` |
| GuardianRegistry | `0x76FBf209C3A5B15365949D1362f56fCf9D0700Ca` |
| PermissionManager | `0x1B1aa96212feb8718d6983D03633C15eaF92B1CF` |
| ClinicalEpisodeRegistry | `0x3807004AFa19A77EBbcD1e25dAA443F9b55A565d` |
| MedicalOrderRegistry | `0x3D02577e25EED5B66379820de3A0884862b32a1d` |
| MedicalDocumentRegistry | `0xFf47C63A4Cc9066029f1B1022eB240b9481F2d8c` |
| HealthcareNetworkRegistry | `0xBceB9cB593B6C63Afaa1a00aF594EA1A89d59943` |
| AuditTrail | `0xE54CFdACB9Cfb7A2838EAACcC1d0758a88379DC8` |
| HealthProofKernel | `0x00e3A9Fc92DD780906061112d83d8e7791fDbEDb` |
| HealthProofGateway | `0x263C15A7c1600472E2D12b1308d5845e2700fcaD` |
| HealthProofProtocol | `0x691b49CaE50E47CD07B8A4aA43594Fb16488ac25` |

---

<p align="center">
  <strong>HealthProof</strong> — Your data. Your keys. Your health.
</p>

---

## Hygieia L1 Contracts

IdentityRegistry: `0xA0cB58636cFc93Ba57b687DD7A6b60B6ccd5932A`
GuardianRegistry: `0x76FBf209C3A5B15365949D1362f56fCf9D0700Ca`
PermissionManager: `0x1B1aa96212feb8718d6983D03633C15eaF92B1CF`
ClinicalEpisodeRegistry: `0x3807004AFa19A77EBbcD1e25dAA443F9b55A565d`
MedicalOrderRegistry: `0x3D02577e25EED5B66379820de3A0884862b32a1d`
MedicalDocumentRegistry: `0xFf47C63A4Cc9066029f1B1022eB240b9481F2d8c`
HealthcareNetworkRegistry: `0xBceB9cB593B6C63Afaa1a00aF594EA1A89d59943`
AuditTrail: `0xE54CFdACB9Cfb7A2838EAACcC1d0758a88379DC8`
HealthProofKernel: `0x00e3A9Fc92DD780906061112d83d8e7791fDbEDb`
HealthProofGateway: `0x263C15A7c1600472E2D12b1308d5845e2700fcaD`
HealthProofProtocol: `0x691b49CaE50E47CD07B8A4aA43594Fb16488ac25`