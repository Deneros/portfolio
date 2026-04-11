---
title: "Planning with AI before writing a single line of code"
description: "How I use Claude and other AI tools to plan software projects: from the PRD to task generation in Notion, before ever opening the IDE."
date: "2026-03-28"
tags:
  - AI
  - Productivity
  - Best Practices
readTime: "7 min"
draft: false
lang: en
slug: planificacion-con-ia-antes-de-programar
---

The most expensive mistake in software isn't a bug — it's building the wrong thing. After several projects where lack of planning cost me weeks of rework, I developed a planning workflow with AI that I use before writing the first line of code.

## The problem: coding without thinking

We've all done it. You receive a requirement, open the IDE, and start coding. Three days later you discover you didn't account for a fundamental edge case and have to restructure everything.

AI doesn't replace planning — it **accelerates and structures it**.

## My planning workflow

### 1. Define what's being built

Before any prompt, I answer these questions in plain text:

- **What is being built?** — In one sentence.
- **What's the expected outcome?** — What success looks like.
- **What are the necessary steps?** — High level, no code.
- **Where can it fail?** — The critical points we always ignore.
- **What tools will be used?** — Stack, services, integrations.

This seems obvious, but writing it down forces clarity. If you can't explain the project in 5 lines, you're not ready to code.

### 2. Generate the PRD with AI

With those answers, I ask Claude to generate a **Product Requirements Document (PRD)**. Not a 50-page document — a practical one:

```
Con base en esta descripción del proyecto, genera un PRD que incluya:
- Objetivo del producto
- Usuarios objetivo
- Funcionalidades core (must-have vs nice-to-have)
- Restricciones técnicas
- Criterios de aceptación por funcionalidad
- Riesgos identificados
```

The generated PRD isn't perfect, but it's a **solid starting point** that I then refine. It saves me 2-3 hours of writing from scratch.

### 3. Create the Agents.md

For projects where I use Claude Code, I generate an `AGENTS.md` file that defines:

- The project context
- Code conventions
- Folder structure
- Available commands
- Constraints (what NOT to do)

This gives the AI the context it needs to be useful without having to re-explain everything in every conversation.

### 4. From PRD to tasks in Notion

Once I have the validated PRD, I use an MCP to automatically create tasks in Notion. Each PRD feature becomes:

- An epic with its description
- Stories broken down with acceptance criteria
- Estimated technical tasks

This transforms a static document into an actionable backlog in minutes.

## Tools I use

- **Claude Code**: For planning, PRD generation, and pair programming. The memory system with `.claude/commands` lets me save repetitive instructions as reusable commands.
- **Obsidian**: For documenting decisions and project knowledge. My planning notes live here.
- **Notion**: For task management and tracking.

## Failure points I always consider

AI is excellent at generating the "happy path." But projects fail at the edges:

1. **Authentication and permissions**: Who can do what? How many roles are there? Is there 2FA?
2. **States and transitions**: What happens if an object is in state X and action Y arrives?
3. **Concurrency**: What happens when two users edit the same thing?
4. **External integrations**: What happens when the external API fails?
5. **Data migration**: Is there existing data? In what format?

I explicitly ask the AI to identify these points in each feature.

## What I do NOT delegate to AI

- **Architecture decisions**: AI can suggest options, but the final decision requires context about the team, existing infrastructure, and business constraints.
- **Stakeholder validation**: An AI-generated PRD needs human review. Clients don't speak in user stories.
- **Time estimates**: AI doesn't know how fast your team works. Only you know that.

## Result

This workflow has saved me an average of 30-40% of planning time. But more important than the time saved is the **quality**: I arrive at the code with a clear understanding of what to build, why, and where it can fail.

The best line of code is the one you don't have to rewrite. And that starts with planning.
