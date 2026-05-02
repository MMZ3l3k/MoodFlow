# Diagram wdrożenia — środowisko produkcyjne MoodFlow

Wdrożenie na platformie chmurowej (Railway / Render / Fly.io). Wszystkie kontenery
w jednej sieci wewnętrznej, dostęp publiczny tylko do frontendów.

## Diagram

```mermaid
flowchart TB
    subgraph Internet
        User1([Pracownik])
        User2([HR])
        User3([Admin])
        User4([Super Admin])
    end

    subgraph Cloud["Platforma chmurowa (Railway/Render)"]
        LB[Load Balancer + TLS]

        subgraph Network["Wewnętrzna sieć Docker Compose"]
            Client[client-frontend<br/>nginx serving SPA<br/>:80]
            Admin[admin-frontend<br/>Next.js<br/>:3001]
            API[backend-api<br/>NestJS<br/>:4000]
            DB[(postgres:16<br/>:5432<br/>volume backed)]
        end
    end

    subgraph SaaS["Usługi zewnętrzne"]
        Mail[Gmail SMTP]
    end

    User1 -.->|HTTPS<br/>app.moodflow.pl| LB
    User2 -.->|HTTPS<br/>panel.moodflow.pl| LB
    User3 -.->|HTTPS<br/>panel.moodflow.pl| LB
    User4 -.->|HTTPS<br/>panel.moodflow.pl/super-admin| LB

    LB --> Client
    LB --> Admin

    Client -->|REST API<br/>cookie httpOnly| API
    Admin -->|REST API<br/>cookie httpOnly| API
    API -->|TCP| DB
    API -.->|SMTP+TLS| Mail
```

## Konfiguracja produkcyjna

| Element | Wartość | Uwagi |
|---|---|---|
| Orkiestracja | `docker compose -f docker-compose.prod.yml up -d` | Healthchecki dla wszystkich serwisów |
| Restart policy | `unless-stopped` | Automatyczny restart przy crash |
| TLS | terminowane na load balancerze | Railway/Render dostarczają domyślnie |
| Postgres ports | tylko `expose` (nie `publish`) | Brak publicznego dostępu do bazy |
| Adminer | NIEOBECNY w prod compose | Tylko dev tool |
| Sekrety | przez env vars platformy | Nie w repo, nie w obrazie |
| Synchronize TypeORM | `false` | Migracje przez `migrationsRun: true` |
| Backup DB | po stronie platformy (managed Postgres) | Snapshot dzienny |

## Wymagane zmienne środowiskowe (produkcja)

```bash
# Baza
DB_HOST=<managed-postgres-host>
DB_PORT=5432
DB_USER=moodflow
DB_PASSWORD=<silne-haslo-wygenerowane>
DB_NAME=moodflow

# JWT (różne, min. 64 bajty losowe)
JWT_SECRET=<base64-64bytes>
JWT_REFRESH_SECRET=<base64-64bytes>

# CORS — domena frontendu
CORS_ORIGIN=https://app.moodflow.pl,https://panel.moodflow.pl

# Frontend → Backend URL
NEXT_PUBLIC_API_URL=https://api.moodflow.pl
NEXT_PUBLIC_CLIENT_URL=https://app.moodflow.pl
VITE_API_URL=https://api.moodflow.pl
VITE_ADMIN_URL=https://panel.moodflow.pl

# SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=moodflow.biuro@gmail.com
MAIL_PASS=<gmail-app-password>
MAIL_FROM=MoodFlow <moodflow.biuro@gmail.com>
```
