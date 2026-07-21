# Dziennik decyzji architektonicznych (ADR)

Rejestr ważniejszych decyzji projektowych z uzasadnieniem. Format zbliżony do
[Architecture Decision Records](https://adr.github.io/).

## ADR-001: NestJS jako framework backendu

**Data:** 2026-02
**Status:** Zaakceptowana

### Kontekst
Potrzeba uporządkowanego, modularnego frameworka Node.js z dobrym wsparciem TypeScript.

### Decyzja
Użycie NestJS 11 z TypeORM.

### Uzasadnienie
- Modularna struktura (moduły domenowe) zgodna z DDD-light.
- Built-in DI, walidacja (ValidationPipe), guards, interceptors.
- Typowanie end-to-end z TypeScript.
- Czytelność dla pracy inżynierskiej (controllers → services → repositories).

### Alternatywy
- Express — zbyt niski poziom abstrakcji.
- Fastify — nie ma takiego ekosystemu.

---

## ADR-002: PostgreSQL zamiast MySQL

**Data:** 2026-02
**Status:** Zaakceptowana

### Kontekst
PRD wskazywał MySQL, jednak potrzeba JSONB dla `audit_logs.metadata` i
`assessment_results.answersSnapshot`.

### Decyzja
PostgreSQL 16.

### Uzasadnienie
- Natywne `jsonb` z indeksami GIN — efektywne zapytania po polach JSON.
- Lepsze wsparcie dla typów ENUM i CHECK.
- Pełniejsza implementacja SQL (window functions, CTE).
- Managed wersje (Railway, Neon, Supabase) są równie łatwo dostępne.

---

## ADR-003: httpOnly cookie + Bearer fallback dla JWT

**Data:** 2026-04
**Status:** Zaakceptowana

### Kontekst
Tokeny JWT przechowywane w `localStorage` są podatne na XSS — atakujący
może je odczytać i podszyć się pod użytkownika.

### Decyzja
Backend ustawia `mf_access` i `mf_refresh` jako httpOnly cookies (Secure +
SameSite=Strict w prod). Strategia JwtStrategy odczytuje token najpierw z
cookie, fallback do `Authorization: Bearer` dla zachowania kompatybilności
z PWA i ewentualnymi klientami mobilnymi.

### Konsekwencje
- Frontend axios używa `withCredentials: true`.
- CORS musi mieć `credentials: true` i jawnie wymienione originy.
- Mitygacja XSS — nawet jeśli atakujący wstrzyknie skrypt, nie wykrada
  tokenu z `document.cookie`.

### Alternatywy
- Tylko localStorage — łatwy XSS attack vector.
- Tylko cookies bez Bearer — utrata kompatybilności z mobile.

---

## ADR-004: Anonimizacja k-anonymity (k=5)

**Data:** 2026-04
**Status:** Zaakceptowana

### Kontekst
RULES.md pkt 12 wymaga, aby dane HR były niemożliwe do deanonimizacji.
W małej firmie (np. dział 3-osobowy) średnia z 3 wyników zdradza
indywidualne wartości.

### Decyzja
Próg `MIN_GROUP_SIZE = 5` w `analytics.service.ts`. Dla grup z <5 uczestnikami
agregaty (`avgScore`, `wellbeingIndex`) zwracane jako `null` z flagą
`anonymized: true`. UI HR pokazuje „Ukryte" zamiast wartości.

### Alternatywy
- Brak progu — narusza RODO i etykę.
- Próg dynamiczny (np. 10% organizacji) — zbyt skomplikowany.

---

## ADR-005: synchronize: false + migracje TypeORM w produkcji

**Data:** 2026-05
**Status:** Zrewidowana (2026-07 — patrz „Rewizja" poniżej)

### Kontekst
TypeORM `synchronize: true` w produkcji może usunąć kolumny przy zmianach
encji — niedopuszczalne dla danych HR.

### Decyzja
- `NODE_ENV=production` → `synchronize: false`, `migrationsRun: true`.
- `NODE_ENV=development` → `synchronize: true` (szybkie iteracje).
- Pierwsza migracja `InitialSchema` wygenerowana z `pg_dump` schematu dev
  i osadzona jako plik SQL ładowany z `dist/migrations/initial-schema.sql`.

### Konsekwencje
- W prod DDL wymaga jawnej migracji — kontrolowane zmiany schematu.
- Dev pozostaje wygodny (auto-sync z entitiesa).

### Rewizja (2026-07)

W trakcie wdrożenia na Railway migracja `InitialSchema` okazała się zawodna
(meta-komendy psql w zrzucie, problem tabeli `migrations` przy pierwszym
starcie), a baza produkcyjna została w praktyce zbudowana przez `synchronize`.
**Stan faktyczny:** runtime działa z `synchronize: true` (świadoma decyzja dla
MVP — komentarz w `app.module.ts`); `data-source.ts` dla CLI ma
`synchronize: false` i migracje. Przejście na wyłącznie-migracje pozostaje
kierunkiem docelowym, ale wymaga osobnego, kontrolowanego kroku operacyjnego
na żywej bazie (baseline migracji zgodny z aktualnym schematem). Ryzyko
`synchronize` ograniczają: brak destrukcyjnych zmian encji oraz kopie zapasowe
bazy po stronie Railway.

---

## ADR-006: Multi-tenant przez `organizationId` (single DB)

**Data:** 2026-03
**Status:** Zaakceptowana

### Kontekst
Platforma obsługuje wiele firm jednocześnie. Możliwe podejścia:
1. Database-per-tenant (silna izolacja, drogie operacyjnie)
2. Schema-per-tenant (PostgreSQL schemas)
3. Row-level z `organizationId` (najprostsze)

### Decyzja
Każda encja domenowa ma kolumnę `organizationId`. Każde zapytanie filtruje
po `req.user.organizationId` z JWT.

### Konsekwencje
- Bezpieczeństwo zależy od dyscypliny w serwisach — łatwo zapomnieć filtra.
- Mityguje to: testy automatyczne (przyszłość), code review, RolesGuard
  egzekwujący `organizationId` w kontekście.

### Alternatywy odrzucone
- Database-per-tenant — komplikuje migracje, drogie.
- Schema-per-tenant — możliwe w przyszłości, gdy klientów będzie >100.

---

## ADR-007: PWA z Service Worker autoUpdate → prompt

**Data:** 2026-05
**Status:** Zaakceptowana

### Kontekst
`autoUpdate` Service Worker'a w trakcie pracy użytkownika może utracić dane
formularza. `prompt` daje użytkownikowi kontrolę.

### Decyzja
`registerType: 'prompt'` w vite-plugin-pwa + komponent `PwaUpdatePrompt`
wyświetlający banner z przyciskiem „Odśwież".

### Konsekwencje
- Service Worker sprawdza nową wersję co 30 min.
- Auth endpointy (`/auth/*`, `/users/me`, `/results`) wykluczone z cache —
  brak wycieku danych po wylogowaniu.

---

## ADR-008: Audit log jako osobny moduł, nie interceptor

**Data:** 2026-05
**Status:** Zaakceptowana

### Kontekst
Audit log mógłby być zaimplementowany jako globalny interceptor (wszystkie
żądania logowane). Ale to zbyt szczegółowo dla potrzeb projektu — ważne są
akcje administracyjne, nie zwykłe odczyty.

### Decyzja
`AuditService` jako wstrzykiwana zależność. Każdy serwis (UsersService,
OrganizationsService, AssessmentsService, AuthService) wywołuje
`auditService.log({...})` w kluczowych metodach.

### Konsekwencje
- Pełna kontrola nad tym, co logujemy.
- Łatwe rozszerzenie o nowe akcje.
- `actorUserId` przekazywany z kontrolera do serwisu (nowy parametr w sygnaturze).

---

## ADR-009: Helmet z CSP wyłączonym

**Data:** 2026-05
**Status:** Zaakceptowana (do zaostrzenia w przyszłości)

### Kontekst
Helmet domyślnie ustawia restrykcyjny `Content-Security-Policy`, który blokuje
inline-scripts i wymaga whitelisty wszystkich CDN.

### Decyzja
`helmet({ contentSecurityPolicy: false })` na MVP. Pozostałe nagłówki włączone.

### Plan
W kolejnych iteracjach włączyć CSP z whitelistą domen frontendów oraz
`'unsafe-inline'` tylko dla stylów (Tailwind/inline styles).
