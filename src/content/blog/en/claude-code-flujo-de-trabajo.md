---
title: "Claude Code: Agile AI-Driven Development"
description: "My complete workflow with Claude Code — from planning with AGENTS.md and requirements.md to TDD, SDD, e2e testing, custom skills, planning mode, memory systems, and automated documentation."
date: "2026-04-01"
tags:
  - AI
  - Tooling
  - Productivity
  - Testing
readTime: "15 min"
draft: false
lang: en
slug: claude-code-flujo-de-trabajo
---

I've been using Claude Code as my primary development tool for months. Not as a glorified autocomplete — as a **pair programmer** that understands my project, my conventions, and the way I work. This isn't a feature tutorial — it's a complete development workflow I call **Agile AI-Driven Development**.

## The philosophy: AI as a team member

Most developers use AI to generate snippets. I use it as a full cycle:

1. **Planning** → Claude analyzes requirements and proposes architecture
2. **Specification** → SDD (Spec Driven Development) — contracts first, code later
3. **Implementation** → TDD for domain logic
4. **Testing** → Unit tests, integration, e2e
5. **Documentation** → Generated from actual code, not made up
6. **Review** → Claude reviews its own changes against the conventions

The key is knowing when to use **SDD** and when to use **TDD** — they don't compete, they complement each other. Let's see how.

## AGENTS.md: the project's brain

Before `CLAUDE.md` existed, I was already using context files. Now the structure is more sophisticated:

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

But the key file that changed my workflow is the **`AGENTS.md`** at the project root:

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

When Claude opens the project, it reads this first. I don't have to explain the architecture in every conversation.

## Requirements.md: planning before code

Before writing a single line of code, I create a `requirements.md`:

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

I pass this file to Claude in **planning mode** and ask it to design the solution before implementing anything.

## Planning mode: think before you act

Claude Code has a planning mode that changes its behavior — it analyzes, proposes, and waits for approval before touching code. Here's how I use it:

```
> /plan Implementar tablas de decisión según requirements.md
```

Claude reads the requirements, analyzes the existing architecture, and proposes:

- Required domain entities
- Use cases with their ports
- REST endpoints
- Editable table structure on the frontend
- Flyway migration plan

I review, adjust, approve. Only then does it start implementing. This prevents 80% of rework.

## SDD: Spec Driven Development — the contract first

SDD (Spec Driven Development) means writing the specification before the code. Instead of coding an endpoint and documenting it afterward, **you define the OpenAPI contract first** and generate code from there.

Why? Because the frontend can't wait for the backend to finish. With the spec defined, both teams (or both Claude Code instances) work in parallel.

My SDD workflow with Claude Code:

```
> Define el OpenAPI spec para el módulo de certificaciones.
> Endpoints: CRUD + suspender + reactivar.
> Incluye schemas de request/response, códigos de error, y ejemplos.
```

Claude generates the spec:

```yaml
# openapi/certifications.yml
paths:
  /api/certifications/{id}/suspend:
    patch:
      summary: Suspender certificación activa
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SuspendRequest'
      responses:
        '204':
          description: Certificación suspendida
        '400':
          description: Certificación no está activa
        '404':
          description: Certificación no encontrada

components:
  schemas:
    SuspendRequest:
      type: object
      required: [reason]
      properties:
        reason:
          type: string
          minLength: 10
          example: "No conformidad mayor en auditoría #45"
```

From this spec:
- The **backend** generates controller interfaces and DTOs with OpenAPI Generator
- The **frontend** generates a typed API client automatically
- The **documentation** is already written — it's the spec itself

### When do I use SDD?

- APIs consumed by the frontend or other services
- Contracts between microservices
- When frontend and backend are developed in parallel
- Third-party integrations (define the contract before implementing)

## TDD: domain logic gets tested first

TDD is for what the spec **doesn't cover** — the internal logic. The spec defines that `PATCH /suspend` returns 204 or 400, but it doesn't define *how* the validation works internally.

My TDD workflow with Claude Code:

1. I define the expected behavior in plain language
2. Claude writes the failing test
3. Claude implements the minimum code to make it pass
4. We refactor together

```
> Necesito un caso de uso SuspendCertificationUseCase.
> Solo certificaciones ACTIVE pueden suspenderse.
> Debe notificar al cliente cuando se suspende.
> Escribe el test primero.
```

Claude generates:

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

Then it implements the UseCase. The test already defines the contract — the implementation is mechanical.

### When do I use TDD?

- Domain logic (business rules, validations, calculations)
- Use cases with complex edge cases
- Refactoring — tests protect you from breaking existing behavior
- Any code where a bug would be costly to detect in production

## SDD + TDD: the full combo

