# Bezpieczeństwo aplikacji MoodFlow

Dokumentacja zastosowanych mechanizmów bezpieczeństwa, ich uzasadnienia
biznesowego i technicznego.

## Uwierzytelnianie

| Mechanizm | Implementacja | Uzasadnienie |
|---|---|---|
| Hashowanie haseł | bcrypt, 12 rounds | Standard branżowy, koszt ~250ms na hash spowalnia brute-force |
| JWT access token | HS256, secret 64B base64, ważność 15 min | Krótkie życie minimalizuje skutki kradzieży |
| JWT refresh token | HS256, osobny secret 64B, ważność 7 dni | Pozwala na ciche odświeżanie sesji |
| Storage tokenów | httpOnly cookie + Bearer fallback | XSS nie odczyta `document.cookie` |
| Cookies prod | `Secure`, `SameSite=Strict` | Tylko HTTPS, brak CSRF dla cross-site |
| Cookies dev | `SameSite=Lax` | Lokalny dev na różnych portach |

## Autoryzacja

Role hierarchiczne:

```
SUPER_ADMIN > ADMIN > HR > EMPLOYEE
```

| Mechanizm | Implementacja |
|---|---|
| Guards | `JwtAuthGuard` (autentykacja) → `RolesGuard` (autoryzacja) |
| Decorator | `@Roles(Role.ADMIN, Role.HR)` na poziomie metody |
| Multi-tenant | `req.user.organizationId` filtruje wszystkie zapytania domenowe |
| Cross-org access | Blokowany — admin firmy A nie widzi danych firmy B |
| Brak eskalacji ról | Endpointy `POST /users` i `PATCH /users/:id` walidują docelową rolę — nie da się nadać `SUPER_ADMIN`; zmiana roli trafia do audit logu (`USER_ROLE_CHANGED`) |
| Serializacja odpowiedzi | Globalny `ClassSerializerInterceptor` + `@Exclude()` na `passwordHash` — hash nigdy nie opuszcza API |
| Seed super-admina | Wykonywany tylko przy ustawionym `SEED_OWNER_PASSWORD` — brak domyślnego hasła w kodzie i repo |

## Walidacja wejścia

- **Globalny `ValidationPipe`** w `main.ts` z `whitelist: true` (odrzuca pola spoza DTO) i `forbidNonWhitelisted: true` (zwraca 400).
- **DTOs** używają `class-validator` (`@IsEmail`, `@MinLength`, `@IsString` itd.).
- **Polityka haseł (NF2)** — dekorator `@IsSecurePassword()` (`common/validators/password-policy.decorator.ts`): hasło musi mieć min. 8 znaków (`@MinLength`), zawierać literę i cyfrę oraz nie znajdować się na liście haseł trywialnych (porównanie case-insensitive). Stosowany we wszystkich DTO ustawiających hasło (rejestracja firmy/pracownika, tworzenie konta przez admina, zmiana hasła — `ChangePasswordDto`); celowo NIE dotyczy logowania. Pokryty testami jednostkowymi (`password-policy.spec.ts`).
- **TypeORM** parametryzuje zapytania (brak SQL injection przy używaniu repo / queryBuilder).

## Rate limiting

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10 / 15 min |
| `POST /auth/register` | 5 / 15 min |
| `POST /auth/register-employee` | 5 / 15 min |
| `POST /auth/register-company` | 5 / 60 min |
| `POST /auth/refresh` | 30 / 15 min |
| `POST /auth/handoff/exchange` | 30 / 15 min |

Implementacja: `@nestjs/throttler` z dekoratorem `@Throttle()` per endpoint.

## Nagłówki HTTP (Helmet)

`app.use(helmet(...))` w `main.ts` ustawia:

- `X-Frame-Options: SAMEORIGIN` — clickjacking
- `X-Content-Type-Options: nosniff` — MIME sniffing
- `Strict-Transport-Security: max-age=31536000` — HSTS
- `Referrer-Policy: no-referrer` — wyciek danych w referrer
- `X-Permitted-Cross-Domain-Policies: none`
- `Cross-Origin-Opener-Policy: same-origin`

