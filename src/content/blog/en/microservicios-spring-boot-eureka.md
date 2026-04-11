---
title: "Microservices with Spring Boot: Eureka, API Gateway, and Config Server"
description: "Real microservices architecture with Spring Cloud: service discovery, centralized configuration, gateway, WebSocket/STOMP for real-time chat, and CI/CD pipeline with Jenkins and SonarQube."
date: "2026-03-20"
tags:
  - Microservices
  - Java
  - Architecture
  - DevOps
readTime: "14 min"
draft: false
lang: en
slug: microservicios-spring-boot-eureka
---

Microservices sound great in theory. In practice, the operational complexity can eat you alive if you don't have the right patterns in place. I built a real-time chat system as a social network with a full microservices architecture — Eureka, API Gateway, Config Server, WebSocket/STOMP, and a CI/CD pipeline with Jenkins and SonarQube. Here I share the patterns that work and those that don't.

## The real architecture

This isn't a textbook diagram — it's what actually runs in Docker Compose:

```
                    ┌─────────────────┐
   Clientes ──────▶ │   API Gateway   │
   (React SPA)      └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │ Config Server│ │  Eureka  │ │ Chat Service │
      └──────────────┘ └──────────┘ │ + WebSocket  │
                                    │ + STOMP      │
                                    └──────┬───────┘
                                           │
                                    ┌──────┴───────┐
                                    │  PostgreSQL  │
                                    └──────────────┘
```

Each box is an independent service with its own Dockerfile, its own build, and its own deploy cycle.

## The 3 infrastructure pillars

### 1. Eureka: Service Discovery

The problem: the Chat Service needs to talk to the User Service, but what's its IP? In a dynamic environment (containers, auto-scaling), IPs change constantly.

Eureka solves this. Each service registers with Eureka at startup, and when it needs to call another service, it asks Eureka where it is.

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
@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserResponse findById(@PathVariable String id);
}
```

**The magic**: `user-service` automatically resolves to the correct IP. If there are 3 instances, Eureka handles load balancing with Ribbon.

### 2. Config Server: Centralized configuration

Each microservice needs configuration: database URLs, API keys, feature flags. Without Config Server, each service has its own `application.yml` and changing a config requires redeploying.

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

The configuration repo has one file per service and environment:

```
config-repo/
├── application.yml           # Común a todos
├── chat-service.yml          # Config de chat
├── chat-service-prod.yml     # Config de chat en producción
├── user-service.yml          # Config de usuarios
└── notification-service.yml  # Config de notificaciones
```

Services start up, query their config from Config Server, and get the correct values for their environment. **Changing a config = commit to the repo, no redeployment needed**.

In the chat project, this was key when I needed to change WebSocket connection parameters in staging without redeploying — a commit to the config-repo and `POST /actuator/refresh` on the service.

### 3. API Gateway: Single entry point

The gateway is the front door. Clients only know one URL — the gateway routes to each service.

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
        - id: chat-websocket
          uri: lb:ws://CHAT-SERVICE  # WebSocket routing
          predicates:
            - Path=/ws/**
```

Beyond routing, the gateway handles:
- **Rate limiting**: Abuse protection — critical for WebSocket endpoints
- **CORS**: Centralized configuration for the React SPA
- **Authentication**: Validate JWT before reaching the service — requests without a valid token never reach the Chat Service

WebSocket routing was the trickiest part. Spring Cloud Gateway needs `lb:ws://` to correctly route WebSocket connections through Eureka.

## Real-time chat: WebSocket + STOMP

The core of the system. This isn't a toy chat — it supports rooms, persistent messages, typing indicators, and presence.

### Server configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}
```

### Message flow

```
Usuario A envía mensaje
    → /app/chat.sendMessage (STOMP destination)
    → ChatController procesa y persiste
    → Broadcast a /topic/room/{roomId}
    → Todos los usuarios en el room reciben el mensaje
```

```java
@Controller
public class ChatController {
    private final MessageService messageService;
    private final SimpMessagingTemplate messaging;

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage message,
                           SimpMessageHeaderAccessor headerAccessor) {
        // Persistir mensaje
        var saved = messageService.save(message);

        // Broadcast al room
        messaging.convertAndSend(
            "/topic/room/" + message.getRoomId(),
            saved
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingIndicator indicator) {
        messaging.convertAndSend(
            "/topic/room/" + indicator.getRoomId() + "/typing",
            indicator
        );
    }
}
```

### User presence

To know who's online, I use STOMP's connect/disconnect events:

```java
@Component
public class WebSocketEventListener {
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messaging;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        String userId = extractUserId(event);
        presenceService.setOnline(userId);
        messaging.convertAndSend("/topic/presence", presenceService.getOnlineUsers());
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        String userId = extractUserId(event);
        presenceService.setOffline(userId);
        messaging.convertAndSend("/topic/presence", presenceService.getOnlineUsers());
    }
}
```

Redis stores the presence state — fast, distributed, and with automatic TTL to clean up abandoned sessions.

## CI/CD pipeline: Jenkins + SonarQube

I didn't just build the code — I implemented the complete quality pipeline.

### Jenkinsfile

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh './mvnw clean package -DskipTests'
            }
        }

        stage('Unit Tests') {
            steps {
                sh './mvnw test'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''
                        ./mvnw sonar:sonar \
                        -Dsonar.projectKey=chat-service \
                        -Dsonar.java.coveragePlugin=jacoco
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build & Push') {
            when { branch 'main' }
            steps {
                sh 'docker build -t chat-service:${BUILD_NUMBER} .'
                sh 'docker tag chat-service:${BUILD_NUMBER} registry/chat-service:latest'
                sh 'docker push registry/chat-service:latest'
            }
        }
    }
}
```

