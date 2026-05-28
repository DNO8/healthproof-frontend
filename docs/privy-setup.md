# Configuración de Privy: Allowed Origins

## Problema

Si ves el error **"Origin not allowed"** en la consola del navegador, significa que el dominio actual no está autorizado en la configuración de Privy.

## Solución

1. Ve al dashboard de Privy: https://dashboard.privy.io
2. Selecciona tu aplicación (HealthProof)
3. Navega a **Settings → Allowed Origins**
4. Agrega los siguientes dominios:
   - `http://localhost:3000` (desarrollo local)
   - `http://localhost:3001` (desarrollo alterno)
   - Tu dominio de producción (ej. `https://healthproof.app`)
5. Guarda los cambios
6. Recarga la página

## Fallback en código

El componente `PrivyErrorBoundary` (`src/components/feedback/PrivyErrorBoundary.tsx`) captura este error y muestra una pantalla informativa con instrucciones en lugar de dejar la pantalla en blanco.

## Verificación

Después de agregar el dominio, abre la consola del navegador y busca errores de Privy. Si ya no aparece "Origin not allowed", la configuración es correcta.
