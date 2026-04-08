---
title: Val Logistics
description: Sistema de gestión logística empresarial con dashboards en tiempo real y comunicación via Pusher.
status: production
statusLabel: Production
stack:
  - Laravel
  - React 18
  - Redux
  - Material-UI
  - TailwindCSS
  - ECharts
  - Pusher
  - Docker
tags:
  - Full-Stack
  - Real-time
  - Enterprise
featured: true
order: 4
---

## El Problema

Empresa logística necesitaba un sistema centralizado para gestionar operaciones, visualizar
métricas en tiempo real y comunicar cambios al equipo de forma inmediata.

## Mi Enfoque

- **Backend (Laravel)**: API REST con autenticación, gestión de operaciones y eventos
  en tiempo real via Pusher.
- **Frontend (React 18)**: Dashboard con ECharts para visualización de datos, Material-UI
  para componentes enterprise, Redux para estado global complejo.
- **Real-time**: Pusher para notificaciones y actualizaciones instantáneas de estado.

### Decisiones técnicas clave

- **ECharts sobre Recharts/Chart.js**: Maneja datasets grandes con mejor rendimiento
  y ofrece más tipos de gráfico enterprise (Sankey, treemap).
- **Redux sobre Zustand**: La complejidad del estado (múltiples dashboards, permisos,
  real-time updates) justificaba Redux Toolkit con slices bien definidos.

## Aprendizajes

- Pusher simplifica el real-time pero hay que diseñar bien los canales para no saturar
  el cliente con eventos innecesarios.
- Los dashboards enterprise requieren loading states y error boundaries robustos —
  un gráfico que falla no puede romper todo el dashboard.
