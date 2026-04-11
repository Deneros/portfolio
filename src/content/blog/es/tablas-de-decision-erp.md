---
title: "Tablas de decisión en un ERP: reglas de cálculo configurables"
description: "Cómo implementé un motor de reglas con tablas de decisión para que los usuarios del ERP puedan crear y modificar reglas de cálculo sin tocar código. Diseño del modelo, motor de evaluación y UI editable."
date: "2026-04-10"
tags:
  - Architecture
  - Java
  - Enterprise
readTime: "10 min"
draft: false
lang: es
slug: tablas-de-decision-erp
---

En un ERP de certificación, las reglas de cálculo cambian constantemente. Un auditor necesita ajustar pesos, umbrales, penalizaciones y fórmulas sin esperar a que un developer haga un deploy. La solución: **tablas de decisión** — una forma de externalizar la lógica de negocio a datos configurables.

## El problema: lógica de negocio hardcodeada

En la primera versión del [AES ERP](/projects/aes-scaffold), las reglas de cálculo vivían en el código:

```java
// Esto NO escala
public double calculateScore(Evaluation evaluation) {
    double score = 0;
    if (evaluation.getCategory() == Category.SAFETY) {
        score = evaluation.getRawScore() * 1.5; // peso safety
    } else if (evaluation.getCategory() == Category.QUALITY) {
        score = evaluation.getRawScore() * 1.2; // peso quality
    } else {
        score = evaluation.getRawScore() * 1.0;
    }

    if (score < 60) {
        score -= 10; // penalización por bajo rendimiento
    }

    return score;
}
```

Cada vez que el cliente quería cambiar un peso o agregar una categoría, era un cambio de código, PR, review, deploy. Para un sistema donde los auditores ajustan reglas semanalmente, esto es insostenible.

## La solución: tablas de decisión

Una tabla de decisión es una estructura que mapea **condiciones** a **acciones**. En lugar de if/else en código, las reglas se almacenan como datos:

| Categoría | Score mínimo | Score máximo | Peso | Penalización |
|---|---|---|---|---|
| Safety | 0 | 59 | 1.5 | -10 |
| Safety | 60 | 100 | 1.5 | 0 |
| Quality | 0 | 59 | 1.2 | -5 |
| Quality | 60 | 100 | 1.2 | 0 |
| Environment | 0 | 100 | 1.0 | 0 |

El auditor puede modificar esta tabla desde la UI sin tocar código. Agregar una categoría es agregar una fila, no un `else if`.

## Modelo de dominio

Siguiendo Clean Architecture, el modelo vive en `domain/` sin dependencias externas:

```java
// domain/model/DecisionTable.java
public class DecisionTable {
    private String id;
    private String name;
    private String description;
    private NormType normType;           // ISO 9001, ISO 14001, etc.
    private List<DecisionRule> rules;
    private boolean active;
    private int version;

    public EvaluationResult evaluate(EvaluationInput input) {
        return rules.stream()
            .filter(rule -> rule.matches(input))
            .findFirst()
            .map(rule -> rule.apply(input))
            .orElseThrow(() -> new NoMatchingRuleException(
                "No rule matches input: " + input
            ));
    }

    public void addRule(DecisionRule rule) {
        validateNoConflict(rule);
        this.rules.add(rule);
        this.version++;
    }

    private void validateNoConflict(DecisionRule newRule) {
        boolean hasConflict = rules.stream()
            .anyMatch(existing -> existing.conflictsWith(newRule));
        if (hasConflict) {
            throw new ConflictingRuleException(
                "La nueva regla entra en conflicto con una existente"
            );
        }
    }
}
```

```java
// domain/model/DecisionRule.java
public class DecisionRule {
    private String id;
    private List<Condition> conditions;
    private List<Action> actions;
    private int priority;

    public boolean matches(EvaluationInput input) {
        return conditions.stream()
            .allMatch(condition -> condition.evaluate(input));
    }

    public EvaluationResult apply(EvaluationInput input) {
        var result = new EvaluationResult(input);
        actions.forEach(action -> action.execute(result));
        return result;
    }

    public boolean conflictsWith(DecisionRule other) {
        // Dos reglas conflictan si tienen las mismas condiciones
        // pero diferentes acciones
        return this.conditions.equals(other.conditions)
            && !this.actions.equals(other.actions);
    }
}
```

### Condiciones flexibles

Las condiciones usan un patrón que permite comparaciones dinámicas:

```java
// domain/model/Condition.java
public class Condition {
    private String field;        // "category", "rawScore", "auditorLevel"
    private Operator operator;   // EQUALS, GREATER_THAN, BETWEEN, IN
    private String value;        // "Safety", "60", "60-100"

    public boolean evaluate(EvaluationInput input) {
        Object fieldValue = input.getField(this.field);
        return operator.compare(fieldValue, this.value);
    }
}

public enum Operator {
    EQUALS {
        public boolean compare(Object field, String value) {
            return field.toString().equals(value);
        }
    },
    GREATER_THAN {
        public boolean compare(Object field, String value) {
            return ((Number) field).doubleValue() > Double.parseDouble(value);
        }
    },
    BETWEEN {
        public boolean compare(Object field, String value) {
            String[] range = value.split("-");
            double num = ((Number) field).doubleValue();
            return num >= Double.parseDouble(range[0])
                && num <= Double.parseDouble(range[1]);
        }
    },
    IN {
        public boolean compare(Object field, String value) {
            return Arrays.asList(value.split(",")).contains(field.toString());
        }
    }
}
```

