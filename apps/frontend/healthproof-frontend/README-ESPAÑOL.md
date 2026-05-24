# HealthProof — Infraestructura Verificable de Datos de Salud

HealthProof es una **infraestructura Web3 de verificación e interoperabilidad médica** que permite a pacientes, laboratorios y prestadores de salud en Chile intercambiar documentos médicos de forma segura, preservando la **soberanía del paciente, la confidencialidad de los datos y el cumplimiento legal**.

El protocolo combina **encriptación híbrida del lado del cliente (ECDH + AES-GCM), infraestructura blockchain soberana (Avalanche L1) y almacenamiento distribuido** para garantizar que los registros médicos permanezcan privados, portables e interoperables entre instituciones.

**Contexto legal:** HealthProof está diseñado para cumplir con la **Ley 21.668** de Chile (publicada el 28 de mayo de 2024), que modifica la Ley 20.584 para establecer la **interoperabilidad de las fichas clínicas** entre prestadores públicos y privados. La ley exige que los prestadores adopten medidas que habiliten la interoperabilidad, garanticen la continuidad de la atención del paciente y aseguren la protección y conservación adecuada de los registros por al menos 15 años.

---

# Tabla de Contenidos

- [Visión](#visión)
- [Cumplimiento Legal (Chile)](#cumplimiento-legal-chile)
- [Resumen de Arquitectura](#resumen-de-arquitectura)
  - [Capa Cliente](#capa-cliente)
  - [Capa Protocolo](#capa-protocolo)
  - [Capa de Seguridad y Encriptación](#capa-de-seguridad-y-encriptación)
  - [Capa de Almacenamiento](#capa-de-almacenamiento)
  - [Capa Blockchain (Hygieia L1)](#capa-blockchain-hygieia-l1)
- [Profundización en la Encriptación](#profundización-en-la-encriptación)
- [Autenticación (Privy)](#autenticación-privy)
- [Smart Contracts](#smart-contracts)
- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Meta-Transacciones (EIP-2771)](#meta-transacciones-eip-2771)
- [Guardianes y Recuperación de Claves](#guardianes-y-recuperación-de-claves)
- [Interoperabilidad y Nodos Distribuidos (Hoja de Ruta)](#interoperabilidad-y-nodos-distribuidos-hoja-de-ruta)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Monorepo](#estructura-del-monorepo)
- [Variables de Entorno](#variables-de-entorno)
- [Inicio Rápido](#inicio-rápido)
- [Direcciones de Contratos](#direcciones-de-contratos)
- [Hoja de Ruta](#hoja-de-ruta)

---

# Visión

Los sistemas de salud actuales sufren de problemas estructurales críticos:

- **Historias clínicas fragmentadas**: Un paciente con enfermedad crónica tiene su historia dispersa en clínicas, laboratorios y hospitales.
- **Falta de interoperabilidad**: Las instituciones no pueden compartir datos esenciales para garantizar la continuidad de la atención.
- **Control limitado del paciente**: Los pacientes no deciden quién accede a sus datos sensibles ni por cuánto tiempo.
- **Brechas de residencia de datos**: Los datos médicos a menudo salen del territorio nacional, violando la soberanía y los requisitos legales.

HealthProof introduce un nuevo paradigma:

> **Los pacientes se convierten en los controladores soberanos de sus registros médicos mediante el dominio criptográfico de sus claves, mientras que los prestadores de salud pueden verificar documentos médicos e interoperar sin depender de intermediarios centralizados o infraestructura extranjera.**

---

# Cumplimiento Legal (Chile)

## Ley 21.668 — Interoperabilidad de las Fichas Clínicas

Publicada en el *Diario Oficial* el **28 de mayo de 2024**, la Ley 21.668 modifica la Ley 20.584 (Derechos y Deberes de las Personas en relación con la Atención de Salud) para establecer:

### Mandatos Legales Clave

| Mandato | Implementación en HealthProof |
|---------|-------------------------------|
| **Interoperabilidad entre prestadores** | Red de nodos distribuidos con replicación encriptada; cada prestador opera un nodo que replica los datos que está autorizado a acceder. |
| **Continuidad de la atención del paciente** | Concesión de permisos en tiempo real mediante `PermissionManager` on-chain; acceso de emergencia (*break-the-glass*) para escenarios críticos. |
| **Conservación de datos (15 años)** | Cada nodo se compromete con la replicación a largo plazo; `document_secrets` incluye mapeo de `storage_node` para trazabilidad. |
| **Protección y confidencialidad adecuadas** | Encriptación ECDH + AES-GCM del lado del cliente; los documentos son ilegibles para cualquier nodo o atacante sin la clave privada del paciente. |
| **Custodia por cada prestador** | Cada prestador (laboratorio, clínica) almacena solo los documentos que emite, cumpliendo el requisito legal de que cada uno custodia sus propios registros. |
| **Acceso a datos esenciales para continuidad de atención** | El sistema de permisos permite a los médicos solicitar y a los pacientes conceder acceso a documentos específicos o episodios completos. |

### Brecha Regulatoria por Cerrar

El Ministerio de Salud tiene **18 meses** (hasta noviembre de 2025) para publicar la regulación técnica que detalla la "forma y condiciones" de la interoperabilidad. HealthProof se posiciona como una **implementación de referencia** para un estándar distribuido, preservador de la privacidad y soberano.

---

# Resumen de Arquitectura

HealthProof sigue una **arquitectura de protocolo multicapa**, separando la interacción clínica, la seguridad criptográfica, el almacenamiento distribuido y la verificación blockchain.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA CLIENTE                                │
│  Next.js 16 App · Privy Auth · i18n (es/en) · Neumorphism UI   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   CAPA PROTOCOLO                                │
│  Identity · Permissions · Documents · Episodes · Orders · Audit │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│              CAPA DE SEGURIDAD Y ENCRIPTACIÓN                   │
│  ECDH P-256 · AES-GCM · HKDF · IndexedDB · Key Backup/Recovery  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE ALMACENAMIENTO                       │
│  Encrypted blobs · IPFS/Pinata (actual) · Private nodes (futuro)│
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│              CAPA BLOCKCHAIN (Hygieia L1)                       │
│  IdentityRegistry · PermissionManager · GuardianRegistry · ...│
│  UUPS Proxies · EIP-2771 Meta-TX · Moneda nativa: HVE          │
└─────────────────────────────────────────────────────────────────┘
```

## Capa Cliente

El **Cliente Clínico HealthProof** (`apps/frontend/healthproof-frontend`) provee interfaces basadas en roles para:

- **Pacientes**: Ver documentos, conceder/revocar permisos, gestionar guardianes, escanear códigos QR.
- **Médicos**: Emitir órdenes médicas, solicitar acceso a documentos, verificar permisos.
- **Laboratorios**: Recibir órdenes, subir resultados de exámenes, compartir mediante QR.
- **Instituciones / Centros Médicos**: Gestionar personal, verificar participantes de la red.

Los usuarios se autentican mediante **Privy** (OTP por correo, Google OAuth, o wallets externas como MetaMask). El sistema genera automáticamente un par de claves ECDH P-256 en el primer inicio de sesión y almacena la clave privada en IndexedDB del navegador.

## Capa Protocolo

Los módulos de dominio principales viven bajo `src/features/` y `src/actions/`:

| Módulo | Responsabilidad |
|--------|-----------------|
| `features/permissions` | Generación de QR, construcción de payloads de permiso, concesión/revocación on-chain |
| `features/documents` | Listado de documentos, recuperación de metadatos |
| `features/medical-orders` | Crear orden, listar órdenes, obtener resultados |
| `actions/*-onchain.ts` | Server Actions que interactúan con Hygieia vía Wagmi + Viem |
| `actions/permissions/*` | Flujo de invitación (enviar/aceptar/rechazar/cancelar), claves de permiso |
| `actions/auth/*` | Búsqueda de usuario, recuperación de clave pública, gestión de respaldos |

## Capa de Seguridad y Encriptación

Ver [Profundización en la Encriptación](#profundización-en-la-encriptación).

## Capa de Almacenamiento

Actualmente, los documentos médicos encriptados se suben a **Pinata IPFS** (red IPFS pública). Esta es una **arquitectura transicional**.

**Migración planificada (Fase 1):** Reemplazar Pinata con **almacenamiento de objetos privado** (compatible S3 o MinIO) alojado en Chile para cumplir con la residencia de datos.

**Visión a largo plazo (Fase 3):** Cada prestador de salud opera su propio **nodo IPFS private-swarm / libp2p**. Los documentos se replican a través de la red nacional de salud, pero solo viajan los blobs encriptados; las claves de descifrado nunca salen del control del paciente.

## Capa Blockchain (Hygieia L1)

**Hygieia** es la Layer 1 propia de HealthProof sobre Avalanche (Subnet), desplegada mediante `avalanche-cli`.

| Parámetro | Valor |
|-----------|-------|
| **Chain ID** | `21668` |
| **Moneda nativa** | `HVE` |
| **VM** | Subnet-EVM |
| **Despliegue** | Nodo hospedado en AWS, RPC en Chile |
| **Consenso** | Avalanche (validadores de subnet proof-of-stake) |

### ¿Por qué una L1 dedicada?

1. **Soberanía**: El historial de transacciones, el registro de identidades y la trazabilidad de auditoría permanecen en infraestructura controlada por la red de salud chilena.
2. **Rendimiento**: Finalidad rápida (~1s) y tarifas bajas, adecuadas para el alto throughput de órdenes médicas y permisos.
3. **Cumplimiento**: Sin dependencia de L1s extranjeros; las auditorías regulatorias pueden inspeccionar la cadena directamente.
4. **Fundamento de interoperabilidad**: Los smart contracts gobiernan qué nodos están autorizados a unirse a la red (`HealthcareNetworkRegistry`).

---

# Profundización en la Encriptación

HealthProof utiliza un **esquema de encriptación híbrida** que combina la **Web Crypto API** con identidad on-chain:

## 1. Generación de Claves (ECDH P-256)

En la primera autenticación, el navegador genera un par de claves ECDH P-256 no extraíble:

```
Clave Pública  → exportada como JWK → guardada en DB (users.public_key)
Clave Privada  → CryptoKey no extraíble → guardada en IndexedDB
```

La clave privada está marcada como `non-extractable` (Web Crypto), lo que significa que ningún JavaScript (incluyendo XSS malicioso) puede exportarla en formato raw.

## 2. Encriptación de Documentos (AES-GCM)

Cuando un laboratorio sube un documento:

1. **Generar clave de sesión AES-256-GCM** (aleatoria, una por documento).
2. **Encriptar el archivo** con AES-GCM → produce ciphertext + IV.
3. **Wrap de la clave de sesión** para cada destinatario autorizado usando ECDH:
   - Derivar secreto compartido entre la clave privada del laboratorio y la clave pública del paciente (ECDH).
   - Derivar clave de wrapping vía HKDF-SHA-256.
   - Wrap de la clave de sesión AES → `encrypted_key`.
4. **Almacenamiento**:
   - Blob encriptado → capa de almacenamiento (IPFS / nodo futuro).
   - Fila `document_secrets` → `document_id`, `uploader_wallet`, `patient_wallet`, `iv`, `encrypted_keys` JSONB.

## 3. Desencriptación de Documentos

Cuando un paciente (o médico autorizado) descarga:

1. Obtener el blob encriptado desde almacenamiento.
2. Obtener la fila `document_secrets` → obtener `iv` y `encrypted_keys[myWallet]`.
3. Usar la **clave privada ECDH del paciente** (desde IndexedDB) para derivar el secreto compartido con la clave pública del uploader.
4. HKDF → unwrap de la clave de sesión AES.
5. AES-GCM decrypt → documento original.

## 4. Compartir (Re-wrap)

Cuando un paciente comparte con un médico:

1. El paciente usa su clave privada + la clave pública del médico para re-encapsular (re-wrap) la clave de sesión AES.
2. El nuevo `encrypted_key` se guarda en la tabla `permission_keys` y/o se incluye en un código QR.
3. `PermissionManager.grantPermission` on-chain registra la autorización.

## 5. Respaldo y Recuperación de Claves

Para prevenir el bloqueo al cambiar de dispositivo:

- En el primer inicio de sesión, la clave privada ECDH se **exporta temporalmente** (como JWK), se encripta con PBKDF2+AES-GCM usando una clave derivada de `userId + SHAMIR_ENCRYPTION_KEY`, y se almacena en la DB como `users.encrypted_private_key`.
- En un nuevo navegador/dispositivo: detectar IndexedDB vacío → intentar recuperación automática desde el respaldo.
- **Prevención de Conflicto de Claves**: Si el usuario tiene documentos encriptados (`document_secrets`) pero las claves de IndexedDB no coinciden, un `KeyConflictBanner` global advierte y bloquea subidas/shares hasta que se resuelva.

> **Nota:** El verdadero **Shamir Secret Sharing** (criptografía de umbral dividiendo la clave entre múltiples guardianes) es una **mejora futura** planificada para integrar con `GuardianRegistry`. El respaldo actual es almacenamiento encriptado de una sola parte.

---

# Autenticación (Privy)

HealthProof migró de Supabase Auth a **Privy** (`@privy-io/react-auth`).

## Métodos de Inicio de Sesión Soportados

- **Correo + OTP**: El usuario recibe un código único por correo. Privy crea automáticamente una wallet Ethereum embebida basada en MPC.
- **Google OAuth**: Inicio de sesión social con un clic; wallet embebida creada automáticamente.
- **Wallet Externa**: El usuario conecta una wallet existente (MetaMask, Rainbow, etc.) vía el modal de wallets de Privy.

## Wallets Embebidas (MPC)

```tsx
// providers.tsx
embeddedWallets: {
  ethereum: {
    createOnLogin: "users-without-wallets",
  },
}
```

Las wallets embebidas de Privy usan **Multi-Party Computation (MPC)**: la clave privada se divide en shards distribuidos entre Privy, el dispositivo del usuario y (opcionalmente) un servicio de recuperación. Ninguna parte única posee la clave completa.

### Realidad Custodial vs. No Custodial

- **Wallets embebidas**: Ofrecen gran UX (sin frase semilla) pero el usuario no posee la clave privada completa.
- **Wallets externas** (MetaMask): Son completamente no custodiales: el usuario posee la frase semilla y la clave nunca toca los servidores de Privy.
- **Soberanía de datos** en HealthProof se aplica en la **capa de encriptación ECDH**, no en la capa de wallet. Incluso si Privy desapareciera, un paciente con su clave privada ECDH (respaldada o recuperada) aún puede desencriptar sus documentos médicos.

## Futuro: Ruta de Migración de Wallet

Una característica planificada permitirá a los usuarios que comenzaron con una wallet embebida **vincular y migrar a una wallet externa** mientras preservan su identidad, permisos on-chain e historial de datos encriptados.

---

# Smart Contracts

Todos los contratos son **UUPS Upgradeable Proxies** desplegados en Hygieia (Avalanche L1, `chainId 21668`).

| Contrato | Rol |
|----------|-----|
| `IdentityRegistry` | Identidad basada en roles (PATIENT, DOCTOR, LAB, INSTITUTION, ADMIN). `hasRole()`, `grantRole()`, `revokeRole()`. |
| `GuardianRegistry` | Designación de guardianes para pacientes. Usado para futura recuperación de claves y delegación de acceso de emergencia. |
| `PermissionManager` | Búsquedas de permiso O(1). `grantPermission()`, `revokePermission()`, `hasAccess()`. |
| `ClinicalEpisodeRegistry` | Agrupación de órdenes médicas y documentos bajo un único episodio clínico. |
| `MedicalOrderRegistry` | Emisión de órdenes médicas por médicos, asignación a laboratorios. |
| `MedicalDocumentRegistry` | Registro de metadatos de documentos (hashes, URIs). |
| `HealthcareNetworkRegistry` | Registro de instituciones de salud autorizadas y sus nodos. |
| `AuditTrail` | Registro de eventos inmutable: creación de orden, subida de documento, concesión/revocación de permisos. |
| `HealthProofKernel` | Coordinador central del protocolo. |
| `HealthProofGateway` | Punto de entrada proxy para meta-transacciones sin gas y acciones con verificación de rol. |
| `HealthProofProtocol` | Orquestación de alto nivel del protocolo. |
| `TrustedForwarder` | Forwarder de confianza EIP-2771 para meta-transacciones. |

### Meta-Transacciones (EIP-2771)

Los usuarios firman transacciones off-chain (sin gas). Un relayer (desplegador o servicio dedicado) las envía vía `TrustedForwarder`. El contrato destino extrae la dirección del firmante original de la firma adjunta.

Esto es esencial para pacientes que usan wallets embebidas y pueden no poseer tokens HVE de gas.

---

# Esquema de Base de Datos

HealthProof usa **Supabase (PostgreSQL)** para datos estructurados. Roles, permisos y eventos de auditoría viven on-chain; la base de datos almacena metadatos de encriptación y perfiles de usuario.

## Tablas (Actual — 3 Tablas)

### 1. `users`

```sql
id TEXT PRIMARY KEY,           -- Privy DID (did:privy:...)
wallet_address TEXT UNIQUE,   -- Dirección Ethereum
email TEXT,
full_name TEXT,
public_key TEXT,              -- JWK de la clave pública ECDH
encrypted_private_key TEXT,   -- Respaldo encriptado PBKDF2+AES-GCM
created_at TIMESTAMPTZ
```

> `role` fue eliminado de la DB y ahora vive **on-chain** en `IdentityRegistry`.

### 2. `document_secrets`

```sql
id UUID PRIMARY KEY,
document_id VARCHAR UNIQUE,       -- CID o ruta de almacenamiento
file_name TEXT,                   -- Nombre legible por humanos
uploader_wallet TEXT REFERENCES users(wallet_address),
patient_wallet TEXT REFERENCES users(wallet_address),
iv TEXT,                          -- Vector de inicialización AES-GCM
encrypted_keys JSONB,             -- { wallet_address: wrapped_key }
uploader_public_key TEXT,         -- JWK de la clave pública del uploader al momento de subir
created_at TIMESTAMPTZ
```

### 3. `permission_keys`

```sql
id UUID PRIMARY KEY,
document_id TEXT REFERENCES document_secrets(document_id),
patient_wallet TEXT REFERENCES users(wallet_address),
grantee_wallet TEXT REFERENCES users(wallet_address),
encrypted_key TEXT,               -- Clave de sesión AES re-encapsulada para el grantee
created_at TIMESTAMPTZ,
UNIQUE(document_id, grantee_wallet)
```

### Adiciones Futuras

- **Columna `storage_node`** en `document_secrets`: rastrea qué nodo físico (endpoint IPFS/libp2p) aloja el blob encriptado.
- **Tabla `invitations`**: rastrea invitaciones de permiso pendientes antes de la ejecución on-chain (ya implementada vía server actions).

---

# Meta-Transacciones (EIP-2771)

```typescript
// 1. Usuario firma off-chain
const signed = await signMetaTransaction(
  walletClient,
  CONTRACT_ADDRESSES.PermissionManager,
  "grantPermission",
  [patientWallet, granteeWallet, scope, resourceId, expiry],
  PermissionManagerAbi
);

// 2. Servidor relaya
const result = await grantPermissionOnChain({ request, ...payload });
```

**Beneficios:**
- Los pacientes no necesitan tokens HVE.
- Los usuarios de wallet embebida experimentan UX sin gas.
- El relayer paga el gas, subsidiado por la red o la institución.

---

# Guardianes y Recuperación de Claves

## GuardianRegistry (On-Chain)

Los pacientes pueden designar **guardianes** (familiares de confianza o médicos) que obtienen autoridad limitada:

- **Futuro**: Participar en la **recuperación por umbral Shamir Secret Sharing** (ej. 2-de-3 guardianes necesarios para reconstruir la clave privada ECDH del paciente si pierde todos los dispositivos).
- **Acceso de emergencia**: Un guardián puede activar una solicitud de permiso de emergencia con time-lock, registrada inmutablemente en `AuditTrail`.

## Prevención de Conflicto de Claves

El sistema previene la regeneración accidental de claves ECDH cuando existen datos encriptados:

```
Claves IndexedDB coinciden con DB public_key → OK
IndexedDB vacío + DB tiene clave + documentos existen → conflicto (missing_local_keys)
Claves IndexedDB difieren + documentos existen → conflicto (key_mismatch)
```

El `KeyConflictBanner` global bloquea subidas/shares hasta que el usuario resuelva el conflicto vía `KeyRecoveryModal`.

---

# Interoperabilidad y Nodos Distribuidos (Hoja de Ruta)

Esta es la **visión de Fase 3-4** de HealthProof y aborda directamente la **Ley 21.668**.

## Estado Actual (Fase 0)

- Documentos encriptados almacenados en **IPFS público vía Pinata**.
- Todos los nodos (frontend + backend) se conectan a un único proveedor de almacenamiento.
- Los datos salen del territorio chileno (DHT global de IPFS).

## Fase 1 — Almacenamiento Privado en Chile

Reemplazar Pinata con **buckets compatibles S3 o MinIO** hospedados en servidores chilenos. Los blobs encriptados nunca salen del territorio nacional. Esto satisface el cumplimiento inmediato de residencia de datos.

## Fase 2 — Endpoints de Propiedad Institucional

Cada clínica o laboratorio configura su propio endpoint de almacenamiento:

```sql
ALTER TABLE document_secrets ADD COLUMN storage_node TEXT;
```

- El Laboratorio A almacena sus documentos en `node-a.healthproof.cl`.
- El paciente accede a ellos vía el frontend de HealthProof, que enruta la solicitud de descarga al nodo correcto.
- El nodo solo sirve el **blob encriptado**; no puede desencriptarlo.

## Fase 3 — Red P2P Privada de Salud

Implementar un **IPFS private swarm** o **red permisionada libp2p**:

- Solo nodos registrados en `HealthcareNetworkRegistry` pueden unirse.
- La identidad del nodo está vinculada a un rol `INSTITUTION` on-chain.
- Los documentos encriptados se replican a través de la red (ej. 3 copias: nodo emisor + caché del paciente + archivo regional).
- El contenido nunca se anuncia al DHT público de IPFS.

## Fase 4 — Grilla Nacional de Interoperabilidad

- Cada prestador de salud certificado en Chile opera un nodo HealthProof.
- El nodo valida sus propios datos (firmas digitales del emisor) y replica datos de pares bajo SLAs codificados on-chain.
- Los pacientes tienen una **vista unificada única** de su historia clínica, agregada de todos los nodos, desencriptada localmente con su clave privada.
- El Ministerio de Salud puede auditar la red vía `AuditTrail` en Hygieia sin acceder a los datos del paciente.

### Interoperabilidad sin Centralización

| Enfoque Tradicional | Enfoque Distribuido HealthProof |
|---------------------|---------------------------------|
| Base de datos nacional única (monopolio, honeypot) | Cada prestador custodia sus propios datos (cumple Ley 21.668) |
| Exportes no encriptados o débilmente encriptados | Encriptación end-to-end ECDH; los nodos solo almacenan ciphertext |
| Integraciones punto a punto complejas HL7/FHIR | Protocolo estandarizado vía smart contracts + replicación de blobs encriptados |
| El paciente no tiene trazabilidad de auditoría | Cada acceso registrado inmutablemente on-chain |

---

# Stack Tecnológico

## Frontend

| Tecnología | Propósito |
|------------|-----------|
| Next.js 16 (App Router) | Framework React con Server Actions |
| TypeScript | Seguridad de tipos |
| TailwindCSS + neumorfismo personalizado | Estilos de UI |
| Sileo | Notificaciones toast |
| `next-intl` | i18n (Español / Inglés) |
| Zustand | Estado global (auth, permisos, UI, conflictos de clave) |
| React Query | Caché de estado del servidor |

## Web3

| Tecnología | Propósito |
|------------|-----------|
| Privy (`@privy-io/react-auth`) | Autenticación + wallets embebidas/externas |
| Wagmi | Hooks React para Ethereum |
| Viem | Librería moderna TypeScript para Ethereum (wallet client, encoding) |
| `qrcode.react` | Generación de códigos QR para compartir permisos |

## Encriptación

| Tecnología | Propósito |
|------------|-----------|
| Web Crypto API (`crypto.subtle`) | ECDH P-256, AES-GCM, HKDF, PBKDF2 |
| IndexedDB | Almacenamiento de clave privada no extraíble |

## Blockchain

| Tecnología | Propósito |
|------------|-----------|
| Hardhat | Desarrollo de smart contracts, testing, despliegue |
| OpenZeppelin UUPS | Patrón de proxy actualizable |
| EIP-2771 | Estándar de meta-transacción |
| Avalanche-CLI | Despliegue de L1 / Subnet |

## Backend y Base de Datos

| Tecnología | Propósito |
|------------|-----------|
| Supabase (PostgreSQL) | Datos estructurados: users, document_secrets, permission_keys |
| Pinata (transicional) | IPFS pinning para blobs encriptados |
| Server Actions (Next.js) | Lógica de backend segura sin capa de API separada |

---

# Estructura del Monorepo

```
healthproof/
├── apps/
│   ├── backend/              # (futuro) servicios backend dedicados
│   └── frontend/
│       └── healthproof-frontend/   # Aplicación Next.js 16
│           ├── src/
│           │   ├── app/[locale]/      # Ruteo i18n (es, en)
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
│           │   ├── features/        # Módulos de dominio
│           │   ├── hooks/           # React hooks (auth, keys, sync)
│           │   ├── lib/             # Utilidades, env, contracts, metatx
│           │   ├── services/        # Encriptación, almacenamiento, API
│           │   ├── state/           # Stores Zustand
│           │   └── types/           # Tipos de dominio y API
│           ├── messages/en.json
│           ├── messages/es.json
│           └── public/
├── infra/
│   └── avalanche/
│       ├── contracts/           # Smart contracts Solidity
│       │   ├── src/
│       │   └── test/
│       └── network/             # Configuración de subnet
├── packages/
│   ├── blockchain-sdk/          # Utilidades blockchain compartidas
│   ├── contracts/               # ABIs de contratos y scripts de despliegue
│   ├── did/                     # Utilidades DID
│   └── encryption/              # Helpers de encriptación compartidos
├── docs/
│   └── architecture-debt-v1.2.md
└── supabase_migrations/         # Migraciones SQL
```

---

# Variables de Entorno

Crea un archivo `.env` en `apps/frontend/healthproof-frontend/`:

```bash
# Autenticación Privy
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Supabase (solo base de datos — auth gestionado por Privy)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Pinata / Almacenamiento (Fase 0 — migrará a almacenamiento privado)
PINATA_JWT_SECRET=your-pinata-jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://your-gateway.mypinata.cloud

# Blockchain
NEXT_PUBLIC_RPC_URL=http://your-hygieia-node:9654/ext/bc/.../rpc
NEXT_PUBLIC_CHAIN_ID=21668

# Direcciones de Contratos (Hygieia L1)
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

# Secretos del servidor
DEPLOYER_PRIVATE_KEY=0x...
SHAMIR_ENCRYPTION_KEY=your-shamir-key
```

---

# Inicio Rápido

## Prerrequisitos

- Node.js 20+
- pnpm (recomendado) o npm
- Git

## Instalación

```bash
git clone https://github.com/jpgsChile/healthproof
cd healthproof
pnpm install
```

## Configurar Entorno

```bash
cd apps/frontend/healthproof-frontend
cp .env.example .env
# Completa todas las variables requeridas
```

## Ejecutar Servidor de Desarrollo

```bash
pnpm dev
# o
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
```

## Desarrollo de Smart Contracts

```bash
cd infra/avalanche/contracts
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deployHealthProofUUPS.ts --network hygieia
```

---

# Direcciones de Contratos

## Hygieia L1 (Producción / Staging)

**RPC:** `http://3.141.110.34:9654/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc`  
**Chain ID:** `21668`  
**Desplegador:** `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC`

| Contrato | Dirección Proxy |
|----------|-----------------|
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

> **Nota:** Los contratos son UUPS actualizables. Las direcciones de implementación se rastrean por separado.

---

# Hoja de Ruta

## Completado

- [x] Sistema de encriptación híbrida ECDH P-256
- [x] Respaldo y recuperación de claves (PBKDF2 + IndexedDB)
- [x] Prevención de conflicto de claves (Zustand store + banner)
- [x] Autenticación Privy (correo, Google, wallet)
- [x] Despliegue de Hygieia Avalanche L1
- [x] Suite de smart contracts UUPS (Identity, Permission, Guardian, Episode, Order, Document registries)
- [x] Meta-transacciones EIP-2771 (UX sin gas)
- [x] Dashboard basado en roles (Paciente, Doctor, Laboratorio, Institución, Admin)
- [x] Flujo de invitación de permisos (enviar / aceptar / rechazar / cancelar)
- [x] Compartir permisos mediante código QR
- [x] Sistema de diseño Neumorfismo
- [x] i18n (Español / Inglés)

## En Progreso

- [ ] Corregir registro on-chain de email/OTP (actualmente solo el login con Google registra correctamente)
- [ ] Migrar almacenamiento de Pinata/IPFS público → almacenamiento privado hospedado en Chile
- [ ] Agregar columna `storage_node` a `document_secrets`
- [ ] Implementar acceso de emergencia *break-the-glass* (cumplimiento con continuidad de atención urgente de la Ley 21.668)

## Corto Plazo

- [ ] Vinculación y migración de wallets (embebida → externa)
- [ ] Concesión de permisos multi-documento (selección múltiple en UI)
- [ ] Notificaciones push para invitaciones de permiso
- [ ] Flujo de versionado y corrección de documentos
- [ ] Dashboard de auditoría mejorado para instituciones

## Mediano Plazo

- [ ] Nodos de almacenamiento de propiedad institucional (Fase 2)
- [ ] IPFS private swarm / red permisionada libp2p (Fase 3)
- [ ] Recuperación por umbral Shamir Secret Sharing usando `GuardianRegistry`
- [ ] App móvil (React Native) con protección biométrica de claves (WebAuthn / Secure Enclave)
- [ ] Integración con regulación del Ministerio de Salud de Chile (una vez publicada la norma técnica)

## Largo Plazo

- [ ] Onboarding nacional de prestadores de salud (cada clínica/laboratorio certificado opera un nodo)
- [ ] Acuerdos de SLA on-chain para replicación de datos y conservación de 15 años
- [ ] Aprendizaje federado sobre datos médicos encriptados (diagnóstico con IA preservando privacidad)
- [ ] Acuerdos de interoperabilidad transfronteriza (corredores de datos de salud MERCOSUR / Alianza del Pacífico)

---

# Contribuir

Damos la bienvenida a contribuciones de ingenieros de salud, criptógrafos y desarrolladores blockchain enfocados en **infraestructura médica preservadora de la privacidad**.

Por favor abre un issue o pull request en:  
https://github.com/jpgsChile/healthproof

---

# Licencia

[Licencia por definir]

---

> **Aviso legal:** HealthProof es un proyecto de infraestructura experimental. Aún no está certificado para uso médico en producción en Chile. El despliegue clínico requiere revisión por el **Ministerio de Salud** y la **Superintendencia de Salud** bajo la futura regulación técnica de la Ley 21.668.