In practice, I use both on the same feature:

```
1. SDD → Defino el spec OpenAPI (qué endpoints, qué contratos)
2. TDD → Escribo tests para la lógica de dominio (cómo funciona internamente)
3. Implemento el dominio (pasa los tests)
4. Implemento el controller (cumple el spec)
5. Tests de integración (el spec + la lógica funcionan juntos)
```

**SDD defines the WHAT** (the public contract). **TDD validates the HOW** (the internal behavior). They don't compete — each one covers a different layer of the system.

## Skills: reusable capabilities

Skills are like plugins for Claude Code. I define capabilities that activate based on context:

- **`/review`**: Reviews changes against Clean Architecture, detects layer violations
- **`/test`**: Identifies modified modules and runs only relevant tests
- **`/deploy`**: Full build, test, and deploy flow to Dokploy
- **`/plan`**: Enters planning mode to analyze requirements

Review skill example:

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

## Testing: unit, integration, and e2e

### Unit tests (domain/)

The most valuable and fastest. They run in milliseconds because they don't depend on anything external:

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

### Integration tests (infrastructure/)

These validate that adapters work with real systems:

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

### E2E tests

For the frontend I use Playwright. Claude Code can run the tests and analyze failures:

```
> Corre los tests e2e del módulo de certificaciones.
> Si alguno falla, lee el screenshot de error y diagnostica.
```

Claude runs `npx playwright test`, reads the results, and if there are failures, analyzes the screenshots that Playwright captures automatically.

## Memory system

Claude Code has a persistent memory system based on markdown files. I can give it instructions it remembers between conversations:

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

The memory also stores feedback from previous sessions. If I correct Claude ("don't use that library, use this one instead"), it remembers for the next conversation.

## Hooks: cycle automation

Hooks execute shell commands in response to events:

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

Every commit goes through linting and tests automatically. No excuses, no "I'll fix it later."

## MCPs: external tools

MCPs (Model Context Protocol) connect Claude with external tools:

- **Chrome DevTools**: Debug the frontend directly from Claude. "Take a screenshot of /dashboard" and it shows me how it looks.
- **Notion**: Create tasks from the planning conversation.
- **Stitch**: Generate UI components from text.

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

## Workspace separation

In projects with separate frontend and backend, I open **two Claude Code instances** — one per workspace:

- **Backend workspace**: Only sees Java/Python code, Docker configs, and SQL migrations.
- **Frontend workspace**: Only sees React components, styles, and UI tests.

Context matters. If Claude is looking at 500 frontend files while I'm working on a Spring Boot endpoint, the noise degrades response quality.

## Agents and sub-agents

For complex tasks, Claude Code creates sub-agents that work in parallel:

- One agent investigates the code structure
- Another runs tests
- Another reviews documentation

This is useful when refactoring an entire module: the main agent coordinates while the sub-agents do the heavy lifting.

## Automated documentation

One of the most useful workflows: generating documentation from actual code.

```
> Documenta el módulo de certificaciones.
> Lee los UseCases, los endpoints, y los tests.
> Genera docs que reflejen lo que el código HACE, no lo que debería hacer.
```

Claude reads the current code, the tests (which are the living specification), and generates accurate documentation. If the code changes, I regenerate the docs and they're always up to date.

## What works well

1. **Guided refactoring**: "Migrate this service from a flat structure to Clean Architecture" — Claude understands the layers and moves code correctly.
2. **Debug with context**: I pass it an error, it reads the relevant files, and proposes fixes that consider the architecture.
3. **Real TDD**: It doesn't just generate tests — it understands what to test in each layer.
4. **Planning**: Planning mode prevents building the wrong thing.

## What does NOT work well

1. **Business decisions**: Claude doesn't know if your client wants ISO 9001 before ISO 14001.
2. **Premature optimization**: It tends to over-optimize if you don't rein it in.
3. **Cross-repo context**: If your microservice depends on another repo, Claude doesn't have that visibility.

## The complete workflow

```
Requirements.md → /plan → SDD (spec OpenAPI) → TDD (domain logic) → Implementación → /review → /test → Deploy
```

- **Requirements.md**: What will be built and why
- **SDD**: API contracts — frontend and backend work in parallel
- **TDD**: Domain logic tested before implementation
- **Review + Test**: Automated validation against conventions

Every step has its tool, its skill, and its feedback loop. It's not magic — it's structure. The difference between "AI that generates mediocre code" and "AI that is genuinely useful" lies in how much process you give it, not how much prompt engineering.

Don't use Claude Code as a code generator. Use it as a **complete development process** with a senior colleague who never gets tired, never gets distracted, and always remembers your conventions.
