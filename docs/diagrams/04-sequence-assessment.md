# Diagram sekwencji — wypełnienie testu

Pokazuje przepływ danych przy wypełnianiu testu przez pracownika, od pobrania
treści testu po zapisanie wyniku i odświeżenie indeksu dobrostanu.

## Diagram

```mermaid
sequenceDiagram
    actor U as Pracownik
    participant FE as Frontend (React/PWA)
    participant API as Backend API (NestJS)
    participant Auth as JwtAuthGuard
    participant AS as AssessmentsService
    participant RS as ResultsService
    participant DB as PostgreSQL

    U->>FE: Otwiera ekran "Testy"
    FE->>API: GET /assessments/assigned (cookie mf_access)
    API->>Auth: validate JWT
    Auth-->>API: user (EMPLOYEE, orgId)
    API->>AS: findAssignedForUser(userId)
    AS->>DB: SELECT assignments WHERE userId=? AND availableTo > now()
    DB-->>AS: rows
    AS-->>API: AssignedAssessment[]
    API-->>FE: JSON

    U->>FE: Wybiera test
    FE->>API: GET /assessments/:id
    API->>AS: findOne(id)
    AS->>DB: SELECT assessment + questions + answer_options
    DB-->>AS: row
    AS-->>API: Assessment
    API-->>FE: JSON
    FE->>U: Renderuje pytania

    U->>FE: Wypełnia odpowiedzi
    FE->>API: POST /results/submit { assignmentId, answers }
    API->>Auth: validate JWT
    Auth-->>API: user
    API->>RS: submit(userId, dto)
    RS->>DB: SELECT assessment + questions
    DB-->>RS: assessment
    Note over RS: Walidacja kompletności odpowiedzi
    RS->>RS: calculateScore(answers, assessment)
    Note over RS: rawScore + normalizedScore + severity
    RS->>DB: INSERT assessment_results
    RS->>DB: INSERT user_responses (snapshot)
    DB-->>RS: result
    RS-->>API: AssessmentResult
    API-->>FE: { id, rawScore, severity }
    FE->>U: Ekran "Dziękujemy"

    Note over FE: Odświeżenie wskaźników na ekranie głównym
    FE->>API: GET /results/wellbeing-index
    API->>RS: getWellbeingIndex(userId)
    RS->>DB: SELECT AVG(rawScore) per assessment, last 30 days
    DB-->>RS: averages
    RS-->>API: { index, level, breakdown }
    API-->>FE: JSON
```

## Decyzje techniczne

| Krok | Decyzja | Uzasadnienie |
|---|---|---|
| Walidacja JWT | Cookie `mf_access` (httpOnly) ma priorytet, fallback `Authorization: Bearer` | Mitygacja XSS — token niedostępny z `document.cookie`. |
| Obliczanie scoringu | Backend, nie frontend | Wymóg z RULES.md pkt 6 — logika domenowa po stronie backendu. |
| `answersSnapshot` | Zapis pełnych odpowiedzi w `assessment_results.answersSnapshot` (JSON) | Niezmienność danych historycznych nawet po zmianie definicji testu. |
| Wellbeing index | Wagi konfigurowane w kodzie (`WB_CONFIG`) | Obliczany z 5 testów (WHO-5 + PSS-10 + PHQ-9 + GAD-7 + MOOD10), wagi 30/20/20/15/15%. |
