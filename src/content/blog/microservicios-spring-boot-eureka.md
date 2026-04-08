---
title: "Microservicios con Spring Boot: Eureka, API Gateway y Config Server"
description: "Arquitectura de microservicios real con Spring Cloud: service discovery, configuración centralizada, gateway, y las lecciones que aprendí implementándolo."
date: "2026-03-20"
tags:
  - Microservices
  - Java
  - Architecture
  - DevOps
readTime: "9 min"
draft: false
---

Los microservicios suenan genial en teoría. En práctica, la complejidad operacional te puede comer si no tienes los patrones correctos. Después de implementar varios sistemas con arquitectura de microservicios en Fullengine y en proyectos propios, comparto los patrones que funcionan y los que no.

## La arquitectura base

Cualquier sistema de microservicios serio necesita al menos estos 3 componentes de infraestructura:

```
                    ┌─────────────────┐
   Clientes ──────▶ │   API Gateway   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │ Config Server│ │  Eureka  │ │  Service A   │
      └──────────────┘ └──────────┘ └──────────────┘
                             ▲              │
                             │    ┌─────────┘
                             │    ▼
                        ┌──────────────┐
                        │  Service B   │
                        └──────────────┘
```

### 1. Eureka: Service Discovery

El problema: Service A necesita hablar con Service B, pero ¿cuál es su IP? En un entorno dinámico (containers, auto-scaling), las IPs cambian constantemente.

Eureka resuelve esto. Cada servicio se registra en Eureka al arrancar, y cuando necesita llamar a otro servicio, le pregunta a Eureka dónde está.

```yaml
# application.yml del servicio
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    prefer-ip-address: true
```

```java
// Llamar a otro servicio por nombre, no por IP
@FeignClient(name = "notification-service")
public interface NotificationClient {
    @PostMapping("/api/notifications")
    void send(@RequestBody NotificationRequest request);
}
```

**La magia**: `notification-service` se resuelve automáticamente a la IP correcta. Si hay 3 instancias, Eureka hace load balancing.

### 2. Config Server: Configuración centralizada

Cada microservicio necesita configuración: URLs de base de datos, API keys, feature flags. Sin Config Server, cada servicio tiene su propio `application.yml` y cambiar una config requiere redesplegar.

```yaml
# Config Server apunta a un repo Git
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/tu-org/config-repo
          default-label: main
```

El repo de configuración tiene un archivo por servicio y ambiente:

```
config-repo/
├── application.yml           # Común a todos
├── chat-service.yml          # Config de chat
├── chat-service-prod.yml     # Config de chat en producción
└── notification-service.yml  # Config de notificaciones
```

Los servicios arrancan, consultan su config al Config Server, y obtienen los valores correctos para su ambiente. **Cambiar una config = commit al repo, sin redesplegar**.

### 3. API Gateway: Punto de entrada único

El gateway es la puerta de entrada. Los clientes solo conocen una URL — el gateway rutea a cada servicio.

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: chat-service
          uri: lb://CHAT-SERVICE    # lb:// = load balanced via Eureka
          predicates:
            - Path=/api/chat/**
        - id: user-service
          uri: lb://USER-SERVICE
          predicates:
            - Path=/api/users/**
```

Además de routing, el gateway maneja:
- **Rate limiting**: Protección contra abuso
- **CORS**: Configuración centralizada
- **Autenticación**: Validar JWT antes de llegar al servicio

## Docker Compose para desarrollo

En desarrollo local, todo corre en Docker Compose:

```yaml
services:
  eureka-server:
    build: ./eureka-server
    ports: ["8761:8761"]

  config-server:
    build: ./config-server
    ports: ["8888:8888"]
    depends_on:
      eureka-server:
        condition: service_healthy

  api-gateway:
    build: ./api-gateway
    ports: ["8080:8080"]
    depends_on:
      eureka-server:
        condition: service_healthy
      config-server:
        condition: service_healthy

  chat-service:
    build: ./chat-service
    depends_on:
      eureka-server:
        condition: service_healthy
      config-server:
        condition: service_healthy
```

**Los health checks son críticos**. Sin ellos, los servicios arrancan antes de que Eureka esté listo y fallan al registrarse.

## Lecciones de producción

### Lo que funciona

1. **Eureka simplifica el scaling**: Levantar otra instancia de un servicio es arrancar otro container. Eureka lo detecta y distribuye carga automáticamente.

2. **Config Server previene configs hardcodeadas**: Un cambio de password de base de datos es un commit, no un redespliegue de 5 servicios.

3. **El gateway centraliza cross-cutting concerns**: Autenticación, CORS, rate limiting — en un solo lugar.

### Lo que duele

1. **Debugging distribuido**: Un request pasa por gateway → service A → service B → database. Cuando falla, ¿dónde? Necesitas distributed tracing (Zipkin/Jaeger) desde el día 1.

2. **Consistencia eventual**: Si Service A actualiza datos y Service B los lee, puede leer datos viejos. Hay que diseñar para esto.

3. **El cold start**: 4 servicios de Spring Boot arrancan en 30-60 segundos cada uno. En desarrollo, esperar 3 minutos para que todo esté listo es frustrante.

### La pregunta que nadie hace

**¿Realmente necesitas microservicios?** Para la mayoría de proyectos, un monolito bien estructurado (con Clean Architecture) es mejor. Los microservicios resuelven problemas de **escala organizacional** (equipos independientes) más que de escala técnica.

Úsalos cuando:
- Diferentes partes del sistema escalan de forma independiente
- Equipos diferentes mantienen diferentes servicios
- Necesitas deploy independiente por módulo

No los uses cuando:
- Eres un equipo de 1-3 personas
- Todo tu sistema comparte la misma base de datos
- La complejidad operacional supera el beneficio

## Mi stack actual para microservicios

- **Spring Boot 3.x** + Spring Cloud
- **Eureka** para service discovery
- **Spring Cloud Gateway** como API Gateway
- **Docker Compose** para desarrollo
- **Kubernetes** para producción (cuando el proyecto lo justifica)
- **Dokploy** para proyectos más pequeños que no necesitan K8s
- **Jenkins + SonarQube** para CI/CD y quality gates
