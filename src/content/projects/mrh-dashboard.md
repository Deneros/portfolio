---
title: MRH Services
description: Marketplace de contratación de servicios para el hogar con geolocalización, validación de certificaciones por estado y gestión de tareas.
longDescription: |
  Plataforma que conecta clientes con proveedores de servicios para el hogar (limpieza,
  electricidad, plomería, handyman). Incluye geolocalización de proveedores y clientes
  con Leaflet, validación de certificaciones requeridas según el estado de EEUU,
  sistema de agenda y seguimiento de tareas en tiempo real.
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
  - Marketplace
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

En Estados Unidos, contratar servicios para el hogar es fragmentado: los clientes
buscan en múltiples plataformas, no saben qué servicios requieren certificación en
su estado, y no tienen forma de rastrear el progreso del trabajo contratado.

## Mi Enfoque

### Marketplace con geolocalización

- **Mapas Leaflet**: Visualización de proveedores disponibles cerca del cliente y
  ubicación de tareas activas. Los proveedores aparecen con su radio de cobertura
  y especialidades.
- **Búsqueda por servicio y ubicación**: Filtros por tipo de servicio (limpieza,
  electricidad, plomería, handyman, etc.) y distancia máxima.

### Validación de certificaciones

- Algunos servicios requieren certificación según el estado (electricistas, plomeros,
  HVAC). El sistema valida que el proveedor tenga las certificaciones vigentes para
  operar en el estado del cliente antes de permitir la contratación.

### Gestión de tareas

- **Creación de tareas**: El cliente describe el trabajo, selecciona categoría, adjunta
  fotos y elige fecha/hora preferida.
- **Agenda integrada**: Vista de calendario para proveedores con sus tareas asignadas,
  horarios disponibles y zona de servicio.
- **Seguimiento**: Cada tarea tiene estados (pendiente, aceptada, en progreso, completada)
  con notificaciones en cada transición.

### Dashboard de métricas

- **Recharts**: Gráficos de tareas completadas, ingresos por período, distribución
  por tipo de servicio y ratings promedio.
- **Panel de proveedor**: Perfil con historial de trabajos, certificaciones, calificaciones
  y zona de cobertura editable en el mapa.

### Decisiones técnicas clave

- **Leaflet sobre Google Maps/Mapbox**: Open source, sin costos por request — crítico
  para un marketplace donde cada búsqueda genera múltiples renders del mapa.
- **Radix UI**: Componentes headless accesibles para filtros, selects, modals y
  formularios complejos de creación de tareas.
- **React Hook Form + Zod**: Validación de formularios de registro de proveedores con
  campos dinámicos según el tipo de servicio y estado.

## Aprendizajes

- Las certificaciones varían enormemente entre estados — lo que en Texas no requiere
  licencia, en California sí. El sistema de reglas tiene que ser configurable por estado.
- Los mapas con muchos markers de proveedores requieren clustering para mantener
  rendimiento en zonas densas.
- La UX de un marketplace de dos lados (cliente/proveedor) requiere flujos completamente
  diferentes para cada rol.
