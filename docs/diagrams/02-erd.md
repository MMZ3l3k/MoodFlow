# Diagram ERD bazy danych — MoodFlow

Schemat relacyjny bazy PostgreSQL. Tabele są normalizowane (3NF), kluczowe relacje
wyposażone w indeksy.

## Diagram

```mermaid
erDiagram
    organizations ||--o{ users : "zatrudnia"
    organizations ||--o{ departments : "zawiera"
    organizations ||--|| users : "ma admina"
    organizations ||--o{ assessment_assignments : "przypisuje"

    users ||--o{ assessment_results : "wypełnia"
    users ||--o{ user_responses : "odpowiada"
    users ||--o{ assessment_assignments : "jest celem"
    users ||--o{ audit_logs : "wykonuje"

    departments ||--o{ users : "grupuje"

    assessments ||--o{ questions : "zawiera"
    assessments ||--o{ answer_options : "definiuje"
    assessments ||--o{ assessment_assignments : "jest przypisany"
    assessments ||--o{ assessment_results : "generuje"

    assessment_assignments ||--o{ assessment_results : "wykonany jako"
    assessment_results ||--o{ user_responses : "zawiera"

    organizations {
        int id PK
        string name
        string nip
        string description
        enum status "PENDING|ACTIVE|BLOCKED|REJECTED"
        string inviteCode
        int adminUserId FK
        datetime createdAt
    }

    users {
        int id PK
        string email "unique"
        string passwordHash
        string firstName
        string lastName
        enum role "EMPLOYEE|HR|ADMIN|SUPER_ADMIN"
        enum status "PENDING|ACTIVE|REJECTED|SUSPENDED"
        int organizationId FK
        int departmentId FK
        string department "legacy"
        bool isOnline
        datetime lastSeenAt
        datetime createdAt
    }

    departments {
        int id PK
        string name
        int organizationId FK
        datetime createdAt
    }

    assessments {
        int id PK
        string code "unique"
        string name
        text description
        string timeframe
        int questionCount
        bool isAnonymousForHR
        bool requiresAllAnswers
        string version
        bool isActive
        datetime createdAt
    }

    questions {
        int id PK
        int assessmentId FK
        string text
        int order
        bool reversed
    }

    answer_options {
        int id PK
        int assessmentId FK
        int value
        string label
        int order
    }

    assessment_assignments {
        int id PK
        int assessmentId FK
        enum targetType "ALL|USER|DEPARTMENT"
        int targetUserId FK
        string targetDepartment
        datetime availableFrom
        datetime availableTo
        int assignedByUserId FK
        int organizationId FK
        datetime createdAt
    }

    assessment_results {
        int id PK
        int userId FK
        int assignmentId FK
        int assessmentId FK
        int rawScore
        int normalizedScore
        string severity
        json riskFlags
        json answersSnapshot
        datetime submittedAt
    }

    user_responses {
        int id PK
        int resultId FK
        int questionId FK
        int answerValue
    }

    audit_logs {
        int id PK
        int actorUserId FK
        int organizationId FK
        string action
        string entityType
        int entityId
        json metadata
        string ipAddress
        datetime createdAt
    }
```

## Decyzje projektowe

| Decyzja | Uzasadnienie |
|---|---|
| Encja `audit_logs` z `metadata` typu `jsonb` | Elastyczny schemat dla różnych typów akcji (USER_APPROVED, ORGANIZATION_REJECTED itd.). Indeksy złożone na `(actorUserId, createdAt)` i `(organizationId, createdAt)`. |
| `answersSnapshot` w `assessment_results` jako `json` | Trwały zapis pełnych odpowiedzi w momencie zapisu wyniku — zabezpieczenie przed zmianami w katalogu testów po wypełnieniu. |
| `organizationId` na każdej encji domenowej | Multi-tenant izolacja — każde zapytanie filtruje po `organizationId` z JWT. |
| Enum'y `status` zamiast bool'ów | Czytelne stany w pracy inżynierskiej i diagramach maszyn stanów. |
| `severity` jako `varchar` (nie enum) | Różne testy mają różne skale (PHQ-9: minimal/mild/moderate/moderately-severe/severe; WHO-5: low/moderate/high), trudno o wspólny enum. |
| Twardy delete użytkownika (`DELETE`) | Zgodnie z RODO — pełne usuwanie konta. Audit log zachowuje historię operacji. |
