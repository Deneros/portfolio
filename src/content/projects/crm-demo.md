---
title: CRM Dashboard
description: Dashboard CRM con drag-and-drop, formularios avanzados con Zod, y componentes Shadcn/UI.
status: mvp
statusLabel: MVP
stack:
  - Next.js 15
  - React 19
  - TailwindCSS
  - Shadcn/UI
  - React Beautiful DnD
  - Zod
  - TypeScript
tags:
  - Frontend
  - Modern React
image: /screenshots/crm-dashboard.png
featured: true
order: 5
---

## El Problema

Construir un CRM moderno que demuestre patrones avanzados de React: server components,
validación type-safe, drag-and-drop, y un sistema de componentes mantenible.

## Mi Enfoque

- **Next.js 15 con App Router**: Server y Client Components, layouts anidados.
- **Shadcn/UI**: Componentes accesibles y personalizables como base del design system.
- **React Beautiful DnD**: Kanban board para pipeline de ventas con drag-and-drop fluido.
- **Zod + React Hook Form**: Validación end-to-end type-safe.

## Aprendizajes

- Shadcn/UI es superior a librerías como MUI para proyectos donde necesitas control
  total del estilo — el código vive en tu repo, no en node_modules.
- La combinación Zod + TypeScript + React Hook Form elimina una categoría entera de bugs
  en formularios.
