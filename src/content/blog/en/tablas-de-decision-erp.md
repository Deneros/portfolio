---
title: "Decision Tables in an ERP: Configurable Calculation Rules"
description: "How I implemented a rules engine with decision tables so ERP users can create and modify calculation rules without touching code. Model design, evaluation engine, and editable UI."
date: "2026-04-10"
tags:
  - Architecture
  - Java
  - Enterprise
readTime: "10 min"
draft: false
lang: en
slug: tablas-de-decision-erp
---

In a certification ERP, calculation rules change constantly. An auditor needs to adjust weights, thresholds, penalties, and formulas without waiting for a developer to deploy. The solution: **decision tables** — a way to externalize business logic into configurable data.

## The Problem: Hardcoded Business Logic

In the first version of the [AES ERP](/projects/aes-scaffold), calculation rules lived in the code:

```java
// This does NOT scale
public double calculateScore(Evaluation evaluation) {
    double score = 0;
    if (evaluation.getCategory() == Category.SAFETY) {
        score = evaluation.getRawScore() * 1.5; // safety weight
    } else if (evaluation.getCategory() == Category.QUALITY) {
        score = evaluation.getRawScore() * 1.2; // quality weight
    } else {
        score = evaluation.getRawScore() * 1.0;
    }

    if (score < 60) {
        score -= 10; // penalty for low performance
    }

    return score;
}
```

Every time the client wanted to change a weight or add a category, it meant code changes, PRs, reviews, and deployments. For a system where auditors adjust rules weekly, this is unsustainable.

## The Solution: Decision Tables

A decision table is a structure that maps **conditions** to **actions**. Instead of if/else statements in code, rules are stored as data:

| Category | Min Score | Max Score | Weight | Penalty |
|---|---|---|---|---|
| Safety | 0 | 59 | 1.5 | -10 |
| Safety | 60 | 100 | 1.5 | 0 |
| Quality | 0 | 59 | 1.2 | -5 |
| Quality | 60 | 100 | 1.2 | 0 |
| Environment | 0 | 100 | 1.0 | 0 |

Auditors can modify this table from the UI without touching code. Adding a category is adding a row, not writing another `else if`.

## Domain Model

Following Clean Architecture, the model lives in `domain/` with no external dependencies:

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
                "The new rule conflicts with an existing one"
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
        // Two rules conflict if they have the same conditions
        // but different actions
        return this.conditions.equals(other.conditions)
            && !this.actions.equals(other.actions);
    }
}
```

### Flexible conditions

Conditions use a pattern that allows dynamic comparisons:

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

## Evaluation Engine

The use case that orchestrates the evaluation:

```java
// application/usecase/EvaluateWithDecisionTableUseCase.java
@Service
public class EvaluateWithDecisionTableUseCase {
    private final DecisionTableRepository repository;

    public EvaluationResult execute(String tableId, EvaluationInput input) {
        DecisionTable table = repository.findById(tableId)
            .orElseThrow(() -> new NotFoundException("Table not found"));

        if (!table.isActive()) {
            throw new InactiveTableException("The table is inactive");
        }

        return table.evaluate(input);
    }
}
```

The evaluation logic lives in the domain (`DecisionTable.evaluate()`), not in the use case. The use case only orchestrates: it finds the table, validates that it's active, and delegates evaluation.

## Persistence

Decision tables are stored in PostgreSQL with Flyway for migrations:

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

## Editable UI with TanStack Table

On the frontend, decision tables are rendered with **TanStack Table** — supporting inline editing, sorting, and filters:

```tsx
function DecisionTableEditor({ tableId }: { tableId: string }) {
  const { data: table } = useQuery({
    queryKey: ['decision-table', tableId],
    queryFn: () => api.getDecisionTable(tableId),
  });

  const columns = useMemo(() => [
    columnHelper.accessor('conditions', {
      header: 'Conditions',
      cell: ({ row }) => (
        <ConditionEditor
          conditions={row.original.conditions}
          onChange={(conditions) => updateRule(row.original.id, { conditions })}
        />
      ),
    }),
    columnHelper.accessor('actions', {
      header: 'Actions',
      cell: ({ row }) => (
        <ActionEditor
          actions={row.original.actions}
          onChange={(actions) => updateRule(row.original.id, { actions })}
        />
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
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
      <Button onClick={addRule}>Add Rule</Button>
    </div>
  );
}
```

## Versioning and Audit Trail

Every change to a decision table generates a new version:

```java
public class DecisionTable {
    public void updateRule(String ruleId, DecisionRule updatedRule) {
        validateNoConflict(updatedRule);
        rules.replaceAll(r -> r.getId().equals(ruleId) ? updatedRule : r);
        this.version++;
    }
}
```

The version history enables:
- **Audit Trail**: Who changed which rule and when
- **Rollback**: Revert to a previous version if a rule causes issues
- **Comparison**: See what changed between versions

## Conflict Validation

Two rules conflict when they have the same conditions but different actions. This would create ambiguity — which rule applies?

The system validates conflicts when adding or modifying rules:

```java
// If I try to add:
// Safety + Score 50-70 → Weight 1.5
// But already exists:
// Safety + Score 40-60 → Weight 1.3
// → ConflictingRuleException: ranges overlap
```

Detecting overlaps in numeric ranges was the most complex part. Simple ranges are straightforward, but when multiple conditions are combined, you must verify all possible combinations.

## Lessons Learned

1. **Start simple**: The first version only supported EQUALS and BETWEEN. The IN and GREATER_THAN operators were added later when the client needed them.

2. **The rules engine does NOT replace code**: Decision tables are for configurable logic (weights, thresholds, categories). Complex logic (workflows, integrations) still lives in code.

3. **Strict validation at save time**: It's better to reject a conflicting rule at save time than to discover the conflict when an auditor is in the field evaluating an installation.

4. **Engine tests are the most important**: The evaluation engine has the highest test coverage in the project — a bug there affects all system calculations.

5. **Versioning from day one**: "Who changed this rule and when" is a question that always comes up. Having history from the start is free; adding it later is expensive.
