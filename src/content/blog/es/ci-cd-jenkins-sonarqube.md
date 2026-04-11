---
title: "CI/CD con Jenkins y SonarQube: pipeline de calidad real"
description: "Cómo configuré un pipeline CI/CD con Jenkins, SonarQube, JaCoCo y Docker para microservicios de Spring Boot. Quality gates, cobertura, análisis estático y deploy automatizado."
date: "2026-04-08"
tags:
  - DevOps
  - CI/CD
  - Java
  - Docker
readTime: "12 min"
draft: false
lang: es
slug: ci-cd-jenkins-sonarqube
---

"Funciona en mi máquina" es la frase más cara del desarrollo de software. Un pipeline CI/CD elimina esa frase del vocabulario del equipo. Aquí explico cómo configuré Jenkins con SonarQube para que ningún código llegue a producción sin pasar por análisis estático, tests automatizados, y quality gates estrictos.

## Por qué Jenkins + SonarQube

### Jenkins
Hay opciones más modernas (GitHub Actions, GitLab CI), pero Jenkins sigue siendo la opción más flexible para pipelines complejos:

- **Self-hosted**: Corre en mi VPS con Dokploy — sin límites de minutos ni costos por build.
- **Plugins para todo**: JaCoCo, SonarQube, Docker, Slack notifications, Kubernetes deploy.
- **Jenkinsfile como código**: El pipeline vive en el repo, versionado con el código.
- **Pipeline paralelos**: Puedo correr tests de frontend y backend al mismo tiempo.

### SonarQube
No es solo un linter — es un **quality gate** que bloquea deploys:

- Detecta bugs, code smells, y vulnerabilidades de seguridad
- Mide cobertura de tests con JaCoCo
- Detecta código duplicado
- Trackea deuda técnica en el tiempo
- Tiene reglas específicas para Java, TypeScript, SQL

## La arquitectura del pipeline

```
┌───────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐
│  GitHub   │────▶│ Jenkins  │────▶│ SonarQube  │────▶│ Dokploy  │
│  (push)   │     │ (build)  │     │ (análisis) │     │ (deploy) │
└───────────┘     └──────────┘     └────────────┘     └──────────┘
                       │
                  ┌────┴────┐
                  │ JaCoCo  │
                  │(coverage)│
                  └─────────┘
```

1. Developer pushea a GitHub
2. GitHub webhook dispara Jenkins
3. Jenkins compila, ejecuta tests, genera reporte de cobertura con JaCoCo
4. Jenkins envía resultados a SonarQube
5. SonarQube analiza y evalúa quality gates
6. Si pasa, Jenkins construye la imagen Docker y dispara deploy en Dokploy
7. Si falla, el pipeline se aborta y se notifica al developer

## Configuración paso a paso

### 1. Jenkins en Docker

Jenkins corre como un servicio más en Dokploy:

```yaml
# docker-compose.yml para Jenkins
services:
  jenkins:
    image: jenkins/jenkins:lts
    volumes:
      - jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - "8082:8080"
    environment:
      - JAVA_OPTS=-Xmx1g
```

El truco es montar el Docker socket — esto permite que Jenkins construya imágenes Docker dentro del pipeline sin Docker-in-Docker.

### 2. SonarQube

```yaml
services:
  sonarqube:
    image: sonarqube:community
    volumes:
      - sonarqube_data:/opt/sonarqube/data
    ports:
      - "9000:9000"
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonarqube
      - SONAR_JDBC_USERNAME=sonar
      - SONAR_JDBC_PASSWORD=sonar
```

### 3. JaCoCo en el proyecto Spring Boot

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

JaCoCo se integra con Maven. Cuando corres `mvn test`, genera un reporte de cobertura que SonarQube lee automáticamente.

## El Jenkinsfile

```groovy
pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('sonar-token')
        REGISTRY = 'registry.example.com'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh './mvnw clean compile -DskipTests'
            }
        }

        stage('Unit Tests') {
            steps {
                sh './mvnw test'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'
                    jacoco(
                        execPattern: '**/target/jacoco.exec',
                        classPattern: '**/target/classes',
                        sourcePattern: '**/src/main/java'
                    )
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh './mvnw verify -Pintegration-tests'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''
                        ./mvnw sonar:sonar \
                        -Dsonar.projectKey=${JOB_NAME} \
                        -Dsonar.java.coveragePlugin=jacoco \
                        -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                        -Dsonar.qualitygate.wait=true
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

        stage('Docker Build') {
            when { branch 'main' }
            steps {
                sh """
                    docker build -t ${REGISTRY}/${JOB_NAME}:${BUILD_NUMBER} .
                    docker tag ${REGISTRY}/${JOB_NAME}:${BUILD_NUMBER} ${REGISTRY}/${JOB_NAME}:latest
                    docker push ${REGISTRY}/${JOB_NAME}:latest
                """
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                // Trigger Dokploy webhook para redeploy
                sh """
                    curl -X POST \
                    -H "Authorization: Bearer \${DOKPLOY_TOKEN}" \
                    https://dokploy.example.com/api/deploy/${JOB_NAME}
                """
            }
        }
    }

    post {
        failure {
            echo "Pipeline failed — check SonarQube dashboard for details"
        }
        success {
            echo "Pipeline passed — deployed to ${REGISTRY}/${JOB_NAME}:latest"
        }
    }
}
```

