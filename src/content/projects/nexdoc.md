---
title: Nexdoc
description: Plataforma B2B de gestión documental con búsqueda semántica por AI y pipeline RAG.
longDescription: |
  Sistema de gestión documental inteligente que permite a empresas organizar, buscar y consultar
  documentos usando inteligencia artificial. Implementa búsqueda semántica con embeddings vectoriales
  y un pipeline RAG para responder preguntas sobre el contenido de los documentos.
status: mvp
statusLabel: MVP
stack:
  - Spring Boot 3.5
  - Java 21
  - React 19
  - FastAPI
  - PostgreSQL
  - pgvector
  - Ollama
  - Celery
  - Docker
  - Flyway
  - DDD
tags:
  - AI
  - Full-Stack
  - Architecture
image: /screenshots/nexdoc-dashboard.png
featured: true
order: 1
---

## El Problema

Las empresas acumulan grandes volúmenes de documentos sin una forma eficiente de buscar
y extraer información relevante. Las búsquedas por keyword fallan cuando el usuario
no conoce los términos exactos del documento.

## Mi Enfoque

Diseñé una arquitectura de 3 servicios con Domain-Driven Design:

- **Backend (Spring Boot 3.5 / Java 21)**: API REST con DDD, migraciones con Flyway,
  gestión de documentos y metadatos.
- **Servicio AI (FastAPI / Python)**: Pipeline de indexación con embeddings vectoriales
  usando pgvector. Procesamiento asíncrono con Celery para documentos grandes.
- **Frontend (React 19 / Vite)**: Interfaz de búsqueda y gestión documental.

### Decisiones técnicas clave

- **pgvector sobre Pinecone/Weaviate**: Mantener todo en PostgreSQL simplifica la
  infraestructura y reduce costos. Para el volumen esperado, pgvector con índices HNSW
  ofrece rendimiento suficiente.
- **Ollama para embeddings locales**: Privacidad de datos — los documentos empresariales
  no salen del servidor.
- **DDD en el backend**: La lógica de dominio (documentos, permisos, indexación) es lo
  suficientemente compleja para justificar bounded contexts separados.

## Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React SPA  │────▶│  Spring Boot API │────▶│  PostgreSQL  │
└─────────────┘     └──────────────────┘     │  + pgvector  │
                           │                 └─────────────┘
                           ▼                        ▲
                    ┌──────────────┐                │
                    │  FastAPI AI  │────────────────┘
                    │  + Celery    │
                    └──────────────┘
```

## Aprendizajes

- La calidad de los embeddings depende enormemente del chunking strategy — chunks muy
  grandes pierden especificidad, muy pequeños pierden contexto.
- Flyway + DDD requiere disciplina en cómo se organizan las migraciones por bounded context.
- Docker Compose con 5+ servicios necesita health checks bien configurados para evitar
  race conditions al iniciar.
