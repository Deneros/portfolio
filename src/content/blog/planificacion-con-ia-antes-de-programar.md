---
title: "Planificación con IA antes de escribir una línea de código"
description: "Cómo uso Claude y otras herramientas de IA para planificar proyectos de software: desde el PRD hasta la generación de tareas en Notion, antes de tocar el IDE."
date: "2026-03-28"
tags:
  - AI
  - Productivity
  - Best Practices
readTime: "7 min"
draft: false
---

El error más caro en software no es un bug — es construir lo incorrecto. Después de varios proyectos donde la falta de planificación me costó semanas de retrabajo, desarrollé un flujo de planificación con IA que uso antes de escribir la primera línea de código.

## El problema: programar sin pensar

Todos lo hemos hecho. Recibes un requerimiento, abres el IDE, y empiezas a codear. Tres días después descubres que no consideraste un edge case fundamental y tienes que reestructurar todo.

La IA no reemplaza la planificación — la **acelera y la estructura**.

## Mi flujo de planificación

### 1. Definir qué se va a construir

Antes de cualquier prompt, respondo estas preguntas en texto plano:

- **¿Qué se va a construir?** — En una oración.
- **¿Qué resultado se espera?** — Cómo se ve el éxito.
- **¿Cuáles son los pasos necesarios?** — Alto nivel, sin código.
- **¿Dónde puede fallar?** — Los puntos críticos que siempre ignoramos.
- **¿Qué herramientas se usarán?** — Stack, servicios, integraciones.

Esto parece obvio, pero escribirlo fuerza claridad. Si no puedes explicar el proyecto en 5 líneas, no estás listo para programar.

### 2. Generar el PRD con IA

Con esas respuestas, le pido a Claude que genere un **Product Requirements Document (PRD)**. No un documento de 50 páginas — uno práctico:

```
Con base en esta descripción del proyecto, genera un PRD que incluya:
- Objetivo del producto
- Usuarios objetivo
- Funcionalidades core (must-have vs nice-to-have)
- Restricciones técnicas
- Criterios de aceptación por funcionalidad
- Riesgos identificados
```

El PRD generado no es perfecto, pero es un **punto de partida sólido** que luego refino. Me ahorra 2-3 horas de redacción desde cero.

### 3. Crear el Agents.md

Para proyectos donde uso Claude Code, genero un archivo `AGENTS.md` que define:

- El contexto del proyecto
- Las convenciones de código
- La estructura de carpetas
- Los comandos disponibles
- Las restricciones (qué NO hacer)

Esto le da a la IA el contexto necesario para ser útil sin que tenga que re-explicar todo en cada conversación.

### 4. De PRD a tareas en Notion

Una vez tengo el PRD validado, uso un MCP para crear tareas en Notion automáticamente. Cada funcionalidad del PRD se convierte en:

- Un epic con su descripción
- Stories desglosadas con criterios de aceptación
- Tasks técnicas estimadas

Esto transforma un documento estático en un backlog actionable en minutos.

## Herramientas que uso

- **Claude Code**: Para planificación, generación de PRD, y pair programming. El sistema de memoria con `.claude/commands` me permite guardar instrucciones repetitivas como comandos reutilizables.
- **Obsidian**: Para documentar decisiones y conocimiento del proyecto. Mis notas de planificación viven aquí.
- **Notion**: Para gestión de tareas y seguimiento.

## Puntos de fallo que siempre considero

La IA es excelente generando el "happy path". Pero los proyectos fallan en los bordes:

1. **Autenticación y permisos**: ¿Quién puede hacer qué? ¿Cuántos roles hay? ¿Hay 2FA?
2. **Estados y transiciones**: ¿Qué pasa si un objeto está en estado X y llega la acción Y?
3. **Concurrencia**: ¿Qué pasa si dos usuarios editan lo mismo?
4. **Integraciones externas**: ¿Qué pasa cuando la API externa falla?
5. **Migración de datos**: ¿Hay datos existentes? ¿En qué formato?

Le pido explícitamente a la IA que identifique estos puntos en cada funcionalidad.

## Lo que NO delego a la IA

- **Decisiones de arquitectura**: La IA puede sugerir opciones, pero la decisión final requiere contexto del equipo, infraestructura existente, y restricciones de negocio.
- **Validación con stakeholders**: Un PRD generado por IA necesita revisión humana. Los clientes no hablan en user stories.
- **Estimaciones de tiempo**: La IA no sabe cuánto tarda tu equipo. Solo tú lo sabes.

## Resultado

Este flujo me ha ahorrado en promedio un 30-40% del tiempo de planificación. Pero más importante que el tiempo es la **calidad**: llego al código con un entendimiento claro de qué construir, por qué, y dónde puede fallar.

La mejor línea de código es la que no tienes que reescribir. Y eso empieza con planificación.