## Quality Gates: la línea que no se cruza

Los quality gates son el corazón del sistema. Configuré estos umbrales en SonarQube:

| Métrica | Umbral | Por qué |
|---|---|---|
| Cobertura en código nuevo | ≥ 70% | Código nuevo sin tests es deuda técnica garantizada |
| Duplicación | ≤ 3% | Código duplicado multiplica bugs y esfuerzo de mantenimiento |
| Blocker issues | 0 | Bugs que causan crashes o corrupción de datos — inaceptable |
| Critical issues | 0 | Bugs con alto impacto — no llegan a producción |
| Security hotspots | Revisados | Vulnerabilidades potenciales deben ser evaluadas manualmente |

Si el código no cumple **cualquiera** de estos umbrales, el pipeline se detiene. No hay excepción. No hay "merge rápido y lo arreglo después". El quality gate es sagrado.

### Ejemplo real: cómo un quality gate salvó un deploy

Subí un PR que incluía un nuevo endpoint para exportar reportes. El código compilaba, los tests pasaban. Pero SonarQube detectó:

- **SQL injection potencial**: Estaba concatenando strings en una query nativa en lugar de usar parámetros
- **Code smell crítico**: Un try-catch que tragaba la excepción silenciosamente

Sin SonarQube, esto hubiera llegado a producción. Con el quality gate, el pipeline murió en el stage de análisis y tuve que fixear ambos issues antes de mergear.

## Cobertura de tests: qué medir y qué no

JaCoCo mide cobertura, pero **no toda cobertura es igual**:

### Lo que sí importa cubrir
- **Lógica de dominio**: Las reglas de negocio son lo más valioso del sistema
- **Casos de uso (application layer)**: El flujo de orquestación
- **Validaciones**: Edge cases en inputs del usuario

### Lo que NO vale la pena cubrir
- **Getters/setters**: JaCoCo los reporta como no cubiertos, pero testearlos no aporta nada
- **Configuración de Spring**: `@Configuration` classes son boilerplate
- **DTOs**: Clases de datos sin lógica

Configuré exclusiones en JaCoCo para no contaminar la métrica:

```xml
<configuration>
    <excludes>
        <exclude>**/dto/**</exclude>
        <exclude>**/config/**</exclude>
        <exclude>**/*Application.class</exclude>
    </excludes>
</configuration>
```

## Pipelines por servicio

En el proyecto de microservicios, cada servicio tiene su propio Jenkinsfile. Cuando pusheo al Chat Service, solo se rebuilda y testea el Chat Service — los demás no se tocan.

```
chat-service/
├── Jenkinsfile
├── Dockerfile
├── pom.xml
└── src/

user-service/
├── Jenkinsfile
├── Dockerfile
├── pom.xml
└── src/
```

Jenkins detecta qué repo cambió via webhook y solo ejecuta el pipeline del servicio correspondiente. Esto reduce los tiempos de build de 15 minutos (todo) a 3-4 minutos (un servicio).

## Monitoreo post-deploy

El pipeline no termina en el deploy. Después de deployar, verifico:

1. **Health check**: `curl /actuator/health` retorna 200
2. **Smoke test**: Un request básico al endpoint principal
3. **Logs**: Revisar que no haya errores en los primeros 2 minutos

Si cualquiera falla, Dokploy hace rollback automático al container anterior.

## Lecciones aprendidas

1. **SonarQube desde el día 1**: Agregarlo a un proyecto existente es doloroso — miles de issues que resolver antes de que los quality gates sean útiles. Empezar limpio es gratis.

2. **Tests rápidos primero**: Los unit tests corren en 10 segundos. Los de integración en 2 minutos. Poner los unit tests primero en el pipeline da feedback rápido — si fallan, no pierdes tiempo esperando la integración.

3. **Docker socket, no Docker-in-Docker**: Montar `/var/run/docker.sock` en Jenkins es más simple y más rápido que Docker-in-Docker. El trade-off es seguridad (Jenkins tiene acceso al host), pero para un servidor personal es aceptable.

4. **Quality gates estrictos funcionan**: Después de 3 meses, el codebase del proyecto de microservicios mantiene la misma calidad que el día 1. La disciplina es automática, no depende de la voluntad del developer.

5. **No seas purista con la cobertura**: 70% en código nuevo es un buen balance. Perseguir 90%+ lleva a tests frágiles que testean implementación en vez de comportamiento.

## Mi setup actual

Todo corre en un solo VPS con Dokploy:

- **Jenkins**: Build agent con Docker
- **SonarQube**: Community Edition (gratis, suficiente para proyectos personales)
- **JaCoCo**: Integrado en cada proyecto Maven
- **Dokploy**: Recibe el webhook de Jenkins post-build

Costo total: $15/mes por el VPS. Comparado con un plan de CI/CD managed ($30-50/mes por repo), es significativamente más económico con más control.
