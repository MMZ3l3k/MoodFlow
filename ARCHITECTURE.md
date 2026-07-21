# ARCHITECTURE.md — MoodFlow

## 1. Cel dokumentu

Dokument opisuje **faktyczną** architekturę techniczną platformy MoodFlow — stan zaimplementowany i wdrożony, nie projekt docelowy. Przeznaczony dla osób rozwijających i utrzymujących system oraz jako materiał źródłowy do dokumentacji pracy inżynierskiej.

Dokumenty powiązane: [PRD.md](./PRD.md) (wymagania produktowe), [docs/api-endpoints.md](./docs/api-endpoints.md) (pełna lista endpointów), [docs/data-model.md](./docs/data-model.md) (model danych), [docs/security.md](./docs/security.md) (bezpieczeństwo), [docs/decisions.md](./docs/decisions.md) (dziennik decyzji ADR), [docs/deployment.md](./docs/deployment.md) (wdrożenie).

---

## 2. Przegląd systemu

MoodFlow to platforma **multi-tenant** do monitorowania dobrostanu psychicznego pracowników. System składa się z trzech aplikacji i jednej bazy danych:

```txt
client-frontend (React+Vite, port 3000)  ──┐
                                           ├──>  backend-api (NestJS, port 4000)  ──>  PostgreSQL 16 (port 5432)
admin-frontend (Next.js, port 3001)     ──┘
```

- **client-frontend** — panel pracownika (PWA): check-iny nastroju, wypełnianie testów, własne wyniki.
- **admin-frontend** — panel HR / administratora firmy / właściciela platformy: raporty zagregowane, zarządzanie użytkownikami i firmami, planowanie testów.
- **backend-api** — całość logiki biznesowej: uwierzytelnianie, autoryzacja, scoring, agregacje, anonimizacja, audit.
- **PostgreSQL** — jedna wspólna baza; izolacja tenantów przez kolumnę `organizationId` (separacja logiczna wierszy, nie fizyczna baz).

### Zasady architektoniczne

- cała logika biznesowa po stronie backendu — frontend nie liczy wyników, nie decyduje o uprawnieniach, nie anonimizuje,
- dwa osobne frontendy, bo pracownik i administracja mają rozłączne scenariusze, uprawnienia i wymagania UX (RULES.md §33),
- anonimizacja danych HR jest egzekwowana w backendzie (k-anonimowość, k=5) — panel HR konsumuje wyłącznie agregaty,
- prostota ponad wzorce: monolit modularny NestJS zamiast mikroserwisów — adekwatnie do skali projektu (RULES.md §9).

---

## 3. Stack technologiczny (stan faktyczny)

| Warstwa | Technologia | Wersja | Uzasadnienie |
|---|---|---|---|
| Panel pracownika | React + Vite | React 19.2, Vite 8.0 | komponentowy UI, szybki dev server i build; PWA przez vite-plugin-pwa |
| — routing / stan | React Router 7, Redux Toolkit | 7.13 | standardowe SPA; Redux dla sesji i stanu globalnego |
| Panel admin/HR | Next.js (App Router) | 16.1 | struktura wielopanelowa (HR/admin/super-admin) z layoutami per segment; recharts do wykresów |
| Backend | NestJS | 11 | modularna architektura (kontroler→serwis→repozytorium), wbudowane guardy, DI, walidacja DTO |
| ORM | TypeORM | 0.3.28 | mapowanie encji, parametryzacja zapytań (ochrona przed SQL injection) |
| Baza danych | PostgreSQL | 16 (alpine) | relacyjna, JSONB dla `audit_logs.metadata` i `riskFlags` (ADR-002: zmiana z planowanego MySQL) |
| Auth | JWT (passport-jwt), bcrypt | — | tokeny access/refresh; bcrypt cost 12 |
| Mail | @nestjs-modules/mailer + Nodemailer | — | powiadomienia e-mail przez SMTP (Gmail) |
| Konteneryzacja | Docker + Docker Compose | — | powtarzalne środowisko dev i prod |
| Hosting produkcyjny | Railway | — | 4 serwisy: backend, 2 frontendy, Postgres |

Wszystkie aplikacje w **TypeScript**.

---

## 4. Struktura repozytorium

