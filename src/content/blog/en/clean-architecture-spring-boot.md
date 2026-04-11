---
title: "Clean Architecture in Spring Boot: A Practical Guide"
description: "How to implement Uncle Bob's Clean Architecture in a real Spring Boot project. Layers, folder structure, DTOs, and the decisions that actually matter."
date: "2026-03-15"
tags:
  - Architecture
  - Java
  - Spring Boot
readTime: "10 min"
draft: false
lang: en
slug: clean-architecture-spring-boot
---

After working on several enterprise projects with Spring Boot — ERPs, certification systems, document platforms — I came to the conclusion that Spring's default folder structure doesn't scale. When your project grows to 20+ entities with complex business logic, you need Clean Architecture.

## What is Clean Architecture?

Robert C. Martin (Uncle Bob) proposed an architecture where **the business logic is independent of frameworks, databases, and UI**. The most important code in your application — the business rules — should not depend on Spring, JPA, or any framework.

The core idea: **dependencies point inward**. Outer layers know about inner layers, never the other way around.

## The 4 layers

### 1. Domain (the center)

This is where business entities and rules that don't change live. No Spring imports, no JPA annotations, no external dependencies.

```java
// domain/model/Certification.java
public class Certification {
    private String id;
    private CertificationStatus status;
    private LocalDate expirationDate;
    private NormType normType;

    public boolean isExpiringSoon(int daysThreshold) {
        return LocalDate.now().plusDays(daysThreshold)
            .isAfter(expirationDate);
    }

    public void suspend(String reason) {
        if (this.status != CertificationStatus.ACTIVE) {
            throw new InvalidOperationException(
                "Solo certificaciones activas pueden suspenderse"
            );
        }
        this.status = CertificationStatus.SUSPENDED;
    }
}
```

The business logic lives in the entity. Not in a service. Not in a controller. **In the entity.**

### 2. Application (use cases)

Orchestrates the flow: receives a request, calls the domain, and coordinates persistence. This is where we define the **ports** (interfaces) that infrastructure must implement.

```java
// application/port/out/CertificationRepository.java
public interface CertificationRepository {
    Optional<Certification> findById(String id);
    void save(Certification certification);
    List<Certification> findExpiringSoon(int days);
}

// application/usecase/SuspendCertificationUseCase.java
@Service
public class SuspendCertificationUseCase {
    private final CertificationRepository repository;
    private final NotificationPort notificationPort;

    public void execute(String certificationId, String reason) {
        Certification cert = repository.findById(certificationId)
            .orElseThrow(() -> new NotFoundException("Certificación no encontrada"));

        cert.suspend(reason);
        repository.save(cert);
        notificationPort.notifySuspension(cert);
    }
}
```

### 3. Infrastructure (adapters)

Concrete implementations: JPA repositories, HTTP clients, email services. This is where you use Spring, Hibernate, and whatever else you need.

```java
// infrastructure/persistence/JpaCertificationRepository.java
@Repository
public class JpaCertificationRepository implements CertificationRepository {
    private final SpringDataCertificationRepo springRepo;
    private final CertificationMapper mapper;

    @Override
    public Optional<Certification> findById(String id) {
        return springRepo.findById(id)
            .map(mapper::toDomain);
    }

    @Override
    public void save(Certification certification) {
        CertificationEntity entity = mapper.toEntity(certification);
        springRepo.save(entity);
    }
}
```

### 4. Interface (input adapters)

REST controllers, queue consumers, scheduled tasks. They receive requests and translate them into use case calls.

```java
// interfaces/rest/CertificationController.java
@RestController
@RequestMapping("/api/certifications")
public class CertificationController {
    private final SuspendCertificationUseCase suspendUseCase;

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<Void> suspend(
        @PathVariable String id,
        @RequestBody SuspendRequest request
    ) {
        suspendUseCase.execute(id, request.reason());
        return ResponseEntity.noContent().build();
    }
}
```

## Real folder structure

```
src/main/java/com/project/
├── domain/
│   ├── model/          # Entidades de negocio (sin anotaciones)
│   ├── exception/      # Excepciones de dominio
│   └── valueobject/    # Value objects (Email, NIT, etc.)
├── application/
│   ├── usecase/        # Casos de uso
│   ├── port/
│   │   ├── in/         # Interfaces de entrada
│   │   └── out/        # Interfaces de salida (repos, servicios externos)
│   └── dto/            # DTOs de aplicación
├── infrastructure/
│   ├── persistence/
│   │   ├── entity/     # Entidades JPA (@Entity, @Table)
│   │   ├── repository/ # Spring Data repos
│   │   └── mapper/     # MapStruct: Domain ↔ JPA Entity
│   ├── config/         # Configuración Spring
│   └── external/       # Clientes HTTP, servicios cloud
└── interfaces/
    ├── rest/           # Controllers
    └── dto/            # Request/Response DTOs
```

## The golden rule: DTOs at the boundaries

**Never expose JPA entities outside the infrastructure layer.** Each boundary has its own DTOs:

- **Interface DTOs**: What the client sees (`CertificationResponse`)
- **Application DTOs**: What use cases handle
- **JPA Entities**: Infrastructure only

For mapping I use **MapStruct** — it generates code at compile time, no reflection, no runtime overhead.

```java
@Mapper(componentModel = "spring")
public interface CertificationMapper {
    Certification toDomain(CertificationEntity entity);
    CertificationEntity toEntity(Certification domain);
    CertificationResponse toResponse(Certification domain);
}
```

## Equivalence with other patterns

| Clean Architecture | Hexagonal (Ports & Adapters) | Traditional Spring |
|---|---|---|
| Domain | Domain | Entity/Model |
| Application | Application Services | Service |
| Infrastructure | Adapters (out) | Repository impl |
| Interface | Adapters (in) | Controller |

## When NOT to use Clean Architecture?

- **Simple CRUDs**: If your app is mostly CRUD without business logic, it's overengineering.
- **Prototypes/MVPs**: Validate the idea first, refactor later.
- **Small teams without experience**: The learning curve can be counterproductive.

I use it when the domain has **complex business rules** — certification systems with audit cycles, IAF time calculations, state management. That's where Clean Architecture pays dividends.

## Production lessons

1. **Don't be 100% purist**. Using Spring's `@Service` in the application layer is pragmatic and doesn't break anything important.

2. **MapStruct is mandatory**. Writing manual mappers between 4 types of objects is unsustainable.

3. **Domain tests are the most valuable**. Since they don't depend on anything external, they run in milliseconds and validate the logic that truly matters.

4. **Start with the domain**. Before touching controllers or JPA, model your entities and business rules. Everything else is plumbing.
