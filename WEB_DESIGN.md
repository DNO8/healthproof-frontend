# HealthProof Frontend

> Cliente web oficial del protocolo **HealthProof** — infraestructura L1 sobre Avalanche para verificación médica soberana.

Este frontend permite a **pacientes**, **laboratorios** y **centros médicos** interactuar con el protocolo de forma segura, cifrada y verificable. No es una simple dApp: es un cliente de infraestructura clínica.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework** | Next.js (App Router, Turbopack) | 16.1.6 |
| **UI** | React | 19.2.3 |
| **Lenguaje** | TypeScript | 5.x |
| **Estilos** | Tailwind CSS | 4.x |
| **Animaciones** | GSAP | 3.14.x |
| **Tipografía** | Manrope (Google Fonts) | — |
| **Linter/Formatter** | Biome | 2.2.0 |
| **Compilador** | React Compiler (babel plugin) | 1.0.0 |

### Dependencias previstas (módulos futuros)

- **Wagmi** + **Ethers** — conexión wallet y firma de transacciones
- **React Query** — cache y sincronización de datos
- **Zustand** — estado global (`auth.store`, `permissions.store`, `ui.store`)
- **Axios** — cliente HTTP con interceptores
- **Sileo** — notificaciones
- **Privy / Web3Auth** — wallet abstraction

---

## Arquitectura del Proyecto

```
src/
├── app/                        # Rutas (App Router)
│   ├── layout.tsx              # Layout raíz (Manrope, metadata, lang=es)
│   ├── page.tsx                # Página principal → LandingPage
│   ├── globals.css             # Variables CSS, utilidades neumorphism
│   ├── providers.tsx           # Providers globales (placeholder)
│   ├── auth/layout.tsx         # Layout autenticación (placeholder)
│   └── dashboard/layout.tsx    # Layout dashboard (placeholder)
│
├── components/
│   ├── ui/                     # Componentes reutilizables
│   │   ├── Button.tsx          # Botón con variantes primary/success
│   │   ├── Card.tsx            # Tarjeta neumorphism
│   │   ├── Input.tsx           # Input con estilo neumorphism
│   │   ├── MetricCard.tsx      # Tarjeta de métricas
│   │   ├── ModuleCard.tsx      # Tarjeta de módulo del protocolo
│   │   ├── RoleCard.tsx        # Tarjeta de rol (paciente/lab/centro)
│   │   ├── FlowStep.tsx        # Paso de flujo visual
│   │   ├── PaletteCard.tsx     # Visualización de color de paleta
│   │   ├── SectionTitle.tsx    # Título de sección
│   │   ├── SectionDivider.tsx  # Divisor decorativo
│   │   ├── DecorativeShapes.tsx # SVGs decorativos (cruces, círculos)
│   │   └── index.ts            # Barrel exports
│   │
│   ├── landing/                # Landing page modular
│   │   ├── LandingPage.tsx     # Composición principal
│   │   ├── constants.ts        # Constantes, actores, transforms, dome
│   │   ├── types.ts            # Tipos del landing
│   │   ├── index.ts            # Barrel export
│   │   └── sections/
│   │       ├── HeroCarouselSection.tsx   # Carrusel 3D con actores
│   │       ├── BeforeAfterSection.tsx    # Antes/después de HealthProof
│   │       ├── StorytellingSection.tsx   # Capítulos narrativos
│   │       ├── TrustSignalsSection.tsx   # Indicadores de confianza
│   │       ├── TestimonialsSection.tsx   # Testimonios
│   │       ├── FinalCtaSection.tsx       # CTA final
│   │       └── index.ts
│   │
│   ├── cards/                  # Tarjetas especializadas (placeholder)
│   ├── feedback/               # Componentes de feedback (placeholder)
│   ├── forms/                  # Formularios (placeholder)
│   └── layout/                 # Layout compartido (placeholder)
│
├── features/                   # Lógica de negocio por dominio
│   ├── auth/                   # Autenticación y sesión
│   ├── documents/              # Gestión de documentos médicos
│   ├── indentity/              # Identidad soberana del paciente
│   ├── medical-orders/         # Órdenes médicas
│   ├── patient/                # Módulo paciente
│   ├── permissions/            # Permisos criptográficos
│   └── audit/                  # Auditoría y trazabilidad
│
├── hooks/                      # Hooks personalizados
│   ├── useCarouselAnimation.ts # Animación GSAP del carrusel 3D
│   ├── useReducedMotion.ts     # Detección prefers-reduced-motion
│   ├── useMediaQuery.ts        # Media queries reactivas
│   ├── useDebounce.ts          # Debounce genérico
│   └── useMounted.ts           # Estado de montaje del componente
│
├── services/                   # Infraestructura transversal
│   ├── api/
│   │   ├── client.ts           # Cliente HTTP base
│   │   └── interceptors.ts     # Interceptores de request/response
│   ├── blockchain/
│   │   ├── provider.ts         # Proveedor RPC
│   │   ├── signer.ts           # Firma de transacciones
│   │   ├── contacts.ts         # Instancias de contratos
│   │   └── events.ts           # Listener de eventos on-chain
│   ├── encryption/
│   │   ├── encrypt.ts          # Cifrado de documentos
│   │   ├── decrypt.ts          # Descifrado de documentos
│   │   └── key-management.ts   # Gestión de claves
│   └── storage/
│       └── upload.ts           # Subida de archivos
│
├── state/                      # Estado global (Zustand)
│   ├── auth.store.ts           # Estado de autenticación
│   ├── permissions.store.ts    # Estado de permisos
│   └── ui.store.ts             # Estado de UI
│
├── types/                      # Tipos globales
│   ├── api.types.ts            # Tipos de API
│   ├── blockchain.types.ts     # Tipos de blockchain
│   └── domain.types.ts         # Tipos de dominio clínico
│
└── lib/                        # Utilidades
    ├── constants.ts            # Constantes globales
    ├── env.ts                  # Variables de entorno tipadas
    └── utils.ts                # Funciones utilitarias
```