## Motor de evaluación

El caso de uso que orquesta la evaluación:

```java
// application/usecase/EvaluateWithDecisionTableUseCase.java
@Service
public class EvaluateWithDecisionTableUseCase {
    private final DecisionTableRepository repository;

    public EvaluationResult execute(String tableId, EvaluationInput input) {
        DecisionTable table = repository.findById(tableId)
            .orElseThrow(() -> new NotFoundException("Tabla no encontrada"));

        if (!table.isActive()) {
            throw new InactiveTableException("La tabla está desactivada");
        }

        return table.evaluate(input);
    }
}
```

La lógica de evaluación vive en el dominio (`DecisionTable.evaluate()`), no en el caso de uso. El caso de uso solo orquesta: busca la tabla, valida que esté activa, y delega la evaluación.

## Persistencia

Las tablas de decisión se almacenan en PostgreSQL con Flyway para las migraciones:

```sql
-- V1__create_decision_tables.sql
CREATE TABLE decision_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    norm_type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE decision_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES decision_tables(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES decision_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL,
    value VARCHAR(255) NOT NULL
);

CREATE TABLE rule_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES decision_rules(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,  -- MULTIPLY, ADD, SET, PENALIZE
    field VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL
);
```

## UI editable con TanStack Table

En el frontend, las tablas de decisión se renderizan con **TanStack Table** — soporta edición inline, sorting, y filtros:

```tsx
function DecisionTableEditor({ tableId }: { tableId: string }) {
  const { data: table } = useQuery({
    queryKey: ['decision-table', tableId],
    queryFn: () => api.getDecisionTable(tableId),
  });

  const columns = useMemo(() => [
    columnHelper.accessor('conditions', {
      header: 'Condiciones',
      cell: ({ row }) => (
        <ConditionEditor
          conditions={row.original.conditions}
          onChange={(conditions) => updateRule(row.original.id, { conditions })}
        />
      ),
    }),
    columnHelper.accessor('actions', {
      header: 'Acciones',
      cell: ({ row }) => (
        <ActionEditor
          actions={row.original.actions}
          onChange={(actions) => updateRule(row.original.id, { actions })}
        />
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Prioridad',
      cell: ({ row }) => (
        <input
          type="number"
          value={row.original.priority}
          onChange={(e) => updateRule(row.original.id, {
            priority: parseInt(e.target.value)
          })}
        />
      ),
    }),
  ], []);

  return (
    <div>
      <DataTable columns={columns} data={table?.rules ?? []} />
      <Button onClick={addRule}>Agregar regla</Button>
    </div>
  );
}
```

## Versionado y auditoría

Cada cambio en una tabla de decisión genera una nueva versión:

```java
public class DecisionTable {
    public void updateRule(String ruleId, DecisionRule updatedRule) {
        validateNoConflict(updatedRule);
        rules.replaceAll(r -> r.getId().equals(ruleId) ? updatedRule : r);
        this.version++;
    }
}
```

El historial de versiones permite:
- **Auditoría**: Quién cambió qué regla y cuándo
- **Rollback**: Volver a una versión anterior si una regla causa problemas
- **Comparación**: Ver qué cambió entre versiones

## Validación de conflictos

Dos reglas conflictan cuando tienen las mismas condiciones pero diferentes acciones. Esto crearía ambigüedad — ¿qué regla aplica?

El sistema valida conflictos al agregar o modificar reglas:

```java
// Si intento agregar:
// Safety + Score 50-70 → Peso 1.5
// Pero ya existe:
// Safety + Score 40-60 → Peso 1.3
// → ConflictingRuleException: rangos se solapan
```

La detección de solapamiento en rangos numéricos fue la parte más compleja. Para rangos simples es directo, pero cuando hay múltiples condiciones combinadas, hay que verificar todas las combinaciones posibles.

## Lecciones aprendidas

1. **Empieza simple**: La primera versión solo soportaba EQUALS y BETWEEN. Los operadores IN y GREATER_THAN se agregaron después cuando el cliente los necesitó.

2. **El motor de reglas NO reemplaza código**: Las tablas de decisión son para lógica configurable (pesos, umbrales, categorías). La lógica compleja (workflows, integraciones) sigue en código.

3. **Validación estricta al guardar**: Es mejor rechazar una regla conflictiva al guardar que descubrir el conflicto cuando un auditor está en campo evaluando una instalación.

4. **Tests del motor son los más importantes**: El motor de evaluación tiene la mayor cobertura del proyecto — un bug ahí afecta todos los cálculos del sistema.

5. **Versionado desde el día 1**: "Quién cambió esta regla y cuándo" es una pregunta que siempre llega. Tener el historial desde el inicio es gratis; agregarlo después es costoso.
