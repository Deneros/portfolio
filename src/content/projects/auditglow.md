---
title: AuditGlow
description: App móvil de auditoría con documentación fotográfica, roles y reportes cloud.
status: design
statusLabel: Design Phase
stack:
  - Expo
  - React Native
  - React 19
  - Expo Router
  - Camera API
  - Secure Store
tags:
  - Mobile
  - React Native
image: /screenshots/auditglow-dashboard.jpg
gallery:
  - /screenshots/auditglow-dashboard.jpg
  - /screenshots/auditglow-login.jpg
  - /screenshots/auditglow-audits.jpg
  - /screenshots/auditglow-areas.jpg
  - /screenshots/auditglow-join.jpg
galleryLayout: mobile
featured: false
order: 7
---

## El Problema

Los procesos de auditoría de instalaciones se hacen con formularios en papel o
herramientas genéricas. Se necesita una app que permita documentar condiciones
con fotos/video, asignar roles y generar reportes automáticos.

## Mi Enfoque

- **Expo + React Native**: Desarrollo cross-platform (iOS, Android, Web) desde un
  solo codebase.
- **Documentación visual**: Captura de fotos antes/después usando la cámara nativa,
  almacenamiento cloud.
- **Roles**: Auditor, supervisor, cliente y empleado con permisos diferenciados.
- **Expo Router**: Navegación file-based similar a Next.js.

### Áreas funcionales diseñadas

1. Gestión de auditorías y programación
2. Captura de evidencia fotográfica/video
3. Formularios de evaluación por área
4. Reportes y exportación
5. Gestión de usuarios y roles
6. Dashboard de métricas

## Estado Actual

Fase de diseño completada con documento de requirements detallado y arquitectura
definida. Stack seleccionado y estructura de navegación implementada.
