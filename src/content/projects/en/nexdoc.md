---

title: Nexdoc
description: B2B document management platform with AI-powered semantic search and RAG pipeline.
longDescription: |
  Intelligent document management system that enables companies to organize, search, and query
  documents using artificial intelligence. Implements semantic search with vector embeddings
  and a RAG pipeline to answer questions about document content.
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
image: /screenshots/nexdoc-ask-ai.png
gallery:
  - /screenshots/nexdoc-ask-ai.png
  - /screenshots/nexdoc-dashboard.png
  - /screenshots/nexdoc-chat-history.png
  - /screenshots/nexdoc-login.png
video: /screenshots/nexdoc-demo.mp4
featured: true
order: 1
lang: en
slug: nexdoc
---


## The Problem

Companies accumulate large volumes of documents without an efficient way to search
and extract relevant information. Keyword searches fail when the user doesn't know
the exact terms in the document.

## My Approach

I designed a 3-service architecture with Domain-Driven Design:

- **Backend (Spring Boot 3.5 / Java 21)**: REST API with DDD, migrations with Flyway,
  document and metadata management.
- **AI Service (FastAPI / Python)**: Indexing pipeline with vector embeddings
  using pgvector. Asynchronous processing with Celery for large documents.
- **Frontend (React 19 / Vite)**: Search and document management interface.

### Key Technical Decisions

- **pgvector over Pinecone/Weaviate**: Keeping everything in PostgreSQL simplifies the
  infrastructure and reduces costs. For the expected volume, pgvector with HNSW indexes
  provides sufficient performance.
- **Ollama for local embeddings**: Data privacy — enterprise documents
  never leave the server.
- **DDD in the backend**: The domain logic (documents, permissions, indexing) is
  complex enough to justify separate bounded contexts.

## Architecture

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

## Lessons Learned

- Embedding quality depends enormously on the chunking strategy — chunks that are too
  large lose specificity, too small lose context.
- Flyway + DDD requires discipline in how migrations are organized per bounded context.
- Docker Compose with 5+ services needs well-configured health checks to avoid
  race conditions on startup.
