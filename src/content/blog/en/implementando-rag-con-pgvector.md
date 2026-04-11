---
title: "Implementing RAG with pgvector and FastAPI"
description: "How I built a Retrieval-Augmented Generation pipeline using PostgreSQL with pgvector, FastAPI, and Ollama for semantic search across enterprise documents."
date: "2026-04-07"
tags:
  - AI
  - Python
  - PostgreSQL
  - Architecture
readTime: "8 min"
draft: false
lang: en
slug: implementando-rag-con-pgvector
---

When I started building [Nexdoc](/projects/nexdoc), the first decision was how to implement
semantic search. After evaluating several options, I chose **pgvector** — and it was the
right decision for this use case. Here's why and how.

## Why not a dedicated vector database?

Popular options like Pinecone, Weaviate, or Milvus are excellent, but for Nexdoc
they presented problems:

- **Operational complexity**: One more service to maintain, monitor, and scale.
- **Cost**: Managed options have pricing per stored vector.
- **Consistency**: Document metadata lives in PostgreSQL. Having vectors in
  another system introduces eventual consistency.

**pgvector** solves all of this: the embeddings live in the same database as the
documents. A single transaction can update metadata and vectors.

## The pipeline architecture

```
Documento → Chunking → Embeddings → pgvector
                                        ↓
Query del usuario → Embedding → Búsqueda por similitud → Contexto → LLM → Respuesta
```

### 1. Chunking strategy

Chunking is the most underestimated part of a RAG pipeline. I tried several strategies:

- **Fixed-size chunks (500 tokens)**: Simple but breaks paragraphs mid-thought.
- **Paragraph-based**: Respects structure but generates chunks of highly variable size.
- **Recursive character splitting**: The right balance — splits respecting hierarchy
  (sections > paragraphs > sentences) with configurable overlap.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)
chunks = splitter.split_text(document_text)
```

The **50-token overlap** is critical — without it, if an answer crosses the boundary of
two chunks, neither has the complete context.

### 2. Generating embeddings with Ollama

Using Ollama for local embeddings was a privacy requirement. Enterprise documents
cannot leave the server.

```python
import httpx

async def generate_embedding(text: str) -> list[float]:
    response = await httpx.post(
        "http://ollama:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]
```

**nomic-embed-text** offers a good balance between quality and speed. For technical
documents, the quality is comparable to OpenAI's `text-embedding-ada-002`.

### 3. Storage in pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    content TEXT NOT NULL,
    embedding vector(768),
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

The **HNSW** index is essential for performance. Without it, search is brute force
O(n). With HNSW, it's O(log n) with recall > 95%.

### 4. Search and response generation

```python
async def search_similar(query: str, limit: int = 5) -> list[dict]:
    query_embedding = await generate_embedding(query)

    results = await db.fetch("""
        SELECT content, 1 - (embedding <=> $1::vector) AS similarity
        FROM document_chunks
        WHERE 1 - (embedding <=> $1::vector) > 0.7
        ORDER BY embedding <=> $1::vector
        LIMIT $2
    """, query_embedding, limit)

    return results
```

The **0.7 threshold** filters out irrelevant chunks. Without this filter, the LLM receives
noisy context and generates less accurate responses.

## Async processing with Celery

Indexing a large document (100+ pages) takes time. You can't block the API
while generating embeddings for 200 chunks.

```python
@celery_app.task(bind=True, max_retries=3)
def index_document(self, document_id: str):
    document = get_document(document_id)
    chunks = split_document(document.content)

    for i, chunk in enumerate(chunks):
        embedding = generate_embedding_sync(chunk)
        save_chunk(document_id, chunk, embedding, i)

    update_document_status(document_id, "indexed")
```

The user uploads the document, receives immediate confirmation, and indexing happens
in the background. A WebSocket notifies them when it's done.

## Lessons learned

1. **Chunking matters more than the embedding model**. Good chunking with a
   mediocre model beats bad chunking with the best model.

2. **pgvector scales well up to ~1M vectors** with HNSW indexes. Beyond that,
   consider partitioning or a dedicated vector database.

3. **Overlap between chunks prevents incomplete answers**. 10% of chunk_size
   is a good starting point.

4. **Monitoring recall** of the system is difficult but essential. I built a test
   dataset with questions and expected answers to validate pipeline changes.
