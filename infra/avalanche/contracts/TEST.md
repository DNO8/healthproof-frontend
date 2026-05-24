# Guía de Tests — HealthProof Contracts

Guía paso a paso para ejecutar los tests del protocolo HealthProof en entorno de desarrollo.

---

## Requisitos previos

- **Node.js** 18 o superior
- **pnpm** (obligatorio por seguridad)

---

## Paso 1: Instalar dependencias

```bash
cd infra/avalanche/contracts
pnpm install
```

---

## Paso 2: Compilar contratos

```bash
pnpm run build
```

Verifica que la compilación termine sin errores. Los artefactos se generan en `artifacts/`.

---

## Paso 3: Ejecutar todos los tests

```bash
pnpm run test
```

O directamente con Hardhat:

```bash
npx hardhat test
```

**Salida esperada:** `28 passing`

---

## Paso 4: Ejecutar tests por archivo

Para ejecutar solo un conjunto de tests:

```bash
# Solo IdentityRegistry
pnpm hardhat test test/IdentityRegistry.test.ts

# Solo GuardianRegistry
pnpm hardhat test test/GuardianRegistry.test.ts

# Solo HealthProofKernel
pnpm hardhat test test/HealthProofKernel.test.ts

# Solo HealthProofGateway
pnpm hardhat test test/HealthProofGateway.test.ts
```

---

## Paso 5: Ejecutar un test específico

Usa el flag `--grep` para filtrar por nombre:

```bash
pnpm hardhat test --grep "Debe asignar admin"
pnpm hardhat test --grep "createEpisode"
pnpm hardhat test --grep "grantGuardianship"
```

---

## Paso 6: Tests con reporte detallado

Para ver gas usado y más detalle:

```bash
pnpm hardhat test --verbose
```

---

## Estructura de tests

| Archivo | Contratos probados | Tests |
|---------|--------------------|-------|
| `IdentityRegistry.test.ts` | IdentityRegistry | Deployment, registerEntity, verifyEntity, getRole |
| `GuardianRegistry.test.ts` | GuardianRegistry | grantGuardianship, isGuardian |
| `HealthProofKernel.test.ts` | HealthProofKernel | registerModule, pauseProtocol, resumeProtocol, upgradeModule |
| `HealthProofGateway.test.ts` | Gateway + módulos | createEpisode, createMedicalOrder, registerMedicalDocument, grantAccess |

---

## Fixture compartido

El archivo `test/fixtures.ts` despliega todos los contratos y configura:

- IdentityRegistry, GuardianRegistry, PermissionManager
- ClinicalEpisodeRegistry, MedicalOrderRegistry, MedicalDocumentRegistry
- HealthcareNetworkRegistry, AuditTrail
- HealthProofKernel, HealthProofGateway, HealthProofProtocol
- Registro de módulos en el Kernel
- Entidades: deployer (ADMIN), doctor, patient, certifier
- Gateway registrado como DOCTOR verificado (para flujos vía Gateway)

---

## Solución de problemas

### Error: "Cannot find module"
```bash
pnpm install
pnpm run build
```

### Tests lentos
La primera ejecución compila los contratos. Las siguientes son más rápidas (~3–5 s).

### Limpiar y recompilar
```bash
pnpm run clean
pnpm run build
pnpm run test
```

---

## Resumen de comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm run test` | Ejecutar todos los tests |
| `pnpm hardhat test test/X.test.ts` | Ejecutar tests de un archivo |
| `pnpm hardhat test --grep "nombre"` | Ejecutar tests que coincidan |
| `pnpm hardhat test --verbose` | Reporte detallado |