```txt
MoodFlow/
├── backend-api/            # NestJS API (port 4000)
│   └── src/
│       ├── main.ts         # bootstrap: helmet, CORS, ValidationPipe, walidacja env, seed
│       ├── app.module.ts   # TypeORM, Throttler, Mailer, moduły domenowe
│       ├── data-source.ts  # konfiguracja CLI TypeORM (migracje)
│       ├── migrations/     # migracja InitialSchema (patrz §12 — świadome odstępstwo)
│       ├── seed/           # seed super-admina i katalogu testów
│       ├── common/         # enums (Role, UserStatus...), guards, decorators
│       └── modules/        # 12 modułów domenowych (patrz §5)
├── client-frontend/        # React+Vite PWA (port 3000, w kontenerze nginx:80)
│   └── src/
│       ├── api/            # axiosClient (VITE_API_URL, interceptor refresh)
│       ├── components/     # AppLayout, ProtectedRoute, NotificationBell...
│       ├── pages/          # Login, Register, Home, Tests, TakeAssessment, Results, Settings
│       ├── store/          # Redux (authSlice)
│       └── hooks/          # useAuth, useTheme
├── admin-frontend/         # Next.js App Router (port 3001)
│   ├── app/                # login/, super-admin/, auth/callback/, dashboard/ (users, hr/, analytics...)
│   ├── components/         # Sidebar, NotificationBell, SwRegister...
│   └── lib/                # auth.ts (sesja), axiosClient, buildReportPdf
├── docs/                   # dokumentacja techniczna (endpointy, model danych, ADR, security, deployment)
├── docker-compose.yml      # środowisko developerskie (+ adminer :5050)
├── docker-compose.prod.yml # środowisko produkcyjne
└── .env.example            # szablon konfiguracji bez sekretów
```

---

## 5. Backend — moduły domenowe

