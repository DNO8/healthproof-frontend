🧬 HealthProof Frontend

Frontend oficial del protocolo HealthProof, una infraestructura L1 para verificación médica soberana construida sobre Avalanche.

Este cliente web permite a pacientes, laboratorios y centros médicos interactuar con el protocolo de forma segura, cifrada y verificable.

## Propósito del Frontend

# HealthProof Frontend es:

Cliente oficial del L1 HealthProof

Interfaz para registrar órdenes médicas

Portal de carga de resultados

Sistema de gestión de permisos

Sistema de delegación de acceso mediante QR soberano

Capa de abstracción Web3 para entidades clínicas

No es una simple dApp, es un cliente de infraestructura.

🏗️ Stack Tecnológico
Core

Next.js 16 (App Router)

TypeScript

React 19

TailwindCSS

Web3

Wagmi

Ethers

Wallet abstraction (Privy / Web3Auth)

Conexión RPC a L1 HealthProof

Estado y Datos

React Query

Zustand (estado global)

Axios (API backend)

Seguridad

Cifrado cliente (documentos médicos)

Firma de transacciones desde wallet

Registro de hashes on-chain

# Sistema de Diseño

HealthProof utiliza un sistema visual basado en:

Estética clínica moderna

Minimalismo suave

Alta legibilidad

Bajo contraste agresivo

Sensación de confianza y limpieza

## Paleta de Colores Oficial
# Background
Soft Off-White (Main Background)

HEX: #F5F7FA

RGB: rgb(245, 247, 250)

Uso: Fondo principal de la aplicación

Proporciona un lienzo limpio y clínico sin blanco puro agresivo.

Light Gray (Layer Background)

HEX: #E5E7EB

RGB: rgb(229, 231, 235)

Uso: Tarjetas, capas secundarias, contenedores

Añade profundidad sin romper la suavidad visual.

## Primary
Pastel Dark Blue

HEX: #93C5FD

RGB: rgb(147, 197, 253)

Uso: Botones principales, acciones críticas, estados activos

Es el color institucional de HealthProof.

Pastel Cyan-Blue

HEX: #BFDBFE

RGB: rgb(191, 219, 254)

Uso: Gradientes, hover states, highlights

Soporte visual del color primario.

## Accent
Soft Green

HEX: #A7F3D0

RGB: rgb(167, 243, 208)

Uso: Estados positivos, éxito, validaciones correctas, métricas saludables

Representa salud, aprobación y verificación.

Soft Gray

HEX: #9CA3AF

RGB: rgb(156, 163, 175)

Uso: Texto secundario, íconos, bordes, estados neutros

Mantiene coherencia y claridad sin generar ruido visual.

## Estilo Visual: Neumorphism

Toda la aplicación utiliza Neumorphism como lenguaje visual principal.

Principios del estilo:

Sombras suaves internas y externas

Bordes redondeados amplios

Iluminación sutil

Elementos que “emergen” del fondo

Profundidad ligera y orgánica

Sin contornos duros

Esto genera:

Sensación médica moderna

Experiencia calmada

Interfaz confiable

Menor fatiga visual

## Arquitectura Frontend

El proyecto sigue una arquitectura modular por dominio:

features/ → lógica de negocio

services/ → infraestructura transversal

state/ → estado global

components/ → UI reutilizable

app/ → rutas (App Router)

Cada feature refleja un módulo del protocolo L1:

identity

medical-orders

documents

permissions

verifier

El frontend replica la arquitectura del protocolo.

## Seguridad

Los documentos médicos nunca se almacenan en texto plano

Se genera hash antes del registro on-chain

Los permisos son gestionados criptográficamente

El paciente mantiene soberanía sobre el acceso

## Entornos

Variables necesarias:

NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_BACKEND_URL=
## Filosofía

HealthProof no almacena datos médicos en blockchain.

La blockchain:

Certifica integridad

Registra permisos

Garantiza trazabilidad

Provee timestamp verificable

El frontend es el puente entre el usuario clínico y la infraestructura criptográfica.

📌 Estado del Proyecto

MVP en desarrollo.

Fase actual:

Subnet privada

Registro de hashes on-chain

Dashboards por rol


## Roles Soportados

Paciente

Laboratorio

Centro Médico
