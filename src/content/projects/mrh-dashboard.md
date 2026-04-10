---
title: MRH Dashboard
description: Dashboard con visualización de datos, mapas interactivos Leaflet y componentes Radix UI.
status: mvp
statusLabel: MVP
stack:
  - React 19
  - Vite
  - TailwindCSS
  - Recharts
  - Leaflet
  - Radix UI
  - React Hook Form
tags:
  - Frontend
  - Data Viz
  - Maps
image: /screenshots/mrh-dashboard.png
gallery:
  - /screenshots/mrh-dashboard.png
  - /screenshots/mrh-login.png
  - /screenshots/mrh-task-detail.png
  - /screenshots/mrh-agenda.png
  - /screenshots/mrh-profile.png
  - /screenshots/mrh-account.png
  - /screenshots/mrh-new-task.png
featured: false
order: 8
---

## El Problema

Construir un dashboard moderno para visualizar datos operacionales con gráficos
interactivos y mapas geoespaciales.

## Mi Enfoque

- **Recharts**: Gráficos de líneas, barras y áreas para métricas temporales.
- **Leaflet**: Mapas interactivos para visualización geoespacial de datos.
- **Radix UI**: Componentes accesibles para filtros, selects y modals.
- **React Hook Form**: Formularios de filtrado y configuración.

### Decisiones técnicas clave

- **Leaflet sobre Google Maps/Mapbox**: Open source, sin costos por request, y más
  ligero para el caso de uso.
- **React 19 + Vite**: El tooling más rápido para desarrollo frontend moderno.

## Aprendizajes

- Los mapas con muchos markers requieren clustering para mantener rendimiento.
- Recharts maneja bien datasets medianos, pero para datos masivos hay que virtualizar.
