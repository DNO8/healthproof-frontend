# Resultados de Testing: Key Recovery Cross-Device

**Fecha:** _(por completar)_  
**Tester:** _(por completar)_  
**Versión:** commit `c264ed`

---

## Resumen

| # | Escenario | Resultado | Notas |
|---|---|---|---|
| 1 | Onboarding en navegador A | ⬜ Pendiente | |
| 2 | Mismo user en navegador B (sin clear) | ⬜ Pendiente | |
| 3 | Mismo user en navegador C limpio | ⬜ Pendiente | |
| 4 | Mismo user con IndexedDB borrado | ⬜ Pendiente | |
| 5 | User legacy sin `encrypted_private_key` en nuevo navegador | ⬜ Pendiente | |
| 6 | User sin ningún backup (caso raro) | ⬜ Pendiente | |
| 7 | Scan QR de doctor → desencriptación | ⬜ Pendiente | |
| 8 | Scan QR en navegador limpio sin claves → auto-recovery → decrypt | ⬜ Pendiente | |
| 9 | Modal de recovery en mobile real | ⬜ Pendiente | |
| 10 | Banner KeyConflict durante auto-recovery | ⬜ Pendiente | |

---

## Detalle por escenario

### #1: Onboarding en navegador A

**Pasos:**
1. Crear cuenta nueva con email
2. Esperar que `useSyncKeys` ejecute onboarding
3. Verificar que `RecoveryCodeModal` aparece

**Checklist:**
- [ ] Modal aparece con código visible
- [ ] Botón "Copiar" funciona
- [ ] Botón "Descargar" descarga archivo .txt
- [ ] Código es scrolleable si es largo
- [ ] Botón "He guardado mi código" cierra modal
- [ ] En mobile: footer fijo, botón siempre visible

**Resultado:** _(PASS / FAIL / N/A)_

**Logs relevantes:**
```
(pesar de consola)
```

---

### #2: Mismo user en navegador B (sin clear)

**Pasos:**
1. Loguear con la misma cuenta en navegador B (Chrome/otro perfil)
2. `useSyncKeys` detecta IndexedDB vacío + backup existe

**Checklist:**
- [ ] Banner "Recuperando claves..." aparece brevemente
- [ ] Banner desaparece en < 5 segundos
- [ ] No aparece `RecoveryInputModal`
- [ ] No aparece `RegenerateKeysModal`
- [ ] Toast "Claves restauradas" aparece
- [ ] `sessionStorage.hp_keys_synced` = userId

**Resultado:** _(PASS / FAIL / N/A)_

---

### #3: Mismo user en navegador C limpio

**Pasos:**
1. Abrir incógnito / nuevo perfil
2. Loguear con misma cuenta

**Checklist:**
- [ ] Auto-recovery silencioso funciona igual que #2

**Resultado:** _(PASS / FAIL / N/A)_

---

### #4: Mismo user con IndexedDB borrado

**Pasos:**
1. En navegador A: Chrome DevTools → Application → IndexedDB → borrar
2. Recargar página

**Checklist:**
- [ ] Auto-recovery silencioso desde `encrypted_private_key` en DB
- [ ] Claves funcionan para desencriptar documentos previos

**Resultado:** _(PASS / FAIL / N/A)_

---

### #5: User legacy sin `encrypted_private_key` en nuevo navegador

**Pasos:**
1. Encontrar o crear user con `scheme_version = 2` pero `encrypted_private_key IS NULL`
2. Loguear en navegador nuevo

**Checklist:**
- [ ] `RecoveryInputModal` aparece pidiendo código
- [ ] El código del paso #1 funciona para recuperar

**Resultado:** _(PASS / FAIL / N/A)_

---

### #6: User sin ningún backup (caso raro)

**Pasos:**
1. Encontrar user sin `encrypted_private_key` y sin `server_share_ciphertext`
2. Loguear en navegador nuevo

**Checklist:**
- [ ] `RegenerateKeysModal` aparece
- [ ] Input de confirmación requiere "PERDER ACCESO"
- [ ] Botón regenerar está disabled hasta confirmar
- [ ] Regenerar genera nuevas claves y muestra recovery code

**Resultado:** _(PASS / FAIL / N/A)_

---

### #7: Scan QR de doctor → desencriptación

**Pasos:**
1. Paciente comparte documento con doctor (genera QR)
2. Doctor escanea QR en `/dashboard/scan`
3. Redirige a `/dashboard/shared`

**Checklist:**
- [ ] No error 500 durante el scan
- [ ] Redirección correcta a `/dashboard/shared`
- [ ] Documento aparece en la lista
- [ ] Desencriptación exitosa al hacer click en "Ver"
- [ ] `FilePreview` muestra el contenido correctamente

**Resultado:** _(PASS / FAIL / N/A)_

---

### #8: Scan QR en navegador limpio sin claves → auto-recovery → decrypt

**Pasos:**
1. Borrar IndexedDB del doctor
2. Doctor escanea QR de paciente
3. Verificar que auto-recovery ocurre antes de decrypt

**Checklist:**
- [ ] Banner "Recuperando claves..." aparece
- [ ] Auto-recovery completa
- [ ] Desencriptación del documento del QR es exitosa
- [ ] No error "Encryption keys not found"

**Resultado:** _(PASS / FAIL / N/A)_

---

### #9: Modal de recovery en mobile real

**Pasos:**
1. Probar en iPhone Safari o Android Chrome
2. Forzar `RecoveryCodeModal` (nuevo user)
3. Forzar `RecoveryInputModal` (user legacy)

**Checklist:**
- [ ] Footer fijo, botón siempre visible
- [ ] Código es scrolleable en `RecoveryCodeModal`
- [ ] Input ocupa pantalla completa en `RecoveryInputModal`
- [ ] No hay elementos fuera de pantalla

**Resultado:** _(PASS / FAIL / N/A)_

---

### #10: Banner KeyConflict durante auto-recovery

**Pasos:**
1. Loguear en navegador nuevo con user que tiene backup
2. Observar banner mientras auto-recovery corre

**Checklist:**
- [ ] Icono cambia a 🔐 durante recovery
- [ ] Spinner visible
- [ ] Texto "Recuperando claves de cifrado..."
- [ ] No hay botón de dismiss ni regenerate durante recovery
- [ ] Banner desaparece limpiamente al finalizar

**Resultado:** _(PASS / FAIL / N/A)_

---

## Issues encontrados

| # | Escenario | Descripción | Severidad | Status |
|---|---|---|---|---|
| | | | | |

## Conclusión

_(por completar después del testing)_
