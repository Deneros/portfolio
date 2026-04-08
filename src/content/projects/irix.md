---
title: IRIX
description: Cliente de email inteligente con detección de phishing por AI y clasificación de prioridad.
longDescription: |
  Email client B2B con análisis de seguridad local que detecta intentos de phishing,
  clasifica la prioridad de correos y sincroniza con múltiples proveedores (Gmail, Outlook).
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
image: /screenshots/irix-login.png
featured: true
order: 2
---

## El Problema

Los clientes de email tradicionales no ofrecen protección activa contra phishing ni
ayudan a priorizar correos. Las soluciones enterprise son caras y opacas en su análisis.

## Mi Enfoque

- **Backend (Fastify + TypeScript)**: API REST con Prisma ORM, autenticación JWT con
  refresh tokens, sincronización multi-proveedor via MSAL (Office 365) y OAuth (Gmail).
- **AI Pipeline**: Detección de phishing y clasificación de prioridad usando análisis
  local. Los correos se procesan sin enviar contenido a servicios externos.
- **Frontend (Next.js 14)**: Interfaz de email con indicadores visuales de riesgo y prioridad.

### Decisiones técnicas clave

- **Fastify sobre Express**: Mejor rendimiento y esquema de validación nativo para una
  API que procesa alto volumen de emails.
- **Redis para caché de sesiones**: Sincronización de estado entre tabs y dispositivos.
- **Análisis local de phishing**: Los correos empresariales no deben salir del servidor
  para análisis — la privacidad es requisito, no feature.

## Aprendizajes

- La integración con Microsoft Graph API requiere manejar muchos edge cases en permisos
  y tokens de refresh.
- El phishing detection tiene que balancear sensibilidad con falsos positivos — demasiadas
  alertas hacen que los usuarios las ignoren.
