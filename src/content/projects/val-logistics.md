---
title: Val Logistics
description: Sistema de seguimiento de pedidos con chat integrado, dashboard operacional, cálculos de huella de CO2 y notificaciones en tiempo real.
longDescription: |
  Plataforma logística empresarial para rastrear pedidos de principio a fin, con chat
  integrado entre operadores y clientes, dashboard de métricas operacionales, cálculo
  automático de huella de carbono por envío y notificaciones push en tiempo real.
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

La empresa manejaba el seguimiento de pedidos con hojas de cálculo y comunicación por
WhatsApp. Los clientes no tenían visibilidad del estado de sus envíos, los operadores
perdían tiempo respondiendo "¿dónde está mi pedido?", y no había forma de medir el
impacto ambiental de las operaciones.

## Mi Enfoque

### Seguimiento de pedidos

- **Tracking en tiempo real**: Cada pedido pasa por estados definidos (recibido, en
  preparación, en tránsito, entregado) con timestamps y responsable asignado.
- **Notificaciones Pusher**: Clientes y operadores reciben actualizaciones instantáneas
  cuando un pedido cambia de estado.
- **Historial completo**: Cada movimiento queda registrado con usuario, fecha y ubicación.

### Chat integrado

- Chat en tiempo real entre operadores y clientes, contextualizado por pedido. Cada
  conversación está vinculada a un envío específico — no más buscar en WhatsApp qué
  mensaje corresponde a qué pedido.

### Dashboard operacional

- **ECharts**: Gráficos de volumen de envíos, tiempos de entrega promedio, pedidos por
  estado, y tendencias semanales/mensuales.
- **Métricas en tiempo real**: El dashboard se actualiza via Pusher sin necesidad de
  refrescar la página.

### Cálculos de CO2

- Cálculo automático de huella de carbono por envío basado en distancia, tipo de
  vehículo y peso del paquete. Reportes mensuales de emisiones para cumplimiento
  ambiental.

### Decisiones técnicas clave

- **ECharts sobre Recharts/Chart.js**: Maneja datasets grandes con mejor rendimiento
  y ofrece gráficos enterprise (Sankey para flujo de pedidos, treemap para distribución
  por zona).
- **Redux Toolkit**: La complejidad del estado (tracking, chat, dashboard, permisos,
  real-time updates) justificaba slices bien definidos sobre soluciones más ligeras.
- **Pusher para real-time**: Maneja chat, tracking y dashboard updates en canales
  separados para no saturar al cliente con eventos innecesarios.

## Aprendizajes

- El chat contextualizado por pedido redujo las consultas de estado en un 60% — los
  clientes ven el tracking directamente.
- Los cálculos de CO2 requieren datos precisos de rutas y vehículos; con datos
  aproximados el resultado es más marketing que métrica real.
- Los dashboards enterprise requieren loading states y error boundaries robustos —
  un gráfico que falla no puede romper todo el dashboard.
