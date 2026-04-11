---
title: "Dokploy: por qué lo uso para todo"
description: "Mi experiencia usando Dokploy como plataforma de deployment self-hosted. Caso real deployando un ERP con 4 servicios, CI/CD integrado, y por qué es mi herramienta favorita de DevOps."
date: "2026-04-04"
tags:
  - DevOps
  - Docker
  - Infrastructure
readTime: "10 min"
draft: false
lang: es
slug: dokploy-deploy-self-hosted
---

Después de probar Heroku, Render, y pelearme con configuraciones manuales de Docker Compose en VPS, descubrí Dokploy. Es una plataforma de deployment self-hosted que te da la experiencia de un PaaS pero en tu propio servidor. Y me encanta.

## ¿Qué es Dokploy?

Dokploy es un **PaaS self-hosted** open source. Instalas un agente en tu VPS y obtienes:

- Deploy desde GitHub/GitLab con push
- SSL automático con Let's Encrypt
- Base de datos managed (PostgreSQL, MySQL, Redis, MongoDB)
- Monitoreo de recursos
- Logs en tiempo real
- Rollbacks con un click
- Docker Compose nativo
- Ambientes separados (testing, staging, production)

Básicamente, es tu propio Vercel/Render pero sin pagar por request ni preocuparte por vendor lock-in.

## Por qué no las alternativas

### Vercel/Netlify
Excelentes para frontend, pero para backend con bases de datos, workers, y servicios múltiples se vuelven caros y limitados. Intenta deployar un Spring Boot con PostgreSQL y Redis en Vercel — no es su caso de uso.

### Render
Bueno, pero el pricing escala rápido cuando tienes 3-4 servicios corriendo. Un proyecto con backend + DB + Redis + worker ya son $40-60/mes. Multiplica eso por 3 proyectos y estás pagando más que un VPS dedicado.

### Docker Compose en VPS crudo
Funciona, pero manejar SSL, logs, rollbacks, y CI/CD manualmente es trabajo de operaciones que no quiero hacer. Cada deploy es SSH + git pull + docker compose up y rezar que no se rompa nada.

### Dokploy
Un VPS de $10-20/mes, instalo Dokploy, y tengo todo lo anterior con interfaz visual. Para proyectos personales y clientes pequeños, es imbatible.

## Setup en 5 minutos

```bash
# En tu VPS (Ubuntu/Debian)
curl -sSL https://dokploy.com/install.sh | sh
```

Eso es todo. Dokploy levanta su interfaz en el puerto 3000. Conectas tu dominio, y listo.

## Caso real: deployando el ERP (NEXUS)

Este es mi caso de uso más complejo en Dokploy. El proyecto NEXUS (AES ERP System) tiene **4 servicios** que necesitan correr juntos:

### La arquitectura

```
┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐
│  frontend  │  │ backend  │  │     db     │  │  minio  │
│  React/Vite│  │Spring Boot│  │ PostgreSQL │  │ Storage │
└────────────┘  └──────────┘  └────────────┘  └─────────┘
```

- **frontend**: React 18 + Vite, servido con Nginx
- **backend**: Spring Boot 3.5 con Java 21, API REST
- **db**: PostgreSQL con Flyway para migraciones
- **minio**: Almacenamiento de archivos (documentos, evidencias, reportes)

### Configuración en Dokploy

En Dokploy, cada servicio se configura individualmente dentro de un **proyecto**:

1. **Crear proyecto "NEXUS"** con ambiente "testing"
2. **Agregar servicio "db"**: PostgreSQL desde la UI — Dokploy genera la connection string automáticamente
3. **Agregar servicio "minio"**: Docker image `minio/minio` con volumen persistente
4. **Agregar servicio "backend"**: Conectar repo GitHub, branch `main`, Dockerfile en la raíz
5. **Agregar servicio "frontend"**: Conectar repo GitHub, Dockerfile con build multi-stage (Node → Nginx)

Las variables de entorno se configuran por servicio. El backend recibe la connection string de PostgreSQL y la URL de MinIO como env vars inyectadas por Dokploy.

### El resultado

