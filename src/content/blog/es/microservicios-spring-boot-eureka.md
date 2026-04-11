---
title: "Microservicios con Spring Boot: Eureka, API Gateway y Config Server"
description: "Arquitectura de microservicios real con Spring Cloud: service discovery, configuración centralizada, gateway, WebSocket/STOMP para chat en tiempo real, y pipeline CI/CD con Jenkins y SonarQube."
date: "2026-03-20"
tags:
  - Microservices
  - Java
  - Architecture
  - DevOps
readTime: "14 min"
draft: false
lang: es
slug: microservicios-spring-boot-eureka
---

Los microservicios suenan genial en teoría. En práctica, la complejidad operacional te puede comer si no tienes los patrones correctos. Construí un sistema de chat en tiempo real como red social con arquitectura de microservicios completa — Eureka, API Gateway, Config Server, WebSocket/STOMP, y un pipeline CI/CD con Jenkins y SonarQube. Aquí comparto los patrones que funcionan y los que no.

## La arquitectura real

No es un diagrama de libro — es lo que corre en Docker Compose:

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

Cada caja es un servicio independiente con su propio Dockerfile, su propio build, y su propio ciclo de deploy.

## Los 3 pilares de infraestructura

### 1. Eureka: Service Discovery

El problema: el Chat Service necesita hablar con el User Service, pero ¿cuál es su IP? En un entorno dinámico (containers, auto-scaling), las IPs cambian constantemente.

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
@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserResponse findById(@PathVariable String id);
}
```

**La magia**: `user-service` se resuelve automáticamente a la IP correcta. Si hay 3 instancias, Eureka hace load balancing con Ribbon.

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
├── user-service.yml          # Config de usuarios
└── notification-service.yml  # Config de notificaciones
```

Los servicios arrancan, consultan su config al Config Server, y obtienen los valores correctos para su ambiente. **Cambiar una config = commit al repo, sin redesplegar**.

En el proyecto del chat, esto fue clave cuando necesité cambiar los parámetros de conexión WebSocket en staging sin redesplegar — un commit al config-repo y `POST /actuator/refresh` en el servicio.

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
        - id: chat-websocket
          uri: lb:ws://CHAT-SERVICE  # WebSocket routing
          predicates:
            - Path=/ws/**
```

Además de routing, el gateway maneja:
- **Rate limiting**: Protección contra abuso — crítico para endpoints de WebSocket
- **CORS**: Configuración centralizada para el SPA de React
- **Autenticación**: Validar JWT antes de llegar al servicio — los requests sin token válido ni llegan al Chat Service

El routing de WebSocket fue el punto más complicado. Spring Cloud Gateway necesita `lb:ws://` para rutear correctamente las conexiones WebSocket a través de Eureka.

## Chat en tiempo real: WebSocket + STOMP

El core del sistema. No es un chat de juguete — soporta rooms, mensajes persistentes, indicadores de escritura y presencia.

### Configuración del servidor

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

### Flujo de mensajes

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

### Presencia de usuarios

Para saber quién está online, uso los eventos de conexión/desconexión de STOMP:

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

Redis almacena el estado de presencia — rápido, distribuido, y con TTL automático para limpiar sesiones abandonadas.

## Pipeline CI/CD: Jenkins + SonarQube

No solo hice el código — implementé el pipeline completo de calidad.

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

### Quality Gates en SonarQube

Configuré quality gates estrictos:

- **Cobertura mínima**: 70% en código nuevo
- **Duplicación máxima**: 3%
- **Code smells**: 0 blocker o critical
- **Vulnerabilidades**: 0 (cualquier vulnerabilidad bloquea el deploy)

Si el código no pasa estos umbrales, Jenkins aborta el pipeline y el deploy no ocurre. Esto parece restrictivo, pero previene que la deuda técnica se acumule — cada PR que se mergea cumple el estándar.

### El flujo completo

```
Developer pushes → GitHub webhook → Jenkins pipeline:
  1. Build (mvn package)
  2. Unit tests (mvn test + JaCoCo coverage)
  3. SonarQube scan (code quality + security)
  4. Quality gate check (pass/fail)
  5. Docker build & push
  6. Deploy (Dokploy webhook)
```

Cada servicio tiene su propio Jenkinsfile. Cuando pusheo al Chat Service, solo se rebuilda y deploye el Chat Service — los demás no se tocan.

## Docker Compose para desarrollo

En desarrollo local, todo corre en Docker Compose:

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

**Los health checks son críticos**. Sin ellos, los servicios arrancan antes de que Eureka esté listo y fallan al registrarse. Aprendí esto después de perder una hora debuggeando por qué el Chat Service no se registraba — Eureka no estaba listo cuando el servicio intentaba conectarse.

## Lecciones de producción

### Lo que funciona

1. **Eureka simplifica el scaling**: Levantar otra instancia de un servicio es arrancar otro container. Eureka lo detecta y distribuye carga automáticamente.

2. **Config Server previene configs hardcodeadas**: Un cambio de password de base de datos es un commit, no un redespliegue de 5 servicios.

3. **El gateway centraliza cross-cutting concerns**: Autenticación, CORS, rate limiting — en un solo lugar. Cuando agregué rate limiting al WebSocket, solo toqué el gateway.

4. **SonarQube como quality gate**: Previene que la deuda técnica se acumule. Después de 3 meses, el codebase mantenía la misma calidad que el día 1.

### Lo que duele

1. **Debugging distribuido**: Un request pasa por gateway → Eureka → Chat Service → PostgreSQL → Redis → WebSocket broadcast. Cuando falla, ¿dónde? Sin distributed tracing (Zipkin/Jaeger) estás perdido. Lo agregué en la semana 2 después de perder medio día buscando un bug que estaba en el gateway, no en el servicio.

2. **Consistencia eventual**: Si el User Service actualiza un nombre de usuario y el Chat Service lo lee, puede mostrar el nombre viejo. Hay que diseñar para esto — en mi caso, uso eventos para propagar cambios.

3. **El cold start**: 5 servicios de Spring Boot arrancan en 30-60 segundos cada uno. En desarrollo, esperar 3-4 minutos para que todo esté listo es frustrante. Mitigado con `spring-boot-devtools` y reinicio selectivo.

4. **WebSocket a través del gateway**: El routing de WebSocket con Spring Cloud Gateway requiere configuración especial y no soporta todos los features de STOMP nativamente. Tuve que agregar headers custom para que la autenticación JWT funcionara en la conexión WebSocket initial.

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

El sistema de chat lo construí con microservicios porque era un **case study** para demostrar los patrones. En un proyecto real con un equipo de 2, probablemente hubiera empezado con un monolito modular.

## Mi stack actual para microservicios

- **Spring Boot 3.x** + Spring Cloud
- **Eureka** para service discovery
- **Spring Cloud Gateway** como API Gateway
- **WebSocket/STOMP** para comunicación en tiempo real
- **Docker Compose** para desarrollo
- **Jenkins + SonarQube** para CI/CD y quality gates
- **Dokploy** para deployment (cuando el proyecto no justifica Kubernetes)
- **Redis** para caché, sesiones, y presencia
- **PostgreSQL** como base de datos principal
