# Infraestructura Hygieia (Avalanche L1) — HealthProof

Infraestructura blockchain del protocolo **HealthProof** sobre **Hygieia** (Avalanche L1). Incluye contratos inteligentes modulares, configuración de red y scripts de deployment.

---

## Índice

- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Contratos](#contratos)
- [Configuración de red](#configuración-de-red)
- [Deployment](#deployment)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Quick Start](#quick-start)

---

## Arquitectura

El protocolo utiliza un **patrón Kernel** modular:

```
                    ┌─────────────────────┐
                    │  HealthProofGateway │  ← Punto de entrada (usuarios/dApps)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  HealthProofKernel  │  ← Registro de módulos, pause, governance
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    EPISODE_MODULE       ORDER_MODULE         DOCUMENT_MODULE    PERMISSION_MODULE
         │                     │                     │                     │
         ▼                     ▼                     ▼                     ▼
 ClinicalEpisodeRegistry  MedicalOrderRegistry  MedicalDocumentRegistry  PermissionManager
```

- **HealthProofGateway**: Punto de entrada único. Enruta llamadas a los módulos registrados en el Kernel.
- **HealthProofKernel**: Administra módulos, pausa del protocolo y roles (admin, governance, guardian).
- **HealthProofProtocol**: Orquestador alternativo que coordina permisos, documentos y auditoría.

---

## Estructura del proyecto

```
infra/avalanche/
├── README.md                 # Este archivo
├── network/                  # Configuración L1 y Subnet
│   ├── hygieia.config.json  # Hygieia L1 (chainId 21668)
│   └── subnet-config.json   # Subnet-EVM (consensus, proposer)
│
└── contracts/               # Smart contracts del protocolo
    ├── src/
    │   ├── core/            # Núcleo del protocolo
    │   │   ├── HealthProofKernel.sol
    │   │   ├── HealthProofGateway.sol
    │   │   └── HealthProofProtocol.sol
    │   ├── identity/        # Identidad y tutores
    │   │   ├── IdentityRegistry.sol
    │   │   └── GuardianRegistry.sol
    │   ├── access/          # Permisos
    │   │   └── PermissionManager.sol
    │   ├── clinical/        # Datos clínicos
    │   │   ├── ClinicalEpisodeRegistry.sol
    │   │   ├── MedicalOrderRegistry.sol
    │   │   └── MedicalDocumentRegistry.sol
    │   ├── network/         # Red de salud
    │   │   └── HealthcareNetworkRegistry.sol
    │   ├── audit/           # Auditoría
    │   │   └── AuditTrail.sol
    │   └── interfaces/     # Interfaces compartidas
    │       ├── IIdentityRegistry.sol
    │       ├── IPermissionManager.sol
    │       ├── IMedicalDocumentRegistry.sol
    │       └── IAuditTrail.sol
    ├── deploy/              # Script de deployment legacy
    │   └── deploy.ts
    ├── scripts/             # Scripts de deployment production-grade
    │   └── deployHealthProof.ts
    ├── test/                # Tests (Hardhat)
    ├── hardhat.config.ts
    └── package.json
```

---

## Contratos

| Contrato | Descripción | Dependencias |
|----------|-------------|--------------|
| **IdentityRegistry** | Registro de entidades (pacientes, médicos, instituciones) y verificación | — |
| **GuardianRegistry** | Gestión de tutores legales | IdentityRegistry |
| **PermissionManager** | Permisos de acceso a recursos médicos | IdentityRegistry, GuardianRegistry |
| **ClinicalEpisodeRegistry** | Episodios clínicos | IdentityRegistry |
| **MedicalOrderRegistry** | Órdenes médicas (laboratorio, estudios) | IdentityRegistry |
| **MedicalDocumentRegistry** | Documentos médicos y metadatos | IdentityRegistry |
| **HealthcareNetworkRegistry** | Red de instituciones de salud | — |
| **AuditTrail** | Trazabilidad y auditoría de eventos | — |
| **HealthProofKernel** | Núcleo: módulos, pause, governance | admin, governance, guardian |
| **HealthProofGateway** | Punto de entrada al protocolo | HealthProofKernel |
| **HealthProofProtocol** | Orquestador de permisos, documentos y auditoría | PermissionManager, MedicalDocumentRegistry, AuditTrail |

### Módulos del Kernel

| Module ID | Contrato |
|-----------|----------|
| `EPISODE_MODULE` | ClinicalEpisodeRegistry |
| `ORDER_MODULE` | MedicalOrderRegistry |
| `DOCUMENT_MODULE` | MedicalDocumentRegistry |
| `PERMISSION_MODULE` | PermissionManager |

---

## Configuración de red

### Red objetivo: Hygieia (L1)

- **Network name**: `Hygieia`
- **RPC**: `http://3.141.110.34:9654/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc`
- **Chain ID**: `21668`
- **Currency symbol**: `HVE`

### `network/subnet-config.json`

Configuración para **Subnet-EVM**:

- Parámetros de consenso (k, alpha, beta, etc.)
- Parámetros del proposer
- `validatorOnly: false` — permite nodos no validadores

---

## Deployment

### Prerrequisitos

- Node.js 18+
- Cuenta con saldo en HVE para gas
- Clave privada del deployer

### Variables de entorno

Crea un archivo `.env` en `contracts/`:

```env
PRIVATE_KEY=0x...          # Clave privada del deployer (sin 0x opcional)
HYGIEIA_RPC_URL=http://3.141.110.34:9654/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc   # Opcional, hay valor por defecto
```

### Opciones de deployment

| Script | Red | Descripción |
|--------|-----|-------------|
| `deploy:healthproof` | Hardhat (in-memory) | Deployment local para pruebas |
| `deploy:healthproof:hygieia` | Hygieia L1 | Deployment en red objetivo |
| `deploy:healthproof:local` | localhost:8545 | Nodo Hardhat local |
| `deploy` / `deploy:hygieia` | Legacy | Script `deploy/deploy.ts` |

### Orden de deployment (automático)

1. IdentityRegistry, GuardianRegistry, PermissionManager  
2. ClinicalEpisodeRegistry, MedicalOrderRegistry, MedicalDocumentRegistry  
3. HealthcareNetworkRegistry, AuditTrail  
4. HealthProofKernel  
5. HealthProofProtocol, HealthProofGateway  
6. Registro de módulos en el Kernel  
7. Bootstrap: deployer como ADMIN en IdentityRegistry  

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PRIVATE_KEY` | Sí (Hygieia/local) | Clave privada del deployer |
| `HYGIEIA_RPC_URL` | No | RPC de Hygieia (default: valor del config) |

---

## Scripts disponibles

```bash
cd infra/avalanche/contracts
```

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compila contratos (Hardhat) |
| `npm run test` | Ejecuta tests (ver [TEST.md](contracts/TEST.md) para guía) |
| `npm run clean` | Limpia cache y artifacts |
| `npm run deploy:healthproof` | Deployment completo (Hardhat) |
| `npm run deploy:healthproof:hygieia` | Deployment en Hygieia L1 |
| `npm run deploy:healthproof:local` | Deployment en localhost |
| `npm run deploy` | Deployment legacy (Hardhat) |
| `npm run deploy:hygieia` | Deployment legacy (Hygieia) |
| `npm run deploy:local` | Deployment legacy (localhost) |

---

## Quick Start

```bash
# 1. Instalar dependencias
cd infra/avalanche/contracts
npm install

# 2. Compilar
npm run build

# 3. Deployment local (Hardhat in-memory)
npm run deploy:healthproof

# 4. Deployment en Hygieia (requiere PRIVATE_KEY y saldo HVE)
# Crear .env con PRIVATE_KEY=0x...
npm run deploy:healthproof:hygieia
```

### Fondear wallet en Hygieia

1. Usa el mecanismo de fondeo definido para tu L1 (bridge/faucet interno/transferencia).
2. Verifica saldo antes de desplegar.

---

## Stack técnico

- **Solidity** ^0.8.20
- **Hardhat** ^2.19
- **ethers.js** v6
- **TypeScript** ^5.3
- **Hygieia** (Avalanche L1, chainId 21668)

---

## Referencias

- [Avalanche Docs](https://docs.avax.network/)
- [Subnet-EVM](https://docs.avax.network/subnets/evm-chain)
