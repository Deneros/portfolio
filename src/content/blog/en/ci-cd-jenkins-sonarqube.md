---
title: "CI/CD with Jenkins and SonarQube: a real quality pipeline"
description: "How I set up a CI/CD pipeline with Jenkins, SonarQube, JaCoCo, and Docker for Spring Boot microservices. Quality gates, coverage, static analysis, and automated deployment."
date: "2026-04-08"
tags:
  - DevOps
  - CI/CD
  - Java
  - Docker
readTime: "12 min"
draft: false
lang: en
slug: ci-cd-jenkins-sonarqube
---

"It works on my machine" is the most expensive phrase in software development. A CI/CD pipeline eliminates that phrase from the team's vocabulary. Here I explain how I set up Jenkins with SonarQube so that no code reaches production without passing static analysis, automated tests, and strict quality gates.

## Why Jenkins + SonarQube

### Jenkins
There are more modern options (GitHub Actions, GitLab CI), but Jenkins remains the most flexible choice for complex pipelines:

- **Self-hosted**: Runs on my VPS with Dokploy — no minute limits or per-build costs.
- **Plugins for everything**: JaCoCo, SonarQube, Docker, Slack notifications, Kubernetes deploy.
- **Jenkinsfile as code**: The pipeline lives in the repo, versioned with the code.
- **Parallel pipelines**: I can run frontend and backend tests at the same time.

### SonarQube
It's not just a linter — it's a **quality gate** that blocks deploys:

- Detects bugs, code smells, and security vulnerabilities
- Measures test coverage with JaCoCo
- Detects duplicated code
- Tracks technical debt over time
- Has specific rules for Java, TypeScript, SQL

## The pipeline architecture

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

1. Developer pushes to GitHub
2. GitHub webhook triggers Jenkins
3. Jenkins compiles, runs tests, generates coverage report with JaCoCo
4. Jenkins sends results to SonarQube
5. SonarQube analyzes and evaluates quality gates
6. If it passes, Jenkins builds the Docker image and triggers deploy on Dokploy
7. If it fails, the pipeline aborts and the developer is notified

## Step-by-step configuration

### 1. Jenkins in Docker

Jenkins runs as another service in Dokploy:

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

The trick is mounting the Docker socket — this lets Jenkins build Docker images inside the pipeline without Docker-in-Docker.

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

### 3. JaCoCo in the Spring Boot project

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

JaCoCo integrates with Maven. When you run `mvn test`, it generates a coverage report that SonarQube reads automatically.

## The Jenkinsfile

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

## Quality Gates: the line you don't cross

Quality gates are the heart of the system. I configured these thresholds in SonarQube:

| Metric | Threshold | Why |
|---|---|---|
| Coverage on new code | >= 70% | New code without tests is guaranteed technical debt |
| Duplication | <= 3% | Duplicated code multiplies bugs and maintenance effort |
| Blocker issues | 0 | Bugs that cause crashes or data corruption — unacceptable |
| Critical issues | 0 | High-impact bugs — they don't reach production |
| Security hotspots | Reviewed | Potential vulnerabilities must be manually evaluated |

If the code doesn't meet **any** of these thresholds, the pipeline stops. No exceptions. No "quick merge and I'll fix it later." The quality gate is sacred.

### Real example: how a quality gate saved a deploy

I submitted a PR that included a new endpoint for exporting reports. The code compiled, the tests passed. But SonarQube detected:

- **Potential SQL injection**: I was concatenating strings in a native query instead of using parameters
- **Critical code smell**: A try-catch that was silently swallowing the exception

Without SonarQube, this would have reached production. With the quality gate, the pipeline died at the analysis stage and I had to fix both issues before merging.

## Test coverage: what to measure and what not to

JaCoCo measures coverage, but **not all coverage is equal**:

### What you should cover
- **Domain logic**: Business rules are the most valuable part of the system
- **Use cases (application layer)**: The orchestration flow
- **Validations**: Edge cases in user inputs

### What is NOT worth covering
- **Getters/setters**: JaCoCo reports them as uncovered, but testing them adds nothing
- **Spring configuration**: `@Configuration` classes are boilerplate
- **DTOs**: Data classes without logic

I configured exclusions in JaCoCo to avoid contaminating the metric:

```xml
<configuration>
    <excludes>
        <exclude>**/dto/**</exclude>
        <exclude>**/config/**</exclude>
        <exclude>**/*Application.class</exclude>
    </excludes>
</configuration>
```

## Per-service pipelines

In the microservices project, each service has its own Jenkinsfile. When I push to the Chat Service, only the Chat Service gets rebuilt and tested — the others are untouched.

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

Jenkins detects which repo changed via webhook and only runs the corresponding service's pipeline. This cuts build times from 15 minutes (everything) to 3-4 minutes (one service).

## Post-deploy monitoring

The pipeline doesn't end at deploy. After deploying, I verify:

1. **Health check**: `curl /actuator/health` returns 200
2. **Smoke test**: A basic request to the main endpoint
3. **Logs**: Check for errors in the first 2 minutes

If anything fails, Dokploy automatically rolls back to the previous container.

## Lessons learned

1. **SonarQube from day 1**: Adding it to an existing project is painful — thousands of issues to fix before quality gates are useful. Starting clean is free.

2. **Fast tests first**: Unit tests run in 10 seconds. Integration tests in 2 minutes. Putting unit tests first in the pipeline gives fast feedback — if they fail, you don't waste time waiting for integration.

3. **Docker socket, not Docker-in-Docker**: Mounting `/var/run/docker.sock` in Jenkins is simpler and faster than Docker-in-Docker. The trade-off is security (Jenkins has access to the host), but for a personal server it's acceptable.

4. **Strict quality gates work**: After 3 months, the microservices project codebase maintained the same quality as day 1. The discipline is automatic, it doesn't depend on the developer's willpower.

5. **Don't be a purist about coverage**: 70% on new code is a good balance. Chasing 90%+ leads to brittle tests that test implementation instead of behavior.

## My current setup

Everything runs on a single VPS with Dokploy:

- **Jenkins**: Build agent with Docker
- **SonarQube**: Community Edition (free, sufficient for personal projects)
- **JaCoCo**: Integrated into every Maven project
- **Dokploy**: Receives the post-build webhook from Jenkins

Total cost: $15/month for the VPS. Compared to a managed CI/CD plan ($30-50/month per repo), it's significantly cheaper with more control.
