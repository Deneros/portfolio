---
title: "Claude Code: Agile AI-Driven Development"
description: "Mi flujo completo con Claude Code — desde planificación con AGENTS.md y requirements.md hasta TDD, SDD, testing e2e, skills personalizados, modo planning, memorias y documentación automatizada."
date: "2026-04-01"
tags:
  - AI
  - Tooling
  - Productivity
  - Testing
readTime: "15 min"
draft: false
---

Llevo meses usando Claude Code como mi herramienta principal de desarrollo. No como un autocompletado glorificado — como un **par de programación** que entiende mi proyecto, mis convenciones, y mi forma de trabajar. Esto no es un tutorial de features — es un flujo de desarrollo completo que llamo **Agile AI-Driven Development**.

## La filosofía: AI como miembro del equipo

La mayoría de desarrolladores usan AI para generar snippets. Yo la uso como un ciclo completo:

1. **Planificación** → Claude analiza requirements y propone arquitectura
2. **Diseño** → SDD (Software Design Document) generado colaborativamente
3. **Implementación** → TDD con Claude escribiendo tests primero
4. **Testing** → Unit tests, integración, e2e
5. **Documentación** → Generada desde el código real, no inventada
6. **Review** → Claude revisa sus propios cambios contra las convenciones

Cada paso tiene su herramienta en Claude Code. Veamos.

## AGENTS.md: el cerebro del proyecto

Antes de `CLAUDE.md` existía, yo ya usaba archivos de contexto. Ahora la estructura es más sofisticada:

```
.claude/
├── CLAUDE.md              # Contexto general y convenciones
├── commands/              # Comandos personalizados (/review, /test, etc.)
│   ├── review.md
│   ├── test.md
│   ├── deploy.md
│   └── plan.md
├── settings.json          # Hooks y configuración
└── skills/                # Skills reutilizables
```

Pero el archivo clave que cambió mi flujo es el **`AGENTS.md`** en la raíz del proyecto:

```markdown
# Proyecto AES - Sistema ERP de Certificación

## Contexto
Sistema ERP para gestión de certificaciones ISO. Multi-tenant,
Clean Architecture, deploy con Dokploy.

## Stack
- Backend: Spring Boot 3.5, Java 21, PostgreSQL, Flyway
- Frontend: React 18, TypeScript, Vite, TanStack Table/Query
- Infra: Docker Compose, Dokploy, Jenkins, SonarQube

## Reglas inquebrantables
1. Clean Architecture: domain/ NO importa nada de Spring/JPA
2. DTOs en CADA frontera — nunca exponer entidades
3. MapStruct para mapeo entre capas
4. Tests unitarios en domain/, integración en infrastructure/
5. Cada endpoint tiene su UseCase — no lógica en controllers

## Estructura de carpetas
domain/ → model, exception, valueobject
application/ → usecase, port/in, port/out, dto
infrastructure/ → persistence, config, external
interfaces/ → rest, dto (request/response)
```

Cuando Claude abre el proyecto, lee esto primero. No tengo que explicar la arquitectura en cada conversación.

## Requirements.md: planificación antes de código

Antes de escribir una línea de código, creo un `requirements.md`:

```markdown
# Feature: Tablas de decisión para reglas de cálculo

## Objetivo
Permitir a auditores configurar reglas de cálculo sin modificar código.
Las reglas determinan scores, penalizaciones y umbrales por norma ISO.

## Usuarios
- Auditor senior: crea y modifica reglas
- Auditor: ejecuta auditorías con las reglas vigentes
- Admin: gestiona normas y categorías

## Funcionalidades
### Must-have
- CRUD de tablas de decisión
- Motor de evaluación de reglas
- Historial de cambios en reglas
- Validación de conflictos entre reglas

### Nice-to-have
- Import/export de reglas en CSV
- Simulación de reglas antes de activar
- Versionado de conjuntos de reglas

## Restricciones
- Las reglas se evalúan server-side (Spring Boot)
- El frontend renderiza tablas editables (TanStack Table)
- Máximo 1000 reglas por norma (rendimiento)
```

Le paso este archivo a Claude en **modo planning** y le pido que diseñe la solución antes de implementar.

## Modo Planning: pensar antes de actuar

