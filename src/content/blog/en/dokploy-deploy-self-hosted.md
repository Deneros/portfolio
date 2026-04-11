---
title: "Dokploy: why I use it for everything"
description: "My experience using Dokploy as a self-hosted deployment platform. A real case deploying an ERP with 4 services, integrated CI/CD, and why it's my favorite DevOps tool."
date: "2026-04-04"
tags:
  - DevOps
  - Docker
  - Infrastructure
readTime: "10 min"
draft: false
lang: en
slug: dokploy-deploy-self-hosted
---

After trying Heroku, Render, and fighting with manual Docker Compose configurations on VPS, I discovered Dokploy. It's a self-hosted deployment platform that gives you the PaaS experience on your own server. And I love it.

## What is Dokploy?

Dokploy is an open source **self-hosted PaaS**. You install an agent on your VPS and get:

- Deploy from GitHub/GitLab on push
- Automatic SSL with Let's Encrypt
- Managed databases (PostgreSQL, MySQL, Redis, MongoDB)
- Resource monitoring
- Real-time logs
- One-click rollbacks
- Native Docker Compose support
- Separate environments (testing, staging, production)

Essentially, it's your own Vercel/Render without paying per request or worrying about vendor lock-in.

## Why not the alternatives

### Vercel/Netlify
Excellent for frontend, but for backend with databases, workers, and multiple services they get expensive and limited. Try deploying a Spring Boot app with PostgreSQL and Redis on Vercel — it's not their use case.

### Render
Good, but pricing scales quickly when you have 3-4 services running. A project with backend + DB + Redis + worker is already $40-60/month. Multiply that by 3 projects and you're paying more than a dedicated VPS.

### Raw Docker Compose on VPS
It works, but managing SSL, logs, rollbacks, and CI/CD manually is operations work I don't want to do. Every deploy is SSH + git pull + docker compose up and pray nothing breaks.

### Dokploy
A $10-20/month VPS, I install Dokploy, and I have everything above with a visual interface. For personal projects and small clients, it's unbeatable.

## Setup in 5 minutes

```bash
# En tu VPS (Ubuntu/Debian)
curl -sSL https://dokploy.com/install.sh | sh
```

That's it. Dokploy spins up its interface on port 3000. Connect your domain, and you're done.

## Real case: deploying the ERP (NEXUS)

This is my most complex use case on Dokploy. The NEXUS project (AES ERP System) has **4 services** that need to run together:

### The architecture

```
┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐
│  frontend  │  │ backend  │  │     db     │  │  minio  │
│  React/Vite│  │Spring Boot│  │ PostgreSQL │  │ Storage │
└────────────┘  └──────────┘  └────────────┘  └─────────┘
```

- **frontend**: React 18 + Vite, served with Nginx
- **backend**: Spring Boot 3.5 with Java 21, REST API
- **db**: PostgreSQL with Flyway for migrations
- **minio**: File storage (documents, evidence, reports)

### Dokploy configuration

In Dokploy, each service is configured individually within a **project**:

1. **Create the "NEXUS" project** with a "testing" environment
2. **Add "db" service**: PostgreSQL from the UI — Dokploy generates the connection string automatically
3. **Add "minio" service**: Docker image `minio/minio` with a persistent volume
4. **Add "backend" service**: Connect GitHub repo, `main` branch, Dockerfile at the root
5. **Add "frontend" service**: Connect GitHub repo, Dockerfile with multi-stage build (Node -> Nginx)

Environment variables are configured per service. The backend receives the PostgreSQL connection string and MinIO URL as env vars injected by Dokploy.

### The result

All 4 services run on a single VPS with green health dots on the Dokploy dashboard. Every push to `main` on any repo triggers an automatic rebuild of only the modified service.

### Integrated CI/CD

Dokploy connects directly with GitHub via webhooks:

1. Push to `main` on the backend repo
2. Dokploy detects the change via webhook
3. Runs `docker build` with the repo's Dockerfile
4. If the build passes, it replaces the previous container (zero-downtime with health checks)
5. If it fails, it keeps the previous container — automatic rollback

For the ERP, I also set up a Jenkins pipeline that runs before the deploy:

```
Push → Jenkins (build + test + SonarQube) → Si pasa quality gate → Dokploy deploy
```

Jenkins validates that the code passes tests and static analysis before Dokploy deploys it. If SonarQube reports critical code smells or coverage below the threshold, the deploy doesn't happen.

## What I like most

**Native Docker Compose**: If you already have a `docker-compose.yml`, Dokploy understands it directly. No need to adapt anything. For local ERP development I use the same `docker-compose.yml` that Dokploy uses on the server.

**Separate environments**: The NEXUS project has a "testing" environment for QA and "production" for the client. Environment variables differ per environment — the database URL in testing points to a different instance than in production.

**Built-in monitoring**: CPU, RAM, disk, and network for each service. No need to install Grafana or Prometheus for small projects. When the ERP backend was consuming more RAM than expected, I spotted it directly on the Dokploy dashboard.

**Automatic SSL**: Let's Encrypt renews on its own. Never again an expired certificate in production at 3am.

**Instant rollbacks**: Every deploy is a Docker image. Rollback = go back to the previous image. 30 seconds. Once I deployed a Flyway migration that failed in production — backend rollback in 30 seconds while I diagnosed the issue.

**Centralized logs**: Logs from all 4 services are visible from the same interface. When the backend throws an error, I can see whether it was a DB or MinIO connection issue without opening 4 SSH terminals.

## What I use it for

- **ERP (NEXUS)**: 4 services on a single VPS — the most complex case.
- **Personal projects**: Nexdoc (5 services with AI), IRIX, and others run on Dokploy.
- **Freelance clients**: I deliver the app running on their own server, with no dependency on an expensive cloud provider.
- **Staging environments**: Preview deployments per PR so the client can see changes before production.

## Limitations

- **Not for massive scale**: For applications with hundreds of instances, Kubernetes is still the way to go. While Dokploy supports connecting multiple servers (multi-node) to distribute services across nodes — something like distributed microservices without the complexity of K8s — it doesn't have automatic auto-scaling.
- **Small community**: Fewer Stack Overflow answers than Heroku or Vercel. But the documentation is good and the Discord is active.
- **Debugging networking between services**: When two services in Dokploy can't see each other, debugging is more manual than with local Docker Compose. I had to manually configure internal networks so the backend could resolve MinIO's hostname.

## My recommendation

If you're a developer who wants to deploy projects without overpaying or spending hours configuring infrastructure, Dokploy is the answer. It doesn't replace Kubernetes for enterprise applications with 100+ instances, but for 90% of the projects I work on, it's more than enough.

A $12/month VPS with Dokploy gives me more than a $50/month plan on Render. And full control over my data and infrastructure is priceless.

The ERP case with 4 services proved that Dokploy handles real complexity — it's not just for landing pages and side projects. With CI/CD via Jenkins and separate environments, I have a professional deployment workflow without the operational complexity of Kubernetes.
