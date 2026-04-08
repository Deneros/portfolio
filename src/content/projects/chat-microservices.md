---
title: Chat Microservices
description: Sistema de chat en tiempo real con arquitectura de microservicios, service discovery y CI/CD completo.
longDescription: |
  Aplicación de chat construida con microservicios de Spring Boot, incluyendo API Gateway,
  Config Server, Eureka para service discovery, y un pipeline CI/CD con Jenkins y SonarQube.
status: mvp
statusLabel: Case Study
stack:
  - Spring Boot
  - Eureka
  - API Gateway
  - Config Server
  - React 18
  - WebSocket/STOMP
  - Jenkins
  - SonarQube
  - Docker Compose
tags:
  - Microservices
  - DevOps
  - Architecture
featured: true
order: 3
---

## El Problema

Construir un sistema de mensajería en tiempo real que demuestre patrones de microservicios
enterprise: service discovery, configuración centralizada, CI/CD y calidad de código.

## Mi Enfoque

Arquitectura de 4 microservicios:

- **API Gateway**: Punto de entrada único, routing y load balancing.
- **Config Server**: Configuración centralizada para todos los servicios.
- **Eureka Server**: Service discovery — los servicios se registran automáticamente.
- **Chat Service**: Lógica de negocio con WebSocket/STOMP para mensajería en tiempo real.

### Pipeline CI/CD

- **Jenkins**: Build automatizado, tests, y deploy por ambiente (dev/staging/prod).
- **SonarQube**: Análisis estático de código con quality gates.
- **Docker Compose**: Configuraciones separadas para desarrollo y producción.

## Arquitectura

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │ Config Server│ │  Eureka  │ │ Chat Service │
      └──────────────┘ └──────────┘ │ + WebSocket  │
                                    └──────────────┘
```

## Aprendizajes

- Eureka simplifica enormemente el scaling — agregar instancias es automático.
- Los health checks entre servicios son críticos; un servicio caído puede cascadear
  si no hay circuit breakers.
- SonarQube en el pipeline previene deuda técnica antes de que llegue a main.