Claude Code tiene un modo planning que cambia su comportamiento — analiza, propone y espera aprobación antes de tocar código. Lo uso así:

```
> /plan Implementar tablas de decisión según requirements.md
```

Claude lee el requirements, analiza la arquitectura existente, y propone:

- Entidades de dominio necesarias
- Casos de uso con sus puertos
- Endpoints REST
- Estructura de la tabla editable en frontend
- Plan de migración Flyway

Yo reviso, ajusto, apruebo. Recién entonces empieza a implementar. Esto previene el 80% del retrabajo.

## TDD: Tests primero, siempre

Mi flujo de TDD con Claude Code:

1. Defino el comportamiento esperado en lenguaje natural
2. Claude escribe el test que falla
3. Claude implementa el código mínimo para que pase
4. Refactorizamos juntos

```
> Necesito un caso de uso SuspendCertificationUseCase.
> Solo certificaciones ACTIVE pueden suspenderse.
> Debe notificar al cliente cuando se suspende.
> Escribe el test primero.
```

Claude genera:

```java
@Test
void shouldSuspendActiveCertification() {
    var cert = CertificationMother.active();
    when(repository.findById("cert-1")).thenReturn(Optional.of(cert));

    useCase.execute("cert-1", "No conformidad mayor");

    assertThat(cert.getStatus()).isEqualTo(SUSPENDED);
    verify(repository).save(cert);
    verify(notificationPort).notifySuspension(cert);
}

@Test
void shouldRejectSuspensionOfInactiveCertification() {
    var cert = CertificationMother.withStatus(EXPIRED);
    when(repository.findById("cert-1")).thenReturn(Optional.of(cert));

    assertThatThrownBy(() -> useCase.execute("cert-1", "razón"))
        .isInstanceOf(InvalidOperationException.class);
}
```

Después implementa el UseCase. El test ya define el contrato — la implementación es mecánica.

## SDD: Software Design Document

Para features complejas, genero un SDD antes de implementar. Es más detallado que el requirements:

```
> /plan Genera un SDD para el módulo de tablas de decisión.
> Incluye: modelo de datos, API contracts, flujo de evaluación,
> y edge cases.
```

El SDD resultante incluye:

- **Modelo de dominio**: Entidades, value objects, relaciones
- **API contracts**: Endpoints con request/response de ejemplo
- **Flujo de evaluación**: Cómo el motor procesa las reglas
- **Edge cases**: Conflictos de reglas, reglas circulares, performance
- **Plan de migración**: Scripts Flyway con rollback

Guardo el SDD en `docs/design/` y lo referencio durante la implementación. Claude lo lee y mantiene consistencia.

## Skills: capacidades reutilizables

Los skills son como plugins para Claude Code. Defino capacidades que se activan según el contexto:

- **`/review`**: Revisa cambios contra Clean Architecture, detecta violaciones de capas
- **`/test`**: Identifica módulos modificados y ejecuta solo tests relevantes
- **`/deploy`**: Flujo completo de build, test, y deploy a Dokploy
- **`/plan`**: Entra en modo planning para analizar requirements

Ejemplo de skill de review:

```markdown
Revisa los cambios en staging (git diff --staged).

Checklist:
1. ¿Hay imports de Spring/JPA en domain/?
2. ¿Se exponen entidades JPA fuera de infrastructure/?
3. ¿Cada endpoint tiene su UseCase?
4. ¿Los tests cubren el happy path Y los edge cases?
5. ¿Los DTOs tienen validaciones (@NotNull, @Size)?

Si encuentras violaciones, explica por qué es un problema
y sugiere el fix concreto.
```

## Testing: unitario, integración y e2e

### Tests unitarios (domain/)

Los más valiosos y rápidos. Corren en milisegundos porque no dependen de nada externo:

```java
// Puro Java, sin Spring, sin base de datos
@Test
void certificationExpiringSoonShouldReturnTrue() {
    var cert = new Certification(
        "id", ACTIVE, LocalDate.now().plusDays(5), NormType.ISO_9001
    );
    assertThat(cert.isExpiringSoon(30)).isTrue();
}
```

### Tests de integración (infrastructure/)

Validan que los adaptadores funcionan con sistemas reales:

