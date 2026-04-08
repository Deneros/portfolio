---
title: "Implementando RAG con pgvector y FastAPI"
description: "Cómo construí un pipeline de Retrieval-Augmented Generation usando PostgreSQL con pgvector, FastAPI y Ollama para búsqueda semántica en documentos empresariales."
date: "2026-04-07"
tags:
  - AI
  - Python
  - PostgreSQL
  - Architecture
readTime: "8 min"
draft: false
---

Cuando empecé a construir [Nexdoc](/projects/nexdoc), la primera decisión fue cómo implementar
la búsqueda semántica. Después de evaluar varias opciones, elegí **pgvector** — y fue la
decisión correcta para este caso de uso. Aquí explico por qué y cómo.

## ¿Por qué no una base de datos vectorial dedicada?

Las opciones populares como Pinecone, Weaviate o Milvus son excelentes, pero para Nexdoc
presentaban problemas:

- **Complejidad operacional**: Un servicio más que mantener, monitorear y escalar.
- **Costo**: Las opciones managed tienen pricing por vector almacenado.
- **Consistencia**: Los metadatos del documento viven en PostgreSQL. Tener vectores en
  otro sistema introduce eventual consistency.

**pgvector** resuelve todo esto: los embeddings viven en la misma base de datos que los
documentos. Una sola transacción puede actualizar metadatos y vectores.

## La arquitectura del pipeline

```
Documento → Chunking → Embeddings → pgvector
                                        ↓
Query del usuario → Embedding → Búsqueda por similitud → Contexto → LLM → Respuesta
```

### 1. Chunking strategy

El chunking es la parte más subestimada de un pipeline RAG. Probé varias estrategias:

- **Fixed-size chunks (500 tokens)**: Simple pero rompe párrafos a mitad de idea.
- **Paragraph-based**: Respeta la estructura pero genera chunks de tamaño muy variable.
- **Recursive character splitting**: El balance correcto — divide respetando jerarquía
  (secciones > párrafos > oraciones) con overlap configurable.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)
chunks = splitter.split_text(document_text)
```

El **overlap de 50 tokens** es crítico — sin él, si una respuesta cruza el límite de
dos chunks, ninguno tiene el contexto completo.

### 2. Generación de embeddings con Ollama

Usar Ollama para embeddings locales fue un requisito de privacidad. Los documentos
empresariales no pueden salir del servidor.

```python
import httpx

async def generate_embedding(text: str) -> list[float]:
    response = await httpx.post(
        "http://ollama:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]
```

**nomic-embed-text** ofrece buen balance entre calidad y velocidad. Para documentos
técnicos, la calidad es comparable a `text-embedding-ada-002` de OpenAI.

### 3. Almacenamiento en pgvector

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

El índice **HNSW** es esencial para rendimiento. Sin él, la búsqueda es fuerza bruta
O(n). Con HNSW, es O(log n) con recall > 95%.

### 4. Búsqueda y generación de respuesta

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

El **threshold de 0.7** filtra chunks poco relevantes. Sin este filtro, el LLM recibe
contexto ruidoso y genera respuestas menos precisas.

## Procesamiento asíncrono con Celery

Indexar un documento grande (100+ páginas) toma tiempo. No puedes bloquear la API
mientras generas embeddings para 200 chunks.

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

El usuario sube el documento, recibe confirmación inmediata, y el indexado ocurre
en background. Un WebSocket notifica cuando termina.

## Lecciones aprendidas

1. **El chunking importa más que el modelo de embeddings**. Un buen chunking con un
   modelo mediocre supera a un chunking malo con el mejor modelo.

2. **pgvector escala bien hasta ~1M vectores** con índices HNSW. Más allá de eso,
   considerar particionamiento o una base vectorial dedicada.

3. **El overlap entre chunks previene respuestas incompletas**. 10% del chunk_size
   es un buen punto de partida.

4. **Monitorear el recall** del sistema es difícil pero esencial. Construí un dataset
   de test con preguntas y respuestas esperadas para validar cambios en el pipeline.