## CORS

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
});
```

Wymagane jawne ustawienie `CORS_ORIGIN` w env — fail-fast przy starcie.

## Anonimizacja danych HR (k-anonymity)

Próg `MIN_GROUP_SIZE = 5` w `analytics.service.ts`. Grupy poniżej progu są
maskowane (`avgScore: null`, `anonymized: true`) lub pomijane w agregatach.

**Gdzie (po naprawie K5 z audytu):** statystyki i indeks per dział
(`getDepartmentStats()`, `getDepartmentWellbeingLoad()`), historia tygodniowa
i indeks organizacji (`getTrends()`, `getOrgWellbeingHistory()`), rozkład
poziomów nasilenia (`getSeverityDistribution()`), zmiany krytyczne
(`getCriticalChanges()` — dodatkowo próg istotności zmiany ≥8, krytycznej ≥15).

**Uzasadnienie:** RULES.md pkt 12 — dane HR muszą być zagregowane, niemożliwe
do deanonimizacji w małych grupach.

## Audit log

Tabela `audit_logs` rejestruje akcje administracyjne i autentykacyjne.

| Akcja | Logowana w |
|---|---|
| Logowanie (sukces / fail) | `AuthService.login()` |
| Zmiana hasła | `UsersService.changePassword()` |
| Usunięcie konta | `UsersService.deleteAccount()` |
| Zatwierdzenie/odrzucenie/zawieszenie użytkownika | `UsersService.updateStatus()` |
| Zatwierdzenie/odrzucenie/blokada firmy | `OrganizationsService.approve/reject/block()` |
| Stworzenie / usunięcie assignmentu | `AssessmentsService.createAssignment/deleteAssignment()` |

Endpoint `GET /audit` (ADMIN, SUPER_ADMIN) — przegląd dziennika.

## Ochrona przed XSS

- **Frontend (React/Next.js)** — auto-escape JSX (string → text content).
- **Email HTML** — funkcja `escapeHtml()` w `mail.service.ts` na każde
  pole user-controlled (`toName`, `assessmentName`).
- **Helmet `X-Content-Type-Options: nosniff`** — przeglądarka nie wykonuje
  podejrzanych typów MIME.

## Ochrona przed XSRF/CSRF

- **Bearer token** + **httpOnly cookie z `SameSite=Strict`** — atakujący nie może
  wymusić requestu z innej domeny z tokenem.
- **CORS `credentials: true`** wymaga jawnej domeny w `CORS_ORIGIN` —
  nie wszystkie originy.

## Ochrona przed enumeracją kont

- Komunikat `/auth/register*` zawiera ogólny tekst „Nie można utworzyć konta z tymi danymi" zamiast jawnego „email istnieje".
- `/auth/login` zwraca jednolite „Nieprawidłowy email lub hasło" dla obu przypadków (zły email / złe hasło).
- Rate limit utrudnia masowe sondowanie.

## Handoff między panelami (H3)

Logowanie kontem HR/ADMIN przez panel pracownika przekazuje sesję do panelu
admina przez **jednorazowy kod** (`POST /auth/handoff` → `randomBytes(32)`,
TTL 60 s, magazyn in-memory → `POST /auth/handoff/exchange`). Tokeny nigdy nie
występują w URL (wcześniej szły we fragmencie URL — ryzyko wycieku przez
historię/referrer).

## Rewokacja sesji — tokenVersion (H10)

Kolumna `users.tokenVersion` (default 0) jest osadzana w payloadzie każdego
wydawanego tokenu (access i refresh). Obie strategie JWT porównują wartość
z payloadu z wartością w bazie — niezgodność = 401 „Sesja została unieważniona".
Ponieważ strategie i tak ładują użytkownika (kontrola statusu), porównanie nie
dodaje żadnego zapytania.

Licznik jest podbijany przy:
- **zmianie hasła** (`UsersService.changePassword`) — unieważnia także sesję
  ewentualnego atakującego znającego stare hasło,
- **zawieszeniu/odrzuceniu konta** (`UsersService.updateStatus`) — natychmiastowe
  odcięcie, bez czekania na wygaśnięcie access tokenu (15 min).

Dodatkowo: strategia `jwt-refresh` odrzuca konta `SUSPENDED`/`REJECTED`,
rate limit 30/15 min na `/auth/refresh`, interceptor axios (oba fronty)
odblokowuje kolejkę żądań także przy nieudanym odświeżeniu.

## Nagłówki na frontendach (H2)

- client (nginx): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, **CSP w trybie enforce** (po okresie
  Report-Only bez naruszeń; polityka: skrypty tylko `self`, style `self` +
  Google Fonts, połączenia tylko `self` + API, `frame-ancestors 'none'`),
- admin (next.config): analogiczny zestaw nagłówków,
- service worker admina cache'uje wyłącznie zasoby same-origin (K7).

## Niedopełnienia świadome (do dalszych iteracji)

- **Refresh token rotation** — token revocation list w bazie, każde użycie refresh tokena unieważnia stary. Wymaga dodatkowej tabeli i state managementu, pominięte dla MVP (rewokację per-użytkownik zapewnia `tokenVersion`).
- **CSP na panelu admina** — nagłówki bezpieczeństwa są, pełna polityka CSP obecnie tylko na panelu pracownika.
- **Cookies SameSite + CSRF dla panelu admina** — obecnie tokeny w localStorage z timeoutem bezczynności (15 min); wariant cookies wymaga wspólnej domeny lub proxy.
- **2FA / TOTP** — przewidziane do przyszłych wersji.

## Procedura w razie incydentu

1. **Wyciek tokenów** → wymiana `JWT_SECRET` i `JWT_REFRESH_SECRET` w env, restart aplikacji unieważnia wszystkie aktualne sesje.
2. **Wyciek hasła Gmail (App Password)** → unieważnienie w https://myaccount.google.com/apppasswords + zmiana `MAIL_PASS` w env.
3. **Niepożądany dostęp do admin/super-admin** → przegląd `audit_logs` filtrowanego po `LOGIN_SUCCESS` i statusu konta, zawieszenie konta przez `PATCH /users/:id/status` z `status=SUSPENDED`.
