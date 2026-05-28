# Script de verificación de logs: key recovery

## Server Action errors (buscar en logs de producción/staging)

```bash
# Buscar errores en Server Actions críticos
# Si usas Vercel:
vercel logs --all | grep -E "\[checkAccessOnChain\] failed|\[savePermissionKey\] failed|\[listSharedDocuments\] failed|\[getUserPublicKey\] failed|\[getUserWithBackup\] failed"

# Si usas Docker/stdout local:
docker logs healthproof-frontend 2>&1 | grep -E "\[(checkAccessOnChain|savePermissionKey|listSharedDocuments|getUserPublicKey|getUserWithBackup)\]"

# Si usas PM2:
pm2 logs healthproof-frontend | grep -E "\[(checkAccessOnChain|savePermissionKey|listSharedDocuments|getUserPublicKey|getUserWithBackup)\]"
```

## Client logs (Chrome DevTools)

```javascript
// En la consola del navegador, filtrar por estos patrones:
// Filtro de búsqueda: "[SharedPage]" o "[useSyncKeys]" o "[scan]"

// Verificar auto-recovery exitoso:
filter = "Auto-recovered"

// Verificar errores de decrypt:
filter = "[useDocumentDecrypt] error"

// Verificar flujo de scan:
filter = "[Scan]"
```

## IndexedDB inspection

```javascript
// En Chrome DevTools → Application → IndexedDB:
// Verificar que existen stores:
// - keypairs (con share1, masterSecretHash, schemeVersion)
// - public_keys (deprecated)
```

## Supabase queries útiles

```sql
-- Verificar que encrypted_private_key existe para un user
SELECT id, wallet_address, encrypted_private_key IS NOT NULL as has_backup,
       scheme_version, master_secret_hash IS NOT NULL as has_hash
FROM users
WHERE id = 'did:privy:xxxx';

-- Verificar documentos compartidos con un doctor
SELECT ds.document_id, ds.patient_wallet, pk.grantee_wallet
FROM document_secrets ds
JOIN permission_keys pk ON ds.document_id = pk.document_id
WHERE pk.grantee_wallet = '0x...';
```