```java
@SpringBootTest
@Testcontainers
class JpaCertificationRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldPersistAndRetrieveCertification() {
        var cert = CertificationMother.active();
        repository.save(cert);
        var found = repository.findById(cert.getId());
        assertThat(found).isPresent();
    }
}
```

### Tests e2e

Para el frontend uso Playwright. Claude Code puede correr los tests y analizar failures:

```
> Corre los tests e2e del módulo de certificaciones.
> Si alguno falla, lee el screenshot de error y diagnostica.
```

Claude ejecuta `npx playwright test`, lee los resultados, y si hay failures, analiza los screenshots que Playwright captura automáticamente.

## Sistema de memoria

Claude Code tiene un sistema de memoria persistente basado en archivos markdown. Puedo darle instrucciones que recuerda entre conversaciones:

```markdown
# CLAUDE.md

## Convenciones
- Clean Architecture (domain/application/infrastructure/interfaces)
- DTOs en cada frontera, nunca exponer entidades JPA
- MapStruct para mapeo entre capas

## Feedback
- NO agregar comentarios obvios al código
- NO crear abstracciones prematuras
- Preferir código explícito sobre "clever code"
```

La memoria también guarda feedback de sesiones anteriores. Si corrijo a Claude ("no uses esa librería, usa esta otra"), lo recuerda para la próxima conversación.

## Hooks: automatización del ciclo

Los hooks ejecutan comandos shell en respuesta a eventos:

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

Cada commit pasa linting y tests automáticamente. Sin excusas, sin "después lo fixeo".

## MCPs: herramientas externas

Los MCPs (Model Context Protocol) conectan Claude con herramientas externas:

- **Chrome DevTools**: Debuggear frontend directamente desde Claude. "Toma un screenshot de /dashboard" y me muestra cómo se ve.
- **Notion**: Crear tareas desde la conversación de planificación.
- **Stitch**: Generar componentes UI desde texto.

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

El contexto importa. Si Claude está viendo 500 archivos de frontend mientras trabajo en un endpoint de Spring Boot, el ruido degrada la calidad de las respuestas.

## Agentes y sub-agentes

Para tareas complejas, Claude Code crea sub-agentes que trabajan en paralelo:

- Un agente investiga la estructura del código
- Otro ejecuta tests
- Otro revisa documentación

Esto es útil cuando refactorizo un módulo completo: el agente principal coordina mientras los sub-agentes hacen el trabajo pesado.

## Documentación automatizada

Uno de los flujos más útiles: generar documentación desde el código real.

```
> Documenta el módulo de certificaciones.
> Lee los UseCases, los endpoints, y los tests.
> Genera docs que reflejen lo que el código HACE, no lo que debería hacer.
```

Claude lee el código actual, los tests (que son la especificación viva), y genera documentación precisa. Si el código cambia, regenero los docs y siempre están actualizados.

## Lo que funciona bien

1. **Refactoring guiado**: "Migra este servicio de la estructura plana a Clean Architecture" — Claude entiende las capas y mueve código correctamente.
2. **Debug con contexto**: Le paso un error, él lee los archivos relevantes, y propone fixes que consideran la arquitectura.
3. **TDD real**: No solo genera tests — entiende qué testear en cada capa.
4. **Planificación**: El modo planning previene construir lo incorrecto.

## Lo que NO funciona bien

1. **Decisiones de negocio**: Claude no sabe si tu cliente quiere ISO 9001 antes que ISO 14001.
2. **Optimización prematura**: Tiende a sobre-optimizar si no lo frenas.
3. **Contexto cross-repo**: Si tu microservicio depende de otro repo, Claude no tiene esa visibilidad.

## El flujo completo

```
Requirements.md → /plan → SDD → TDD (test → impl → refactor) → /review → /test → Deploy
```

Cada paso tiene su herramienta, su skill, y su feedback loop. No es magia — es estructura. La diferencia entre "IA que genera código mediocre" e "IA que es genuinamente útil" está en cuánto proceso le das, no cuánto prompt engineering.

No uses Claude Code como un generador de código. Úsalo como un **proceso de desarrollo completo** con un colega senior que nunca se cansa, nunca se distrae, y siempre recuerda tus convenciones.
