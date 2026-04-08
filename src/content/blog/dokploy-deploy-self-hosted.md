---
title: "Dokploy: por qué lo uso para todo"
description: "Mi experiencia usando Dokploy como plataforma de deployment self-hosted. Comparación con alternativas, setup, y por qué es mi herramienta favorita de DevOps."
date: "2026-04-04"
tags:
  - DevOps
  - Docker
  - Infrastructure
readTime: "6 min"
draft: false
---

Después de probar Heroku, Railway, Render, y pelearme con configuraciones manuales de Docker Compose en VPS, descubrí Dokploy. Es una plataforma de deployment self-hosted que te da la experiencia de un PaaS pero en tu propio servidor. Y me encanta.

## ¿Qué es Dokploy?

Dokploy es un **PaaS self-hosted** open source. Instalas un agente en tu VPS y obtienes:

- Deploy desde GitHub/GitLab con push
- SSL automático con Let's Encrypt
- Base de datos managed (PostgreSQL, MySQL, Redis, MongoDB)
- Monitoreo de recursos
- Logs en tiempo real
- Rollbacks con un click
- Docker Compose nativo

Básicamente, es tu propio Vercel/Railway pero sin pagar por request ni preocuparte por vendor lock-in.

## Por qué no las alternativas

### Vercel/Netlify
Excelentes para frontend, pero para backend con bases de datos, workers, y servicios múltiples se vuelven caros y limitados.

### Railway/Render
Buenos, pero el pricing escala rápido cuando tienes 3-4 servicios corriendo. Un proyecto con backend + DB + Redis + worker ya son $40-60/mes.

### Docker Compose en VPS crudo
Funciona, pero manejar SSL, logs, rollbacks, y CI/CD manualmente es trabajo de operaciones que no quiero hacer.

### Dokploy
Un VPS de $10-20/mes, instalo Dokploy, y tengo todo lo anterior con interfaz visual. Para proyectos personales y clientes pequeños, es imbatible.

## Setup en 5 minutos

```bash
# En tu VPS (Ubuntu/Debian)
curl -sSL https://dokploy.com/install.sh | sh
```

Eso es todo. Dokploy levanta su interfaz en el puerto 3000. Conectas tu dominio, y listo.

## Mi flujo con Dokploy

### 1. Crear proyecto
En la UI creo un nuevo proyecto y conecto el repo de GitHub.

### 2. Configurar variables de entorno
Las environment variables se configuran en la UI — separadas por ambiente (preview, production).

### 3. Push to deploy
Cada push a `main` dispara un build y deploy automático. Los PRs generan preview deployments con su propia URL.

### 4. Base de datos
Desde la UI creo una instancia de PostgreSQL. Dokploy genera la connection string y la inyecta como variable de entorno. Sin tocar configs manuales.

## Lo que más me gusta

**Docker Compose nativo**: Si ya tienes un `docker-compose.yml`, Dokploy lo entiende directamente. No necesitas adaptar nada.

**Monitoreo incluido**: CPU, RAM, disco, y network de cada servicio. Sin instalar Grafana ni Prometheus para proyectos pequeños.

**SSL automático**: Let's Encrypt se renueva solo. Nunca más un certificado expirado en producción a las 3am.

**Rollbacks instantáneos**: Cada deploy es una imagen Docker. Rollback = volver a la imagen anterior. 30 segundos.

## Para qué lo uso

- **Proyectos personales**: Nexdoc, IRIX, y otros proyectos corren en un solo VPS con Dokploy.
- **Clientes freelance**: Les entrego la app corriendo en su propio servidor, sin dependencia de un cloud provider caro.
- **Staging environments**: Preview deployments por PR para que el cliente vea los cambios antes de producción.

## Limitaciones

- **No es para escala masiva**: Si necesitas auto-scaling con múltiples nodos, necesitas Kubernetes.
- **Single server**: Dokploy corre en un solo servidor. Para alta disponibilidad necesitas otro approach.
- **Comunidad pequeña**: Menos Stack Overflow answers que Heroku o Vercel. Pero la documentación es buena y el Discord es activo.

## Mi recomendación

Si eres un desarrollador que quiere deployar proyectos sin pagar de más ni pasar horas configurando infraestructura, Dokploy es la respuesta. No reemplaza Kubernetes para aplicaciones enterprise, pero para el 90% de los proyectos que hago, es más que suficiente.

Un VPS de $12/mes con Dokploy me da más que un plan de $50/mes en Railway. Y el control total sobre mis datos y mi infraestructura no tiene precio.
