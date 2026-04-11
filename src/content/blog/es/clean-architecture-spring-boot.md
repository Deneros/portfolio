---
title: "Clean Architecture en Spring Boot: Guía práctica"
description: "Cómo implementar Clean Architecture de Uncle Bob en un proyecto real con Spring Boot. Capas, estructura de carpetas, DTOs, y las decisiones que importan."
date: "2026-03-15"
tags:
  - Architecture
  - Java
  - Spring Boot
readTime: "10 min"
draft: false
lang: es
slug: clean-architecture-spring-boot
---

Después de trabajar en varios proyectos enterprise con Spring Boot — ERPs, sistemas de certificación, plataformas documentales — llegué a la conclusión de que la estructura de carpetas por defecto de Spring no escala. Cuando tu proyecto crece a 20+ entidades con lógica de negocio compleja, necesitas Clean Architecture.

## ¿Qué es Clean Architecture?

Robert C. Martin (Uncle Bob) propuso una arquitectura donde **la lógica de negocio es independiente de frameworks, bases de datos y UI**. El código más importante de tu aplicación — las reglas de negocio — no debe depender de Spring, JPA, ni ningún framework.

La idea central: **las dependencias apuntan hacia adentro**. Las capas externas conocen a las internas, nunca al revés.

## Las 4 capas

### 1. Domain (el centro)

Aquí viven las entidades de negocio y las reglas que no cambian. No imports de Spring, no anotaciones JPA, no dependencias externas.

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

La lógica de negocio vive en la entidad. No en un servicio. No en un controller. **En la entidad.**

### 2. Application (casos de uso)

Orquesta el flujo: recibe una petición, llama al dominio, y coordina la persistencia. Aquí definimos los **puertos** (interfaces) que la infraestructura debe implementar.

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

### 3. Infrastructure (adaptadores)

Implementaciones concretas: JPA repositories, clientes HTTP, servicios de email. Aquí sí usas Spring, Hibernate, y todo lo que necesites.

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

### 4. Interface (adaptadores de entrada)

Controllers REST, consumers de colas, scheduled tasks. Reciben requests y las traducen a llamadas de casos de uso.

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

## Estructura de carpetas real

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

## La regla de oro: DTOs en las fronteras

**Nunca expongas entidades JPA fuera de la capa de infraestructura.** Cada frontera tiene sus propios DTOs:

- **Interface DTOs**: Lo que el cliente ve (`CertificationResponse`)
- **Application DTOs**: Lo que los casos de uso manejan
- **JPA Entities**: Solo en infraestructura

Para el mapeo uso **MapStruct** — genera código en compile time, sin reflection, sin runtime overhead.

```java
@Mapper(componentModel = "spring")
public interface CertificationMapper {
    Certification toDomain(CertificationEntity entity);
    CertificationEntity toEntity(Certification domain);
    CertificationResponse toResponse(Certification domain);
}
```

## Equivalencia con otros patrones

| Clean Architecture | Hexagonal (Ports & Adapters) | Spring tradicional |
|---|---|---|
| Domain | Domain | Entity/Model |
| Application | Application Services | Service |
| Infrastructure | Adapters (out) | Repository impl |
| Interface | Adapters (in) | Controller |

## ¿Cuándo NO usar Clean Architecture?

- **CRUDs simples**: Si tu app es mayormente CRUD sin lógica de negocio, es overengineering.
- **Prototipos/MVPs**: Primero valida la idea, después refactoriza.
- **Equipos pequeños sin experiencia**: La curva de aprendizaje puede ser contraproducente.

La uso cuando el dominio tiene **reglas de negocio complejas** — sistemas de certificación con ciclos de auditoría, cálculos de tiempos IAF, gestión de estados. Ahí Clean Architecture paga dividendos.

## Lecciones de producción

1. **No seas purista al 100%**. Usar `@Service` de Spring en la capa de aplicación es pragmático y no rompe nada importante.

2. **MapStruct es obligatorio**. Escribir mappers manuales entre 4 tipos de objetos es insostenible.

3. **Los tests de dominio son los más valiosos**. Como no dependen de nada externo, corren en milisegundos y validan la lógica que realmente importa.

4. **Empieza por el dominio**. Antes de tocar controllers o JPA, modela tus entidades y reglas de negocio. El resto es plomería.