---

## Sistema de Diseño

HealthProof utiliza un lenguaje visual basado en **neumorphism clínico**: estética moderna, minimalismo suave, alta legibilidad y sensación de confianza.

### Paleta de Colores Oficial

#### Background

| Nombre | HEX | RGB | CSS Variable | Uso |
|--------|-----|-----|-------------|-----|
| **Soft Off-White** | `#F5F7FA` | `rgb(245, 247, 250)` | `--hp-bg` | Fondo principal. Lienzo clínico sin blanco puro agresivo |
| **Light Gray** | `#E5E7EB` | `rgb(229, 231, 235)` | `--hp-layer` | Tarjetas, capas secundarias, contenedores |

#### Primary

| Nombre | HEX | RGB | CSS Variable | Uso |
|--------|-----|-----|-------------|-----|
| **Pastel Dark Blue** | `#93C5FD` | `rgb(147, 197, 253)` | `--hp-primary` | Botones principales, acciones críticas, estados activos. Color institucional |
| **Pastel Cyan-Blue** | `#BFDBFE` | `rgb(191, 219, 254)` | `--hp-primary-soft` | Gradientes, hover states, highlights |

#### Accent

| Nombre | HEX | RGB | CSS Variable | Uso |
|--------|-----|-----|-------------|-----|
| **Soft Green** | `#A7F3D0` | `rgb(167, 243, 208)` | `--hp-success` | Estados positivos, verificaciones correctas, métricas saludables |
| **Soft Gray** | `#9CA3AF` | `rgb(156, 163, 175)` | `--hp-muted` | Texto secundario, íconos, bordes, estados neutros |

#### Soporte

| Nombre | HEX | CSS Variable | Uso |
|--------|-----|-------------|-----|
| **Dark Text** | `#1F2937` | `--hp-text` | Texto principal |
| **Border** | `#DBE1EA` | `--hp-border` | Bordes de tarjetas y superficies |

### Estilo Visual: Neumorphism