Każdy moduł ma tę samą strukturę wewnętrzną: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`.

| Moduł | Odpowiedzialność |
|---|---|
| `auth` | rejestracja firmy/pracownika, logowanie, JWT access+refresh, wylogowanie, **handoff** (jednorazowy kod przekazania sesji między panelami) |
| `users` | profil (`/users/me`), zmiana hasła, usunięcie konta, zarządzanie użytkownikami i statusami przez admina |
| `organizations` | cykl życia firm-tenantów: rejestracja → zatwierdzenie/odrzucenie/blokada przez SUPER_ADMIN |
| `departments` | CRUD działów w obrębie organizacji |
| `assessments` | katalog testów psychologicznych, przypisania (assignments) do firmy/działu/pracownika z oknem czasowym |
| `responses` | przyjęcie wypełnionego testu: walidacja kompletności, zakresów wartości i duplikatów |
| `results` | wyniki użytkownika, indeks dobrostanu, historia; podmoduł `scoring/` — obliczanie wyników |
| `analytics` | agregaty dla HR/admina z egzekwowaną k-anonimowością (k=5) |
| `admin` | przegląd systemu i aktywność dzienna dla panelu administracyjnego |
| `notifications` | powiadomienia in-app (dzwonek) + wysyłka e-mail (MailService) |
| `audit` | dziennik działań administracyjnych i logowań |
| `health` | `GET /health` — status aplikacji i bazy (używany przez monitoring) |

### Warstwy wewnątrz modułu

- **Kontroler** — przyjmuje żądanie, waliduje DTO, zwraca odpowiedź; brak logiki biznesowej.
- **Serwis** — reguły biznesowe, kontrola uprawnień kontekstowych (np. przynależność do organizacji), orkiestracja.
- **Repozytorium TypeORM** — dostęp do danych (wstrzykiwane `Repository<Entity>`).
- **DTO + class-validator** — jawny kontrakt wejścia; globalny `ValidationPipe` z `whitelist: true` i `forbidNonWhitelisted: true` odrzuca pola spoza kontraktu.
- **Guardy/interceptory** — `JwtAuthGuard` → `RolesGuard` (dekorator `@Roles()`); globalny `ClassSerializerInterceptor` respektuje `@Exclude()` (np. `passwordHash` nigdy nie opuszcza API).

---

## 6. Model danych (skrót)

Pełny opis: [docs/data-model.md](./docs/data-model.md).

Główne encje: `users`, `organizations`, `departments`, `assessments`, `questions`, `answer_options`, `assessment_assignments`, `assessment_results`, `user_responses`, `notifications`, `audit_logs`.

Kluczowe relacje:

- `Organization 1—N User`, `Organization 1—N Department`,
- `Assessment 1—N Question`, `Assessment 1—N AnswerOption` (cascade),
- `AssessmentAssignment` → test + cel (cała firma / dział / użytkownik) + okno czasowe (`startsAt`/`dueAt`) + autor,
- `AssessmentResult` → użytkownik + test + `rawScore`/`normalizedScore`/`severity`/`riskFlags (json)`; `UserResponse 1—N` na wynik (zapis transakcyjny),
- `AuditLog` — aktor, akcja, typ i id encji, `metadata (jsonb)`, ip; indeksy po aktorze, organizacji i encji.

**Multi-tenancy:** kolumna `organizationId` w `users`, `departments`, `assessment_assignments`, `assessment_results`, `audit_logs`. Każde zapytanie domenowe filtruje po `organizationId` z tokenu JWT — użytkownik firmy A nie może odczytać danych firmy B (wymuszane w serwisach, nie w frontendzie).

Statusy: `UserStatus` = pending / active / rejected / suspended; `OrganizationStatus` = pending / active / rejected / blocked.

---

## 7. Role i autoryzacja

Role (`Role` enum): `EMPLOYEE`, `HR`, `ADMIN` (administrator firmy), `SUPER_ADMIN` (właściciel platformy).

| Rola | Zakres |
|---|---|
| EMPLOYEE | własne check-iny, testy, wyniki i historia; zero dostępu do danych innych osób |
| HR | agregaty analityczne własnej organizacji (z k-anonimowością), planowanie testów, lista pracowników (bez wyników jednostkowych) |
| ADMIN | jak HR + zatwierdzanie pracowników, zarządzanie działami i rolami we własnej organizacji |
| SUPER_ADMIN | zatwierdzanie/odrzucanie/blokowanie firm, przegląd platformy; poza strukturą pojedynczego tenanta |

Egzekwowanie: `RolesGuard` czyta metadane `@Roles(...)` na poziomie metody kontrolera i porównuje z rolą z JWT. Eskalacja uprawnień jest zablokowana — endpointy aktualizacji użytkownika walidują docelową rolę i nie pozwalają nadać `SUPER_ADMIN` (naprawa K1 z audytu; zmiany ról trafiają do audit logu).

Po stronie admin-frontendu dodatkowa warstwa UX: kontrola roli względem trasy w `app/dashboard/layout.tsx` (np. HR wchodzący na `/dashboard/users` jest przekierowany do `/dashboard/hr`) — to wygoda nawigacyjna; właściwa autoryzacja zawsze w backendzie.

---

## 8. Uwierzytelnianie i sesje

### Logowanie i tokeny

1. `POST /auth/login` weryfikuje hasło (bcrypt, cost 12) i status konta,
2. backend wystawia **access token JWT (15 min)** i **refresh token JWT (7 dni)** — payload: `{ sub, email, role, organizationId }`,
3. tokeny wracają w body oraz jako ciasteczka httpOnly (`mf_access`, `mf_refresh`); klienci używają nagłówka `Authorization: Bearer` z automatycznym odświeżaniem po 401 (interceptor axios zapisuje nowe tokeny i ponawia kolejkę żądań),
4. `POST /auth/refresh` (strategia `jwt-refresh`) odświeża sesję; konta `SUSPENDED`/`REJECTED` są odrzucane przy odświeżaniu; endpoint ma własny rate limit (30/15 min),
5. `POST /auth/logout` czyści ciasteczka.

Sekrety JWT są walidowane przy starcie aplikacji (fail-fast): wymagane, min. 32 znaki, różne od siebie, bez trywialnych wartości.

### Handoff między panelami (bez tokenów w URL)

Gdy kontem HR/ADMIN ktoś loguje się w panelu pracownika:

1. client-frontend po zalogowaniu woła `POST /auth/handoff` (z Bearer) → backend generuje **jednorazowy kod** (`randomBytes(32)`, TTL 60 s, przechowywany w pamięci procesu),
2. przeglądarka jest przekierowana na `admin-frontend /auth/callback?code=...`,
3. callback woła `POST /auth/handoff/exchange` → kod jest konsumowany (jednorazowo) i wymieniany na tokeny + rolę,
4. tokeny nigdy nie występują w URL (naprawa H3 z audytu — poprzednio tokeny szły we fragmencie URL).

Ograniczenie świadome: magazyn kodów jest in-memory — wystarczający przy pojedynczej instancji backendu; przy skalowaniu horyzontalnym wymagałby przeniesienia do współdzielonego magazynu (np. Redis).

### Sesja w panelu admina

`admin-frontend` przechowuje tokeny w `localStorage` (`admin_access_token`, `admin_refresh_token`, `admin_role`) z timeoutem bezczynności (domyślnie 15 min). Wariant cookies `SameSite` + CSRF dla adminów opisany jako przyszły rozwój (ADR/H1) — obecne podejście Bearer działa poprawnie z osobnymi domenami frontendów.

---

## 9. Scoring testów (backend-only)

`ScoringService` (`results/scoring/`) oblicza wyniki wyłącznie po stronie serwera, po kodzie testu:

| Test | Zakres | Logika |
|---|---|---|
| PHQ-9 | 0–27 | progi 5/10/15/20 (minimal→severe); odpowiedź >0 na pytanie 9 ustawia `selfHarmRiskFlag` niezależnie od sumy |
| GAD-7 | 0–21 | progi 5/10/15; `needsFurtherEvaluation` przy ≥10 |
| PSS-10 | 0–40 | pytania 4/5/7/8 odwrócone (4−wartość); progi 14/27 |
| WHO-5 | 0–25 raw | normalizacja ×4 do 0–100; `poorWellbeingFlag` przy raw <13 |
| MOOD10 | 10–50 | część pytań odwrócona (6−wartość); progi 20/30/40 |
| DAILY_MOOD | 1–5 | mapa poziomów very_bad→very_good |

Zapis odpowiedzi i wyniku jest **transakcyjny** (H7): albo wynik i wszystkie odpowiedzi, albo nic. Walidacja wejścia (K4): kompletność zestawu, zakres wartości, poprawność `questionId`, brak duplikatów, brak ponownego wypełnienia przypisania.

Pokrycie testami: `scoring.service.spec.ts` — 50 testów jednostkowych progów, pytań odwróconych, flag i walidacji.

---

## 10. Prywatność i k-anonimowość

Zasada: **HR nigdy nie widzi danych jednostkowych.** `AnalyticsService` egzekwuje próg `MIN_GROUP_SIZE = 5` we wszystkich agregatach:

- statystyki i indeks dobrostanu per dział (`avgScore: null`, `anonymized: true` poniżej progu),
- historia tygodniowa i indeks organizacji,
- rozkład poziomów nasilenia per test,
- obciążenie działów i raport zmian krytycznych (działy <5 osób pomijane).

Dodatkowo: nota prywatności na ekranie testu (H6), odpowiedź kryzysowa PHQ-9 Q9 pokazywana wyłącznie pracownikowi, minimalizacja danych w odpowiedziach API (DTO + `@Exclude`).

---

## 11. Frontendy

### client-frontend (panel pracownika)

- **PWA**: vite-plugin-pwa, manifest, service worker workbox — `NetworkOnly` dla `/auth/*`, `/users/me`, `/results`, `/admin`, `/analytics` (brak cache danych wrażliwych), `NetworkFirst` dla reszty API,
- **ProtectedRoute** — trasy `/app/*` wymagają sesji,
- **Autozapis draftu testu** (H5): odpowiedzi zapisywane w `sessionStorage` pod kluczem `mf_assessment_draft_<assignmentId>`, odtwarzane po odświeżeniu strony,
- serwowany przez **nginx** z fallbackiem SPA i nagłówkami bezpieczeństwa (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP w trybie Report-Only).

### admin-frontend (HR / admin / super-admin)

- Next.js App Router z segmentami: `login/`, `super-admin/`, `auth/callback/` (handoff), `dashboard/` (admin: users, pending, analytics, assessments, settings) i `dashboard/hr/` (raporty, pracownicy, generowanie),
- wykresy recharts; eksport raportu przez `lib/buildReportPdf.ts`,
- własny service worker (`SwRegister`) cache'ujący wyłącznie zasoby same-origin (K7).

---

## 12. Świadome odstępstwa i ograniczenia (do obrony)

Każde z poniższych to udokumentowana decyzja, nie przeoczenie:

| Temat | Stan | Uzasadnienie / plan |
|---|---|---|
| Schemat bazy | **`synchronize: true` w runtime**; migracja InitialSchema istnieje, ale nie jest uruchamiana | baza produkcyjna została zbudowana przez synchronize; przejście na wyłącznie-migracje to osobny krok operacyjny (ryzyko rozjazdu schematu przy „flipie" na żywej bazie); `data-source.ts` dla CLI ma już `synchronize: false` |
| CSP | Report-Only (client nginx) | najpierw obserwacja raportów naruszeń, potem enforce — uniknięcie zepsucia produkcji |
| Rewokacja sesji | częściowa (H10): status konta sprawdzany przy refresh + rate limit | pełny `tokenVersion` (unieważnienie wszystkich sesji użytkownika) w planie rozwoju |
| Sesja admina | tokeny w localStorage (H1) | wariant cookies SameSite+CSRF odłożony świadomie — wymaga wspólnej domeny lub proxy; opisany jako przyszły rozwój |
| Handoff store | in-memory, TTL 60 s | wystarczające dla 1 instancji; przy skalowaniu → Redis |
| Prefix API | brak globalnego `/api/v1` | ścieżki płaskie (`/auth`, `/users`...); wersjonowanie odłożone do czasu pierwszego breaking change |

---

## 13. Wdrożenie

### Środowisko developerskie (`docker-compose.yml`)

| Serwis | Port (host) | Uwagi |
|---|---|---|
| client-frontend | 3000 | nginx:80 w kontenerze |
| admin-frontend | 3001 | `npm run dev` |
| backend-api | 4000 | `npm run start:dev`, czeka na healthy Postgres |
| postgres | 5432 | postgres:16-alpine, healthcheck `pg_isready`, wolumen `postgres_data` |
| adminer | 5050 | podgląd bazy (tylko dev) |

`docker-compose.prod.yml` — analogicznie, ale Postgres bez publikacji portu na hosta.

### Produkcja (Railway)

4 serwisy budowane z Dockerfile'ów (multi-stage, `node:20-alpine`):

- **backend** (`moodflow-production.up.railway.app`) — `node dist/main`,
- **client-frontend** — build Vite z build-argami `VITE_API_URL`/`VITE_ADMIN_URL` (wstrzykiwane do bundla), potem `nginx:alpine`; **uwaga operacyjna:** `railway.json` ma `startCommand: nginx -g 'daemon off;'`, który omija entrypoint obrazu nginx (envsubst szablonów) — dlatego `nginx.conf` jest kopiowany bezpośrednio do `conf.d/default.conf` z `listen 80`,
- **admin-frontend** — build Next.js z build-argami `NEXT_PUBLIC_*`, `npm run start` na porcie 3001,
- **Postgres** — usługa zarządzana Railway.

Deploy: push na gałąź `eksperyment-multi-tenant` → automatyczny rebuild. TLS z platformy. Railway agresywnie cache'uje warstwy Dockera — cache-bust wymaga ARG użytego w RUN.

### Zmienne środowiskowe

Backend (wymagane, fail-fast): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`. Opcjonalne: `PORT`, `NODE_ENV`, `MAIL_HOST/PORT/USER/PASS/FROM`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD` (bez niej seed super-admina jest pomijany — żadne hasło nie jest zaszyte w kodzie ani repo).

Frontendy (build-time): client — `VITE_API_URL`, `VITE_ADMIN_URL`; admin — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLIENT_URL`.

Szablon: `.env.example` (bez sekretów).

---

## 14. Testowanie

- **Jednostkowe (backend):** `scoring.service.spec.ts` — 50 testów logiki scoringu (`npm test` w `backend-api/`),
- **E2E (backend):** szkielet `test/app.e2e-spec.ts` (`npm run test:e2e`),
- **Manualne scenariusze produkcyjne:** [TESTING.md](./TESTING.md) — pełny flow rejestracji firmy → zatwierdzenia → pracownika → testu → raportu HR; zweryfikowane na środowisku Railway (w tym handoff, autozapis draftu, nota prywatności, maskowanie k<5),
- frontendy nie mają testów automatycznych (świadome ograniczenie zakresu MVP).

---

## 15. Kierunki rozwoju

- pełne przejście na migracje TypeORM (wyłączenie `synchronize` na produkcji),
- CSP enforce po okresie Report-Only,
- `tokenVersion` — pełna rewokacja sesji,
- cookies SameSite + CSRF dla panelu admina,
- Redis: handoff store + cache agregatów analitycznych,
- eksporty PDF/CSV, automatyczne przypomnienia, konfigurowalne progi alertów,
- testy automatyczne frontendów i rozszerzenie testów e2e backendu.