### Quality Gates in SonarQube

I configured strict quality gates:

- **Minimum coverage**: 70% on new code
- **Maximum duplication**: 3%
- **Code smells**: 0 blocker or critical
- **Vulnerabilities**: 0 (any vulnerability blocks the deploy)

If the code doesn't pass these thresholds, Jenkins aborts the pipeline and the deploy doesn't happen. This seems restrictive, but it prevents technical debt from accumulating — every PR that gets merged meets the standard.

### The complete flow

```
Developer pushes → GitHub webhook → Jenkins pipeline:
  1. Build (mvn package)
  2. Unit tests (mvn test + JaCoCo coverage)
  3. SonarQube scan (code quality + security)
  4. Quality gate check (pass/fail)
  5. Docker build & push
  6. Deploy (Dokploy webhook)
```

Each service has its own Jenkinsfile. When I push to the Chat Service, only the Chat Service gets rebuilt and deployed — the others are untouched.

## Docker Compose for development

In local development, everything runs in Docker Compose:

```yaml
services:
  eureka-server:
    build: ./eureka-server
    ports: ["8761:8761"]
    healthcheck:
      test: curl -f http://localhost:8761/actuator/health
      interval: 10s
      retries: 5

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
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: chatdb
      POSTGRES_USER: chat
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: pg_isready -U chat
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

**Health checks are critical**. Without them, services start before Eureka is ready and fail to register. I learned this after spending an hour debugging why the Chat Service wasn't registering — Eureka wasn't ready when the service tried to connect.

## Production lessons

### What works

1. **Eureka simplifies scaling**: Spinning up another instance of a service is just starting another container. Eureka detects it and distributes load automatically.

2. **Config Server prevents hardcoded configs**: A database password change is a commit, not a redeployment of 5 services.

3. **The gateway centralizes cross-cutting concerns**: Authentication, CORS, rate limiting — in one place. When I added rate limiting to WebSocket, I only touched the gateway.

4. **SonarQube as a quality gate**: Prevents technical debt from accumulating. After 3 months, the codebase maintained the same quality as day 1.

### What hurts

1. **Distributed debugging**: A request passes through gateway -> Eureka -> Chat Service -> PostgreSQL -> Redis -> WebSocket broadcast. When it fails, where? Without distributed tracing (Zipkin/Jaeger) you're lost. I added it in week 2 after wasting half a day hunting a bug that was in the gateway, not the service.

2. **Eventual consistency**: If the User Service updates a username and the Chat Service reads it, it might show the old name. You have to design for this — in my case, I use events to propagate changes.

3. **Cold start**: 5 Spring Boot services take 30-60 seconds each to start. In development, waiting 3-4 minutes for everything to be ready is frustrating. Mitigated with `spring-boot-devtools` and selective restarts.

4. **WebSocket through the gateway**: WebSocket routing with Spring Cloud Gateway requires special configuration and doesn't natively support all STOMP features. I had to add custom headers for JWT authentication to work on the initial WebSocket connection.

### The question nobody asks

**Do you really need microservices?** For most projects, a well-structured monolith (with Clean Architecture) is better. Microservices solve **organizational scale** problems (independent teams) more than technical scale problems.

Use them when:
- Different parts of the system scale independently
- Different teams maintain different services
- You need independent deployment per module

Don't use them when:
- You're a team of 1-3 people
- Your entire system shares the same database
- The operational complexity outweighs the benefit

I built the chat system with microservices because it was a **case study** to demonstrate the patterns. In a real project with a team of 2, I would have probably started with a modular monolith.

## My current stack for microservices

- **Spring Boot 3.x** + Spring Cloud
- **Eureka** for service discovery
- **Spring Cloud Gateway** as API Gateway
- **WebSocket/STOMP** for real-time communication
- **Docker Compose** for development
- **Jenkins + SonarQube** for CI/CD and quality gates
- **Dokploy** for deployment (when the project doesn't justify Kubernetes)
- **Redis** for cache, sessions, and presence
- **PostgreSQL** as the primary database