Toda la aplicación utiliza Neumorphism como lenguaje visual principal, definido como utilidades CSS en `globals.css`:

| Clase | Propósito | Sombra |
|-------|----------|--------|
| `.neu-shell` | Contenedores principales | `20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff` |
| `.neu-surface` | Tarjetas y superficies elevadas | `10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff` |
| `.neu-inset` | Elementos hundidos / inputs | `inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff` |
| `.neu-chip` | Chips y badges | `6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff` |
| `.neu-pressed` | Estado presionado | `inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff` |
| `.neu-focus-ring` | Foco accesible | `outline-color: rgba(147, 197, 253, 0.95)` |

**Radios de borde:**
- `--hp-radius-lg`: `20px`
- `--hp-radius-xl`: `28px`
- `--hp-radius-2xl`: `40px`

**Principios:**
- Sombras suaves internas y externas
- Bordes redondeados amplios
- Elementos que "emergen" del fondo
- Profundidad ligera y orgánica
- Sin contornos duros
- Menor fatiga visual

---

## Landing Page

La landing page es una experiencia narrativa compuesta por secciones modulares:

1. **HeroCarouselSection** — Carrusel 3D interactivo con los tres actores (Paciente, Laboratorio, Centro Médico), animación orbital de assets con GSAP, domo de puntos decorativos y transición de estado pre/post verificación
2. **BeforeAfterSection** — Comparativa visual del estado actual vs. HealthProof
3. **StorytellingSection** — Capítulos narrativos a pantalla completa con imágenes de storyboard
4. **TrustSignalsSection** — Indicadores cuantitativos de confianza
5. **TestimonialsSection** — Testimonios por rol
6. **FinalCtaSection** — Llamado a la acción final

### Animaciones (GSAP)

- **Orbital 3D**: Assets giran en una elipse tridimensional con profundidad en eje Z, velocidades diferenciadas por ícono y entrada inmediata sin delay
- **Domo decorativo**: Grilla de puntos `#93C5FD` que se activa con fade-in al verificar
- **Transiciones de texto**: Fade suave con `@keyframes fadeIn` al cambiar entre estados pre/post verificación
- **Accesibilidad**: Detección de `prefers-reduced-motion` con posicionamiento estático como fallback

---

## Roles Soportados

| Rol | Descripción |
|-----|------------|
| **Paciente** | Soberanía sobre su historial. Delegación de acceso vía QR |
| **Laboratorio** | Emisión de evidencia clínica verificable |
| **Centro Médico** | Validación de resultados y gestión de órdenes |

---

## Seguridad

- Los documentos médicos **nunca** se almacenan en texto plano
- Se genera hash criptográfico antes del registro on-chain
- Los permisos son gestionados criptográficamente
- El paciente mantiene soberanía total sobre el acceso a sus datos
- Cifrado/descifrado en cliente (`services/encryption/`)

---

## Filosofía

HealthProof **no almacena datos médicos en blockchain**. La blockchain:

- Certifica integridad
- Registra permisos
- Garantiza trazabilidad
- Provee timestamp verificable

El frontend es el puente entre el usuario clínico y la infraestructura criptográfica.

---

## Scripts

```bash
npm run dev       # Servidor de desarrollo (Turbopack)
npm run build     # Build de producción
npm run start     # Servidor de producción
npm run lint      # Linting con Biome
npm run format    # Formateo con Biome
```

## Variables de Entorno

```env
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_BACKEND_URL=
```

---

## Estado del Proyecto

**MVP en desarrollo.**

- [x] Landing page con storytelling y animaciones 3D
- [x] Sistema de diseño neumorphism completo
- [x] Componentes UI reutilizables
- [x] Estructura modular por dominio
- [x] Responsive design (mobile + desktop)
- [ ] Integración wallet (Privy / Web3Auth)
- [ ] Dashboard por rol
- [ ] Registro de hashes on-chain
- [ ] Gestión de permisos criptográficos
- [ ] Subnet privada Avalanche
