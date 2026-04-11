---
title: Chat Microservices
description: Red social con chat en tiempo real, arquitectura de microservicios con Spring Cloud, WebSocket/STOMP, y pipeline CI/CD con Jenkins y SonarQube.
longDescription: |
  Sistema de chat en tiempo real construido como red social con arquitectura de microservicios.
  Incluye mensajería via WebSocket/STOMP, rooms, indicadores de presencia, service discovery
  con Eureka, configuración centralizada, API Gateway con autenticación JWT, y un pipeline
  CI/CD completo con Jenkins, SonarQube y quality gates.
status: mvp
statusLabel: Case Study
stack:
  - Spring Boot
  - Eureka
  - API Gateway
  - Config Server
  - React 18
  - WebSocket/STOMP
  - Redis
  - PostgreSQL
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

Los sistemas de mensajería en tiempo real son uno de los casos de uso más exigentes en
arquitectura de software — requieren comunicación bidireccional persistente, manejo de
estado de presencia, persistencia de mensajes, y la capacidad de escalar horizontalmente.
Este proyecto lo construí como case study para implementar patrones de microservicios
enterprise en un caso de uso real.

## Mi Enfoque

### Arquitectura de microservicios

El sistema se compone de servicios independientes, cada uno con su propio ciclo de vida
y despliegue:

- **API Gateway (Spring Cloud Gateway)**: Punto de entrada único para todos los clientes.
  Maneja routing, rate limiting, CORS centralizado, y validación de JWT antes de que los
  requests lleguen a los servicios internos. También rutea conexiones WebSocket con
  `lb:ws://` a través de Eureka.

- **Config Server**: Configuración centralizada almacenada en un repositorio Git. Cada
  servicio consulta su configuración al arrancar según el ambiente (dev/staging/prod).
  Cambiar una config es un commit al repo — sin redesplegar.

- **Eureka Server**: Service discovery — los servicios se registran automáticamente al
  arrancar. Cuando un servicio necesita comunicarse con otro, le pregunta a Eureka la
  IP actual. Esto permite escalar horizontalmente: levantar otra instancia es arrancar
  otro container, Eureka lo detecta y distribuye carga.

- **Chat Service**: El core del sistema. Maneja la lógica de mensajería con
  WebSocket/STOMP, persistencia de mensajes en PostgreSQL, y estado de presencia en Redis.

### Chat en tiempo real con WebSocket/STOMP

No es un chat básico de request-response — usa comunicación bidireccional persistente:

- **Rooms**: Los usuarios se unen a rooms temáticos. Cada mensaje se broadcast a todos
  los participantes del room via STOMP topics (`/topic/room/{roomId}`).
- **Indicadores de escritura**: Cuando un usuario está escribiendo, se envía un evento
  ligero al room para que los demás vean "X está escribiendo...".
- **Presencia**: El sistema detecta conexiones y desconexiones via eventos de sesión
  STOMP. Redis almacena el estado de presencia con TTL automático para limpiar sesiones
  abandonadas.
- **Persistencia**: Cada mensaje se guarda en PostgreSQL con timestamp, usuario, y room.
  Al reconectarse, el cliente recibe el historial reciente.

### Frontend (React 18)

SPA con interfaz de chat que consume los WebSockets a través del API Gateway. Incluye
lista de rooms, panel de mensajes con scroll infinito hacia el historial, indicadores
de presencia y escritura, y notificaciones de nuevos mensajes.

### Pipeline CI/CD

El pipeline garantiza que ningún código llegue a producción sin pasar por análisis de
calidad:

1. **Jenkins**: Cada push a GitHub dispara el pipeline via webhook. Build con Maven,
   ejecución de tests unitarios y de integración, y generación de reportes de cobertura.

2. **SonarQube**: Análisis estático del código — detecta bugs, code smells,
   vulnerabilidades de seguridad, y código duplicado. Si el código no pasa los quality
   gates (cobertura mínima, 0 vulnerabilidades, duplicación bajo control), el pipeline
   se detiene y el deploy no ocurre.

3. **Docker**: Cada servicio tiene su Dockerfile. Jenkins construye la imagen y la pushea
   al registry solo si pasa los quality gates.

4. **Docker Compose**: Configuraciones separadas para desarrollo (con hot-reload) y
   producción (con health checks y restart policies).

## Arquitectura

```
                        ┌─────────────────┐
   React SPA ─────────▶ │   API Gateway   │
   (WebSocket)          │  JWT + Routing  │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────┐   ┌──────────────────┐
      │ Config Server│   │  Eureka  │   │   Chat Service   │
      │  (Git repo)  │   │(Registry)│   │ WebSocket/STOMP  │
      └──────────────┘   └──────────┘   └────────┬─────────┘
                                                 │
                                        ┌────────┼────────┐
                                        ▼                 ▼
                                 ┌────────────┐   ┌──────────┐
                                 │ PostgreSQL │   │  Redis   │
                                 │ (mensajes) │   │(presencia)│
                                 └────────────┘   └──────────┘
```

```
Pipeline CI/CD:
Push → Jenkins → Build → Tests → SonarQube → Quality Gate → Docker Build → Deploy
```

## Decisiones técnicas clave

- **STOMP sobre raw WebSocket**: STOMP agrega un protocolo de mensajería sobre WebSocket
  — topics, subscriptions, headers. Sin STOMP, tendría que implementar todo ese routing
  de mensajes manualmente.
- **Redis para presencia**: Rápido, distribuido, y con TTL automático. Si un usuario se
  desconecta sin enviar evento de disconnect (cierra el navegador), el TTL limpia su
  estado de presencia automáticamente.
- **Eureka sobre Consul/Zookeeper**: Integración nativa con Spring Cloud. Para el
  ecosistema Spring, Eureka es la opción con menor fricción.
- **Quality gates estrictos**: 0 vulnerabilidades, 70% cobertura en código nuevo.
  Suena restrictivo, pero después de meses el codebase mantiene la misma calidad que
  el día 1.

## Aprendizajes

- Eureka simplifica enormemente el scaling — agregar instancias es automático, pero
  necesitas health checks robustos. Sin ellos, un servicio que arranca antes de que
  Eureka esté listo falla silenciosamente.
- El routing de WebSocket a través del API Gateway requiere configuración especial
  (`lb:ws://`) y headers custom para que la autenticación JWT funcione en la conexión
  inicial.
- SonarQube en el pipeline previene deuda técnica antes de que llegue a main. El costo
  es tiempo de build (30s extra por análisis), pero el retorno en calidad es enorme.
- Los microservicios para un equipo de una persona son overengineering — pero como case
  study para aprender los patrones, es invaluable. En un proyecto real con un equipo
  pequeño, empezaría con un monolito modular.
