---
title: "Claude Code: mi flujo de trabajo diario"
description: "Cómo uso Claude Code en el día a día — sistema de memoria, hooks, comandos personalizados, MCPs, y separación de workspaces para frontend y backend."
date: "2026-04-01"
tags:
  - AI
  - Tooling
  - Productivity
readTime: "8 min"
draft: false
---

Llevo meses usando Claude Code como mi herramienta principal de desarrollo. No como un autocompletado glorificado — como un **par de programación** que entiende mi proyecto, mis convenciones, y mi forma de trabajar. Aquí está cómo lo configuro y uso.

## El sistema de memoria

Claude Code tiene un sistema de memoria persistente basado en archivos markdown. Esto significa que puedo darle instrucciones que recuerda entre conversaciones.

La estructura clave:

```
.claude/
├── CLAUDE.md          # Contexto general del proyecto
├── commands/          # Comandos personalizados
│   ├── review.md      # /review - revisa código
│   ├── test.md        # /test - ejecuta tests
│   └── deploy.md      # /deploy - flujo de deploy
└── settings.json      # Hooks y configuración
```

El `CLAUDE.md` es donde defino las reglas del proyecto:

```markdown
# Proyecto AES - Sistema de Certificación

## Stack
- Backend: Spring Boot 3.5, Java 21
- Frontend: React 18, TypeScript, Vite
- DB: PostgreSQL con Flyway

## Convenciones
- Clean Architecture (domain/application/infrastructure/interfaces)
- DTOs en cada frontera, nunca exponer entidades JPA
- MapStruct para mapeo entre capas
- Tests unitarios en dominio, integración en infrastructure
```

Con esto, cada vez que abro una conversación, Claude ya sabe cómo está organizado mi proyecto.

## Comandos personalizados

Los comandos en `.claude/commands/` son markdown que se ejecutan con `/nombre`. Los que más uso:

**`/review`** — Revisa el código que cambié:
```markdown
Revisa los cambios en staging (git diff --staged).
Enfócate en: seguridad, rendimiento, y violaciones de Clean Architecture.
No sugieras cambios cosméticos.
```

**`/test`** — Ejecuta tests relevantes:
```markdown
Identifica qué módulos fueron modificados y ejecuta solo los tests
relacionados. Si hay tests fallando, analiza la causa antes de
sugerir fixes.
```

## Hooks: automatización del ciclo

Los hooks ejecutan comandos shell en respuesta a eventos. Los configuro en `settings.json`:

```json
{
  "hooks": {
    "pre-commit": "npm run lint && npm run test:unit",
    "post-tool-call": {
      "edit": "echo 'File modified: check conventions'"
    }
  }
}
```

Esto asegura que cada commit pasa linting y tests sin que yo tenga que recordarlo.

## MCPs: herramientas externas

Los MCPs (Model Context Protocol) conectan Claude con herramientas externas. Los que uso:

- **Chrome DevTools**: Para debuggear frontend directamente desde Claude. Le pido "toma un screenshot" y me muestra cómo se ve la página.
- **Notion**: Para crear tareas directamente desde la conversación de planificación.

Configuración en el proyecto:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["@anthropic/mcp-chrome-devtools"]
    }
  }
}
```

## Separación de workspaces

En proyectos con frontend y backend separados, abro **dos instancias de Claude Code** — una por workspace:

- **Backend workspace**: Solo ve código Java/Python, configuraciones Docker, y migraciones SQL.
- **Frontend workspace**: Solo ve componentes React, estilos, y tests de UI.

¿Por qué? Porque el contexto importa. Si Claude está viendo 500 archivos de frontend mientras trabajo en un endpoint de Spring Boot, el ruido degrada la calidad de las respuestas.

## Agentes y sub-agentes

Para tareas complejas, Claude Code puede crear sub-agentes que trabajan en paralelo:

- Un agente investiga la estructura del código
- Otro ejecuta tests
- Otro revisa documentación

Esto es útil cuando necesito refactorizar un módulo completo: el agente principal coordina mientras los sub-agentes hacen el trabajo pesado.

## Lo que funciona bien

1. **Refactoring guiado**: "Migra este servicio de la estructura plana a Clean Architecture" — Claude entiende las capas y mueve código correctamente.
2. **Debug con contexto**: Le paso un error, él lee los archivos relevantes, y propone fixes que consideran la arquitectura.
3. **Generación de tests**: Entiende qué testear en cada capa (unitarios en dominio, integración en infra).
4. **Documentación**: Genera docs que reflejan el código actual, no documentación genérica.

## Lo que NO funciona bien

1. **Decisiones de negocio**: Claude no sabe si tu cliente quiere ISO 9001 antes que ISO 14001.
2. **Optimización prematura**: Tiende a sobre-optimizar si no lo frenas.
3. **Contexto cross-repo**: Si tu microservicio depende de otro repo, Claude no tiene esa visibilidad.

## Mi consejo

No uses Claude Code como un generador de código. Úsalo como un **colega senior** que conoce tu codebase. Dale contexto en CLAUDE.md, crea comandos para tus flujos repetitivos, y separa workspaces para mantener el foco.

La diferencia entre "IA que genera código mediocre" e "IA que es genuinamente útil" está en cuánto contexto le das.
