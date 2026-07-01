# HealthProof — Roadmap de Red Blockchain (Privada → Pública)

> Documento de contexto y roadmap para la estrategia de red de Hygieia.
> Última actualización: 2026-06-30

---

## 1. Estado actual

HealthProof corre hoy sobre **Hygieia**, una Avalanche L1 (`chainId 21668`) desplegada en un **nodo privado en AWS** (Avalanche Local Network vía `avalanche-cli`).

| Parámetro | Valor |
|-----------|-------|
| Nombre | Hygieia |
| Chain ID (EVM) | `21668` |
| Blockchain ID | `2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq` |
| RPC (nginx :80) | `http://3.141.110.34/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc` |
| Native currency | HVE |
| Red Avalanche | **Local / privada** (no Mainnet ni Fuji) |
| Deployer | `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC` |

### Verificado
- **Conectividad RPC OK**: `eth_chainId` devuelve `0x54a4` (21668) vía nginx puerto 80.
- Puertos directos `9650` / `9654` cerrados desde fuera (hardening esperado).
- SSH restringido por seguridad (correcto).

---

## 2. El problema con exploradores (Avascan)

**Avascan / Routescan solo indexan L1s presentes en Mainnet o Fuji.**

Se verificó la P-Chain pública de Mainnet y Fuji: el `blockchainID` de Hygieia **no existe** en ninguna de ellas. Por eso no aparece en Avascan, Chainlist ni wallets estándar.

> No es un problema de SSH ni del proxy nginx. El RPC HTTP ya es accesible.
> El problema es que la chain vive en una **red privada/local**, no en la red pública de Avalanche.

### Aclaración importante
- Avascan **NO** usa subgraphs ni "grafos" para indexar. Indexa directo desde el RPC de chains públicas.
- El proceso de listado es contactando a **Routescan** (`hello@routescan.io` / `https://routescan.io/contactus`).

---

## 3. Decisión: prioridad por contexto

| Contexto | Red recomendada | Razón |
|----------|-----------------|-------|
| **Hackathon IA Challenge (AHORA)** | Privada (actual) | Suficiente para demostrar IA + flujo HealthProof. No es lo primordial migrar. |
| **PoC con 1-2 laboratorios** | Privada + acceso controlado | Prueba cerrada sin salir a red pública. |
| **Producción / clientes reales** | **Fuji** (luego Mainnet) | Labs/hospitales se conectan sin acceso al nodo privado; explorador público; wallets estándar. |

**Conclusión:** Resolver la indexación pública **no es prioritario para el AI Challenge**, pero **sí es requisito para onboarding de laboratorios y clientes reales**.

---

## 4. Implicancias de migrar a una red pública (Fuji/Mainnet)

### Qué NO cambia
- El nodo en AWS puede seguir siendo tuyo (RPC propio).
- Los **datos médicos siguen cifrados fuera de la chain** (IPFS/Pinata + ECDH). La blockchain solo guarda hashes, direcciones, eventos y estado de permisos.
- SSH y admin del nodo pueden seguir cerrados; solo se expone el RPC por nginx.

### Qué SÍ cambia
- La chain debe ser **pública** (nueva instancia en Fuji/Mainnet).
- Redeploy de contratos desde cero (la chain pública arranca vacía; **no migra datos** automáticamente).
- Nuevo `blockchainID` y `subnetID`.
- La **chain privada actual queda deprecada** como red de transacción (puede quedar como devnet/staging).

### Arquitectura objetivo (1 nodo, no 2 máquinas)
```text
Internet → Security Group (solo 80/443) → nginx → AvalancheGo (localhost:9650)
SSH/admin → solo tu IP
```
- 1 nodo en AWS es suficiente para Fuji/Mainnet + RPC público.
- Existen 2 *chains* (privada actual + nueva en Fuji), pero **no** 2 máquinas obligatorias.

---

## 5. Roadmap de migración (cuando haya tracción con labs)

### Fase 0 — Pre-requisitos
- [ ] Confirmar que `chainId 21668` esté libre en Fuji (verificar en chainlist.org).
- [ ] Obtener AVAX de testnet (faucet Fuji).
- [ ] Backup de genesis, claves y configs de la chain privada.

### Fase 1 — Despliegue en Fuji
- [ ] Crear/convertir la L1 en Fuji con `avalanche-cli` (`avalanche blockchain deploy --fuji`).
- [ ] Registrar nuevo `subnetID` y `blockchainID`.
- [ ] Configurar nodo AWS como validador/RPC en Fuji.
- [ ] Exponer RPC público vía nginx (80/443), mantener SSH restringido.

### Fase 2 — Contratos
- [ ] Redeploy de todos los contratos UUPS en Fuji.
- [ ] Verificar roles (deployer = ADMIN) y Gateway registrado.
- [ ] Actualizar `apps/frontend/healthproof-frontend/.env` y `src/lib/env.ts` con nuevas direcciones + RPC + chainId.

### Fase 3 — Indexación pública
- [ ] Verificar la chain en chainlist.org / DefiLlama chainlist (PR con JSON de la chain).
- [ ] Contactar a Routescan/Avascan para indexación (ver plantilla de correo abajo).

### Fase 4 — Producción (futuro)
- [ ] Evaluar migración a Mainnet (validadores + staking AVAX).
- [ ] Onboarding de laboratorios/hospitales.

---

## 6. Plantilla de correo a Routescan/Avascan

> Enviar solo una vez la chain esté en **Fuji o Mainnet** (no en red privada).

**Para:** `hello@routescan.io`
**Asunto:** Request to index Avalanche L1 — Hygieia (Chain ID 21668)

```text
Hi Routescan/Avascan team,

We would like to request indexing and listing for our Avalanche L1 on Avascan.

Chain details:
- Name: Hygieia
- Chain ID: 21668
- Blockchain ID: [nuevo tras deploy en Fuji]
- Subnet ID: [nuevo tras deploy en Fuji]
- Network: Fuji (testnet)  // o Mainnet
- VM: Subnet-EVM
- RPC URL: https://[tu-dominio o IP]/ext/bc/[blockchainID]/rpc
- Native currency: HVE (18 decimals)
- Project website: https://...
- Short description: HealthProof — verifiable medical records & interoperability L1

Please let us know if you need chain logo, genesis config, or additional RPC endpoints.

Best regards,
[Tu nombre] — HealthProof
```

---

## 7. Resumen ejecutivo

1. **Hoy (hackathon):** chain privada funciona, RPC accesible vía nginx:80. No migrar todavía.
2. **El bloqueo de Avascan** se debe a que la chain es privada, no a SSH/nginx.
3. **Para clientes (labs):** migrar a Fuji/Mainnet es necesario para interoperabilidad real.
4. **Datos médicos** siempre cifrados off-chain; la red pública no expone información sensible.
5. **La chain privada** quedará como devnet/staging tras la migración.