Los 4 servicios corren en un solo VPS con puntos verdes de salud en el dashboard de Dokploy. Cada push a `main` en cualquier repo dispara un rebuild automático solo del servicio modificado.

### CI/CD integrado

Dokploy conecta directamente con GitHub via webhooks:

1. Push a `main` en el repo del backend
2. Dokploy detecta el cambio via webhook
3. Ejecuta `docker build` con el Dockerfile del repo
4. Si el build pasa, reemplaza el container anterior (zero-downtime con health checks)
5. Si falla, mantiene el container anterior — rollback automático

Para el ERP, además configuré un pipeline en Jenkins que corre antes del deploy:

```
Push → Jenkins (build + test + SonarQube) → Si pasa quality gate → Dokploy deploy
```

Jenkins valida que el código pase tests y análisis estático antes de que Dokploy lo deploye. Si SonarQube reporta code smells críticos o cobertura bajo el umbral, el deploy no ocurre.

## Lo que más me gusta

**Docker Compose nativo**: Si ya tienes un `docker-compose.yml`, Dokploy lo entiende directamente. No necesitas adaptar nada. Para el desarrollo local del ERP uso el mismo `docker-compose.yml` que Dokploy usa en el servidor.

**Ambientes separados**: El proyecto NEXUS tiene ambiente "testing" para QA y "production" para el cliente. Las variables de entorno son diferentes por ambiente — la URL de la base de datos en testing apunta a una instancia diferente que en producción.

**Monitoreo incluido**: CPU, RAM, disco, y network de cada servicio. Sin instalar Grafana ni Prometheus para proyectos pequeños. Cuando el backend del ERP consumía más RAM de lo esperado, lo vi directamente en el dashboard de Dokploy.

**SSL automático**: Let's Encrypt se renueva solo. Nunca más un certificado expirado en producción a las 3am.

**Rollbacks instantáneos**: Cada deploy es una imagen Docker. Rollback = volver a la imagen anterior. 30 segundos. Una vez deploye una migración de Flyway que falló en producción — rollback del backend en 30 segundos mientras diagnosticaba el problema.

**Logs centralizados**: Los logs de los 4 servicios se ven desde la misma interfaz. Cuando el backend tira un error, puedo ver si fue un problema de conexión a la DB o a MinIO sin abrir 4 terminales SSH.

## Para qué lo uso

- **ERP (NEXUS)**: 4 servicios en un VPS — el caso más complejo.
- **Proyectos personales**: Nexdoc (5 servicios con AI), IRIX, y otros corren en Dokploy.
- **Clientes freelance**: Les entrego la app corriendo en su propio servidor, sin dependencia de un cloud provider caro.
- **Staging environments**: Preview deployments por PR para que el cliente vea los cambios antes de producción.

## Limitaciones

- **No es para escala masiva**: Para aplicaciones con cientos de instancias, Kubernetes sigue siendo la opción. Aunque Dokploy soporta conectar múltiples servidores (multi-node) para distribuir servicios entre nodos — algo como microservicios distribuidos sin la complejidad de K8s — no tiene auto-scaling automático.
- **Comunidad pequeña**: Menos Stack Overflow answers que Heroku o Vercel. Pero la documentación es buena y el Discord es activo.
- **Debugging de networking entre servicios**: Cuando dos servicios en Dokploy no se ven entre sí, el debug es más manual que en Docker Compose local. Tuve que configurar redes internas manualmente para que el backend pudiera resolver el hostname de MinIO.

## Mi recomendación

Si eres un desarrollador que quiere deployar proyectos sin pagar de más ni pasar horas configurando infraestructura, Dokploy es la respuesta. No reemplaza Kubernetes para aplicaciones enterprise con 100+ instancias, pero para el 90% de los proyectos que hago, es más que suficiente.

Un VPS de $12/mes con Dokploy me da más que un plan de $50/mes en Render. Y el control total sobre mis datos y mi infraestructura no tiene precio.

El caso del ERP con 4 servicios demostró que Dokploy maneja complejidad real — no es solo para landing pages y side projects. Con CI/CD via Jenkins y ambientes separados, tengo un flujo de deployment profesional sin la complejidad operacional de Kubernetes.
