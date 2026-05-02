# Diagram komponentów — architektura systemu MoodFlow

Pokazuje główne komponenty aplikacji i ich kanały komunikacji.

## Diagram

```mermaid
flowchart TB
    subgraph Klient["Urządzenie końcowe"]
        Browser[Przeglądarka / PWA]
    end

    subgraph Frontend["Warstwa prezentacji"]
        Client["client-frontend<br/>React + Vite + Redux<br/>port 3000 (nginx)"]
        Admin["admin-frontend<br/>Next.js 16<br/>port 3001"]
    end

    subgraph Backend["Warstwa logiki biznesowej"]
        API["backend-api<br/>NestJS<br/>port 4000"]

        subgraph Modules["Moduły domenowe"]
            AuthMod[AuthModule]
            UsersMod[UsersModule]
            OrgMod[OrganizationsModule]
            AssessMod[AssessmentsModule]
            ResultsMod[ResultsModule]
            AnalyticsMod[AnalyticsModule]
            AdminMod[AdminModule]
            AuditMod[AuditModule]
            HealthMod[HealthModule]
            NotificMod[NotificationsModule]
        end
    end

    subgraph Data["Warstwa danych"]
        DB[(PostgreSQL 16<br/>port 5432)]
    end

    subgraph External["Usługi zewnętrzne"]
        SMTP[Gmail SMTP<br/>smtp.gmail.com:587]
    end

    Browser -->|HTTPS<br/>Cookie httpOnly| Client
    Browser -->|HTTPS<br/>Cookie httpOnly| Admin

    Client -->|REST + cookie<br/>withCredentials| API
    Admin -->|REST + cookie<br/>withCredentials| API

    API --> AuthMod
    API --> UsersMod
    API --> OrgMod
    API --> AssessMod
    API --> ResultsMod
    API --> AnalyticsMod
    API --> AdminMod
    API --> AuditMod
    API --> HealthMod

    AssessMod --> NotificMod
    NotificMod -->|SMTP| SMTP

    AuthMod --> DB
    UsersMod --> DB
    OrgMod --> DB
    AssessMod --> DB
    ResultsMod --> DB
    AnalyticsMod --> DB
    AuditMod --> DB
    HealthMod -->|SELECT 1| DB
```

## Komunikacja i protokoły

| Połączenie | Protokół | Format | Bezpieczeństwo |
|---|---|---|---|
| Browser ↔ Frontend | HTTPS | HTML/JS/CSS | TLS 1.2+, CSP via Helmet, SW (PWA) |
| Frontend ↔ Backend | HTTPS REST | JSON | JWT w httpOnly cookie + Bearer fallback |
| Backend ↔ DB | TCP | binary (pg) | Wymagany VPC private network w prod |
| Backend ↔ SMTP | TCP+TLS | SMTP | TLS 1.2+, App Password (nie hasło konta) |

## Wzorce architektoniczne

- **Modular monolith** — backend jako jeden proces NestJS z modułami domenowymi.
- **Layered architecture** — controllers → services → repositories.
- **API Gateway pattern** (uproszczona forma) — frontendy przez własny URL, jeden punkt dostępu API.
- **Multi-tenant** — izolacja danych przez `organizationId` filtrowane na każdym zapytaniu.
