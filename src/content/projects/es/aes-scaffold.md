---

title: AES ERP System
description: Sistema ERP empresarial con arquitectura modular, data tables avanzadas y gestión de estado con Zustand.
longDescription: |
  ERP modular para gestión empresarial con tablas de datos avanzadas (sorting, filtros,
  paginación server-side), formularios dinámicos, reportes con Recharts, y tablas de
  decisión configurables para reglas de cálculo. Backend con Spring Boot y Clean Architecture.
status: development
statusLabel: In Development
stack:
  - Spring Boot
  - Java
  - React 18
  - TypeScript
  - Vite
  - Radix UI
  - TanStack Table
  - TanStack Query
  - Zustand
  - Recharts
  - TailwindCSS
tags:
  - Enterprise
  - Full-Stack
  - Architecture
image: /screenshots/aes-dashboard.png
gallery:
  - /screenshots/aes-dashboard.png
  - /screenshots/aes-formbuilder.png
  - /screenshots/aes-scheduling.png
featured: false
order: 6
lang: es
slug: aes-scaffold
---


## El Problema

Desarrollar un ERP modular que maneje operaciones complejas: tablas de datos con filtros
avanzados, reportes, formularios dinámicos y gestión de permisos por rol.

## Mi Enfoque

- **Backend (Spring Boot)**: API REST modular con separación por dominios de negocio.
- **Frontend (React 18 + TypeScript)**: Sistema de componentes construido sobre Radix UI
  para accesibilidad nativa. TanStack Table para tablas con sorting, filtros y paginación
  server-side.
- **Estado**: Zustand para estado global ligero. TanStack Query para server state con
  caché y invalidación automática.

### Decisiones técnicas clave

- **Radix UI sobre MUI/Ant Design**: Componentes headless que permiten control total
  del diseño sin luchar contra estilos de la librería.
- **Zustand sobre Redux**: Para un ERP con módulos independientes, stores pequeños y
  focalizados son más mantenibles que un store monolítico.
- **TanStack Table**: Las tablas del ERP requieren features como column resizing,
  row selection, y virtual scrolling que TanStack maneja nativamente.

## Estado Actual

El sistema de componentes está completo con data tables, charts, formularios y modals.
La integración backend está en progreso con los módulos core del ERP.
