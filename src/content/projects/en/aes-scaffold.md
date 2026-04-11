---

title: AES ERP System
description: Enterprise ERP system with modular architecture, advanced data tables, and state management with Zustand.
longDescription: |
  Modular ERP for business management with advanced data tables (sorting, filters,
  server-side pagination), dynamic forms, reports with Recharts, and configurable
  decision tables for calculation rules. Backend with Spring Boot and Clean Architecture.
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
lang: en
slug: aes-scaffold
---


## The Problem

Develop a modular ERP that handles complex operations: data tables with advanced
filters, reports, dynamic forms, and role-based permission management.

## My Approach

- **Backend (Spring Boot)**: Modular REST API with separation by business domains.
- **Frontend (React 18 + TypeScript)**: Component system built on Radix UI
  for native accessibility. TanStack Table for tables with sorting, filters, and
  server-side pagination.
- **State**: Zustand for lightweight global state. TanStack Query for server state with
  cache and automatic invalidation.

### Key Technical Decisions

- **Radix UI over MUI/Ant Design**: Headless components that allow full design control
  without fighting against the library's styles.
- **Zustand over Redux**: For an ERP with independent modules, small and focused
  stores are more maintainable than a monolithic store.
- **TanStack Table**: The ERP tables require features like column resizing,
  row selection, and virtual scrolling that TanStack handles natively.

## Current Status

The component system is complete with data tables, charts, forms, and modals.
Backend integration is in progress with the ERP's core modules.
