# MoodFlow

Platforma do monitorowania dobrostanu psychicznego pracowników w organizacji.
Aplikacja webowa (PWA) zbudowana w architekturze multi-tenant.

## Funkcjonalność

- **Panel pracownika** — codzienny check-in nastroju, wypełnianie walidowanych testów psychologicznych (PHQ-9, GAD-7, PSS-10, WHO-5, MOOD10), własna historia, indeks dobrostanu.
- **Panel HR** — zagregowane raporty z anonimizacją (k-anonymity), trendy, ryzyko, statystyki działowe.
- **Panel administratora firmy** — zarządzanie pracownikami, działami, przypisywanie testów, audit log.
- **Panel właściciela platformy** — zatwierdzanie firm, globalny widok systemu.

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend pracownika | React 19, Vite 8, Redux Toolkit, Tailwind CSS, vite-plugin-pwa |
| Frontend admin/HR | Next.js 16 (App Router), React 19, Tailwind CSS, recharts |
| Backend | NestJS 11, TypeORM, JWT, bcrypt, helmet, class-validator |
| Baza danych | PostgreSQL 16 |
| Mailing | Nodemailer + Gmail SMTP |
| Konteneryzacja | Docker, Docker Compose |

## Struktura projektu

```
MoodFlow/
├── client-frontend/        # Aplikacja React (port 3000) — pracownicy
├── admin-frontend/         # Aplikacja Next.js (port 3001) — HR/Admin/Super-admin
├── backend-api/            # API NestJS (port 4000)
├── postgres/               # Init scripts
├── docs/                   # Dokumentacja techniczna
│   ├── api-endpoints.md
│   ├── data-model.md
│   ├── deployment.md
│   ├── security.md
│   ├── decisions.md       # ADR — dziennik decyzji architektonicznych
│   └── diagrams/          # UML + BPMN (Mermaid)
├── docker-compose.yml      # Środowisko developerskie
├── docker-compose.prod.yml # Środowisko produkcyjne
├── PRD.md                  # Product Requirements Document
├── ARCHITECTURE.md         # Architektura techniczna
├── RULES.md                # Reguły projektowe
└── README.md
```

## Szybki start (development)

### Wymagania

- Docker Desktop 24+ (z Compose plugin)
- Wolne porty: `3000`, `3001`, `4000`, `5050` (Adminer), `5432`

### Uruchomienie

1. **Sklonuj repo i wejdź do katalogu:**
   ```bash
   git clone <repo-url> MoodFlow
   cd MoodFlow
   ```

2. **Skopiuj `.env.example` do `.env`** i wypełnij sekcję SMTP (App Password z Gmaila):
   ```bash
   cp .env.example .env
   # edytuj MAIL_USER i MAIL_PASS
   ```

3. **Uruchom kontenery:**
   ```bash
   docker compose up -d
   ```

4. **Otwórz w przeglądarce:**
   - http://localhost:3000 — panel pracownika
   - http://localhost:3001 — panel admin/HR
   - http://localhost:3001/super-admin/login — panel właściciela platformy
   - http://localhost:5050 — Adminer (dostęp do bazy)

### Domyślne konto super-admina (seed)

| Pole | Wartość |
|---|---|
| Email | `owner@moodflow.pl` |
| Hasło | wartość zmiennej `SEED_OWNER_PASSWORD` z `.env` |

Seed konta właściciela wykonuje się tylko wtedy, gdy zmienna `SEED_OWNER_PASSWORD` jest ustawiona — repozytorium nie zawiera żadnego domyślnego hasła.

⚠️ **Zmień hasło przy pierwszym logowaniu w panelu Ustawień.**

## Konta testowe (do utworzenia ręcznie)

1. Zarejestruj firmę w panelu admin: `http://localhost:3001/login` → „Załóż konto firmy"
2. Zaloguj się jako super-admin i zatwierdź firmę.
3. Zaloguj się jako admin firmy, otrzymasz `inviteCode` (`MOOD-XXXX`).
4. Zarejestruj pracownika: `http://localhost:3000/register` z kodem zaproszenia.
5. Zatwierdź pracownika z poziomu admina firmy.

## Komendy

| Komenda | Opis |
|---|---|
| `docker compose up -d` | Start środowiska |
| `docker compose down` | Stop |
| `docker compose down -v` | Stop + reset bazy danych |
| `docker compose logs -f backend-api` | Logi backendu |
| `docker compose exec backend-api npm run migration:generate <ścieżka>` | Generowanie migracji |
| `docker compose exec backend-api npm run migration:run` | Uruchomienie migracji |
| `docker compose exec backend-api npm run migration:revert` | Cofnięcie ostatniej migracji |

## Dokumentacja

- [PRD.md](./PRD.md) — wymagania produktowe
- [ARCHITECTURE.md](./ARCHITECTURE.md) — architektura techniczna
- [RULES.md](./RULES.md) — reguły projektowe
- [docs/api-endpoints.md](./docs/api-endpoints.md) — lista endpointów API
- [docs/data-model.md](./docs/data-model.md) — model danych
- [docs/security.md](./docs/security.md) — bezpieczeństwo
- [docs/deployment.md](./docs/deployment.md) — wdrożenie
- [docs/decisions.md](./docs/decisions.md) — dziennik decyzji architektonicznych (ADR)
- [docs/diagrams/](./docs/diagrams/) — diagramy UML + BPMN

## Bezpieczeństwo

Mechanizmy zaimplementowane:

- bcrypt (12 rounds) dla haseł
- JWT (HS256) z silnymi sekretami w env (fail-fast walidacja przy starcie)
- Rewokacja sesji przez `tokenVersion` (zmiana hasła / zawieszenie konta unieważnia wszystkie tokeny)
- CSP w trybie enforce na panelu pracownika
- httpOnly cookies + Bearer fallback (auto-refresh przy 401)
- Helmet (X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy)
- CORS z jawnymi originami
- Rate limiting na auth (login: 10/15min, register: 5/15min)
- Anonimizacja k-anonymity (k=5) w panelu HR
- Audit log akcji administracyjnych (USER_APPROVED, ORGANIZATION_*, ASSIGNMENT_*, LOGIN_*)
- HTML escape w mailach
- Multi-tenant izolacja przez `organizationId`
- Schemat bazy: `synchronize: true` (świadoma decyzja dla MVP — uzasadnienie i plan przejścia na migracje w [ARCHITECTURE.md](./ARCHITECTURE.md) §12)
- Service Worker wyklucza `/auth/*` i `/users/me` z cache (brak wycieków po wylogowaniu)

Szczegóły w [docs/security.md](./docs/security.md).

## Licencja

UNLICENSED — projekt edukacyjny, praca inżynierska.
