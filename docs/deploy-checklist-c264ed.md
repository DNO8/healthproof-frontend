# Deploy Checklist: Fase 1–5 (Key Management Fixes) + Fase C/D' (Blockers + i18n)

## Pre-deploy (staging)

### Compilación y linting
- [ ] `pnpm tsc --noEmit` pasa sin errores en `apps/frontend/healthproof-frontend`
- [ ] Build de Next.js pasa: `pnpm build` (staging)
- [ ] No errores de runtime en consola del navegador (staging)

### Variables de entorno
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID` configurado y válido
- [ ] `NEXT_PUBLIC_KEY_BACKUP_PEPPER` definido (puede ser string vacío en local)
- [ ] `NEXT_PUBLIC_RPC_URL` apunta a Hygieia L1
- [ ] `NEXT_PUBLIC_CHAIN_ID` = 21668
- [ ] Dominio de staging agregado en Privy Dashboard → Allowed Origins
- [ ] Dominio de producción agregado en Privy Dashboard → Allowed Origins

### Base de datos
- [ ] Columna `users.encrypted_private_key` existe (texto cifrado)
- [ ] Columna `users.scheme_version` existe (integer, default 2)
- [ ] Columna `users.master_secret_hash` existe (text)
- [ ] Columna `users.server_share_ciphertext` existe (text)

### Smoke tests mínimos en staging
- [ ] Onboarding nuevo usuario → RecoveryCodeModal aparece
- [ ] Login usuario existente con claves locales → OK sin banner
- [ ] Login usuario existente en navegador nuevo (IndexedDB vacío) → auto-recovery silencioso → toast "Claves restauradas"
- [ ] Login usuario legacy (sin `encrypted_private_key`) → RecoveryInputModal
- [ ] Scan QR de paciente → desencriptación exitosa
- [ ] FilePreview de PDF funciona (fallback descarga si iframe falla)
- [ ] Responsive modales de recovery en mobile (footer fijo, dvh)

---

## Deploy a producción

### Paso 1: Preparar
```bash
# Tag del release
git tag -a v1.x.x-c264ed -m "Key management stability + auto-recovery"
git push origin v1.x.x-c264ed
```

### Paso 2: Deploy
```bash
# Vercel
vercel --prod

# O Docker
docker build -t healthproof-frontend:latest .
docker push ...
```

### Paso 3: Post-deploy verificación
- [ ] Homepage carga sin errores 500
- [ ] Login con Privy funciona
- [ ] Dashboard carga, nav funciona
- [ ] KeyConflictBanner no aparece para usuarios con claves OK
- [ ] QRScanner funciona en HTTPS (cámara) y muestra fallback en HTTP
- [ ] Shared documents page carga sin error 500

---

## Rollback plan

### Trigger de rollback
- Auto-recovery silencioso falla masivamente (> 50% de usuarios)
- Usuarios reportan pantalla blanca después de login
- `RecoveryInputModal` o `RegenerateKeysModal` aparecen inesperadamente para usuarios normales

### Comando de rollback (Git)
```bash
# Identificar el commit anterior estable
git log --oneline --graph -20

# Revert los commits de Fase 2 (auto-recovery)
git revert <hash-fase-2>

# O hard reset al último tag estable (descarta cambios)
git reset --hard <last-stable-tag>
git push --force-with-lease
```

### Disable temporal de auto-recovery (sin deploy)
Si necesitas apagar solo la auto-recovery sin revertir todo:

Editar `src/hooks/auth/useSyncKeys.ts`:
```typescript
// Comentar o envolver en false el bloque de auto-recovery en Case C:
// if (userWithBackup?.encrypted_private_key && ...) { ... }
```

Esto deja el flujo SSS + recovery code intacto.

### Verificación post-rollback
- [ ] Usuarios con claves locales pueden loguear normalmente
- [ ] Usuarios sin claves ven RecoveryInputModal (comportamiento anterior)
- [ ] No hay errores 500 en Server Actions
