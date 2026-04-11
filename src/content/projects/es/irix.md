---

title: IRIX
description: Cliente de email B2B con detección de phishing por AI, respuestas automáticas, push notifications y clasificación de correos por importancia.
longDescription: |
  Email client empresarial que analiza correos en tiempo real para detectar phishing,
  clasifica automáticamente por tiers de importancia, genera respuestas automáticas
  sugeridas y envía push notifications para correos críticos. Sincroniza con Gmail y
  Outlook via OAuth/MSAL.
status: mvp
statusLabel: MVP
stack:
  - Fastify
  - TypeScript
  - Prisma
  - PostgreSQL
  - Redis
  - Next.js 14
  - OpenAI
  - JWT
  - MSAL
tags:
  - AI/ML
  - Security
  - Full-Stack
image: /screenshots/irix-inbox.png
gallery:
  - /screenshots/irix-inbox.png
  - /screenshots/irix-welcome.png
featured: true
order: 2
lang: es
slug: irix
---


## El Problema

Los clientes de email tradicionales no ofrecen protección activa contra amenazas ni
ayudan a gestionar el volumen de correos. Los empleados pierden tiempo clasificando
manualmente, caen en intentos de phishing sofisticados, y correos críticos quedan
enterrados entre newsletters y notificaciones.

## Mi Enfoque

### Backend (Fastify + TypeScript)

- **API REST con Prisma ORM**: Modelos para usuarios, correos, reglas de clasificación
  y configuraciones de notificación.
- **Autenticación JWT con refresh tokens**: Sesiones seguras con rotación automática.
- **Sincronización multi-proveedor**: MSAL para Office 365/Outlook y OAuth 2.0 para
  Gmail. Los correos se sincronizan en background via webhooks.

### AI Pipeline

- **Detección de phishing**: Análisis local de headers, enlaces, patrones de lenguaje
  y reputación de dominios. Los correos se procesan sin enviar contenido a servicios
  externos — la privacidad es requisito, no feature.
- **Clasificación por tiers de importancia**: Cada correo recibe un tier (urgente, alto,
  normal, bajo) basado en remitente, contenido, historial de interacción y reglas
  personalizadas del usuario.
- **Respuestas automáticas sugeridas**: El sistema genera borradores de respuesta para
  correos frecuentes, que el usuario puede editar y enviar con un click.

### Push Notifications

- Notificaciones en tiempo real para correos clasificados como urgentes o de remitentes
  prioritarios. Configurables por tier — el usuario decide qué nivel de importancia
  merece una notificación.

### Frontend (Next.js 14)

- Interfaz de email con indicadores visuales de riesgo (badges de phishing con nivel
  de confianza) y barras de color por tier de importancia.
- Panel de configuración de reglas de clasificación y preferencias de notificación.

### Decisiones técnicas clave

- **Fastify sobre Express**: Mejor rendimiento y esquema de validación nativo para una
  API que procesa alto volumen de emails.
- **Redis para caché de sesiones y cola de procesamiento**: Sincronización de estado entre
  tabs y dispositivos, y cola para el pipeline de análisis AI.
- **Análisis local**: Los correos empresariales no salen del servidor. Todo el pipeline
  de phishing y clasificación corre on-premise.

## Aprendizajes

- La integración con Microsoft Graph API requiere manejar muchos edge cases en permisos,
  tokens de refresh y webhooks de suscripción.
- El phishing detection tiene que balancear sensibilidad con falsos positivos — demasiadas
  alertas hacen que los usuarios las ignoren. Implementé un sistema de feedback donde
  el usuario puede marcar falsos positivos para entrenar el modelo.
- La clasificación por tiers necesita un período de "aprendizaje" por usuario antes de
  ser útil. Los primeros días se basa en reglas genéricas mientras acumula datos.
