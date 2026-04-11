---

title: Chat Microservices
description: Social network with real-time chat, microservices architecture with Spring Cloud, WebSocket/STOMP, and CI/CD pipeline with Jenkins and SonarQube.
longDescription: |
  Real-time chat system built as a social network with microservices architecture.
  Includes messaging via WebSocket/STOMP, rooms, presence indicators, service discovery
  with Eureka, centralized configuration, API Gateway with JWT authentication, and a
  complete CI/CD pipeline with Jenkins, SonarQube, and quality gates.
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
lang: en
slug: chat-microservices
---


## The Problem

Real-time messaging systems are one of the most demanding use cases in software
architecture — they require persistent bidirectional communication, presence state
management, message persistence, and the ability to scale horizontally. I built this
project as a case study to implement enterprise microservice patterns in a real-world
use case.

## My Approach

### Microservices Architecture

The system is composed of independent services, each with its own lifecycle
and deployment:

- **API Gateway (Spring Cloud Gateway)**: Single entry point for all clients.
  Handles routing, rate limiting, centralized CORS, and JWT validation before
  requests reach internal services. Also routes WebSocket connections with
  `lb:ws://` through Eureka.

- **Config Server**: Centralized configuration stored in a Git repository. Each
  service fetches its configuration on startup based on the environment (dev/staging/prod).
  Changing a config is a commit to the repo — no redeployment needed.

- **Eureka Server**: Service discovery — services register automatically on
  startup. When a service needs to communicate with another, it asks Eureka for the
  current IP. This enables horizontal scaling: spinning up another instance is just
  starting another container, Eureka detects it and distributes load.

- **Chat Service**: The system's core. Handles messaging logic with
  WebSocket/STOMP, message persistence in PostgreSQL, and presence state in Redis.

### Real-Time Chat with WebSocket/STOMP

This isn't a basic request-response chat — it uses persistent bidirectional communication:

- **Rooms**: Users join themed rooms. Each message is broadcast to all
  room participants via STOMP topics (`/topic/room/{roomId}`).
- **Typing indicators**: When a user is typing, a lightweight event is sent
  to the room so others see "X is typing...".
- **Presence**: The system detects connections and disconnections via STOMP session
  events. Redis stores presence state with automatic TTL to clean up
  abandoned sessions.
- **Persistence**: Each message is saved in PostgreSQL with timestamp, user, and room.
  Upon reconnecting, the client receives recent history.

### Frontend (React 18)

SPA with a chat interface that consumes WebSockets through the API Gateway. Includes
a room list, message panel with infinite scroll for history, presence and typing
indicators, and new message notifications.

### CI/CD Pipeline

The pipeline ensures no code reaches production without passing quality analysis:

1. **Jenkins**: Each push to GitHub triggers the pipeline via webhook. Maven build,
   unit and integration test execution, and coverage report generation.

2. **SonarQube**: Static code analysis — detects bugs, code smells,
   security vulnerabilities, and duplicated code. If the code doesn't pass the quality
   gates (minimum coverage, 0 vulnerabilities, duplication under control), the pipeline
   stops and deployment doesn't happen.

3. **Docker**: Each service has its own Dockerfile. Jenkins builds the image and pushes
   it to the registry only if it passes the quality gates.

4. **Docker Compose**: Separate configurations for development (with hot-reload) and
   production (with health checks and restart policies).

## Architecture

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
                                 │ (messages) │   │(presence)│
                                 └────────────┘   └──────────┘
```

```
CI/CD Pipeline:
Push → Jenkins → Build → Tests → SonarQube → Quality Gate → Docker Build → Deploy
```

## Key Technical Decisions

- **STOMP over raw WebSocket**: STOMP adds a messaging protocol on top of WebSocket
  — topics, subscriptions, headers. Without STOMP, I would have to implement all that
  message routing manually.
- **Redis for presence**: Fast, distributed, and with automatic TTL. If a user
  disconnects without sending a disconnect event (closes the browser), the TTL cleans
  up their presence state automatically.
- **Eureka over Consul/Zookeeper**: Native integration with Spring Cloud. For the
  Spring ecosystem, Eureka is the option with the least friction.
- **Strict quality gates**: 0 vulnerabilities, 70% coverage on new code.
  Sounds restrictive, but after months the codebase maintains the same quality as
  day 1.

## Lessons Learned

- Eureka greatly simplifies scaling — adding instances is automatic, but
  you need robust health checks. Without them, a service that starts before
  Eureka is ready fails silently.
- WebSocket routing through the API Gateway requires special configuration
  (`lb:ws://`) and custom headers for JWT authentication to work on the initial
  connection.
- SonarQube in the pipeline prevents technical debt before it reaches main. The cost
  is build time (30s extra per analysis), but the return in quality is enormous.
- Microservices for a one-person team are overengineering — but as a case
  study to learn the patterns, it's invaluable. In a real project with a small
  team, I would start with a modular monolith.
