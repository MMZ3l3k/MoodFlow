# Lista endpointów API — MoodFlow

Wszystkie endpointy poza `/auth/*` (bez `/auth/handoff`) i `/health` wymagają uwierzytelnienia
(JWT w httpOnly cookie `mf_access` lub nagłówek `Authorization: Bearer`).
Backend nie używa globalnego prefixu — ścieżki są płaskie (`/auth`, `/users`, ...).
Bazowy URL: `https://moodflow-production.up.railway.app` (prod) lub `http://localhost:4000` (dev).

## Auth

| Metoda | Ścieżka | Dostęp | Opis | Rate limit |
|---|---|---|---|---|
| POST | `/auth/register` | publiczny | Rejestracja użytkownika (legacy) | 5 / 15 min |
| POST | `/auth/register-company` | publiczny | Rejestracja firmy + konto admina | 5 / 60 min |
| POST | `/auth/register-employee` | publiczny | Rejestracja pracownika z kodem zaproszenia | 5 / 15 min |
| POST | `/auth/login` | publiczny | Logowanie; zwraca tokeny + ustawia cookies | 10 / 15 min |
| POST | `/auth/refresh` | refresh JWT | Odświeżenie tokenu; blokuje konta SUSPENDED/REJECTED | 30 / 15 min |
| POST | `/auth/handoff` | JWT | Generuje jednorazowy kod przekazania sesji (TTL 60 s) | — |
| POST | `/auth/handoff/exchange` | publiczny | Wymiana kodu na tokeny (jednorazowa) | 30 / 15 min |
| POST | `/auth/logout` | dowolny | Wylogowanie + czyszczenie cookies | — |

## Users

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/users/me` | dowolny | Profil zalogowanego |
| PATCH | `/users/me/password` | dowolny | Zmiana hasła |
| POST | `/users/me/change-password` | dowolny | Zmiana hasła (alias) |
| DELETE | `/users/me` | dowolny | Usunięcie własnego konta |
| GET | `/users` | ADMIN, HR, SUPER_ADMIN | Lista użytkowników (filtr po organizacji) |
| GET | `/users/pending` | ADMIN, SUPER_ADMIN | Konta oczekujące na zatwierdzenie |
| POST | `/users` | ADMIN | Dodanie pracownika (bez możliwości nadania SUPER_ADMIN) |
| PATCH | `/users/:id` | ADMIN, SUPER_ADMIN | Aktualizacja danych (walidacja roli — brak eskalacji) |
| PATCH | `/users/:id/profile` | ADMIN, HR | Aktualizacja profilu |
| PATCH | `/users/:id/status` | ADMIN, SUPER_ADMIN | Zmiana statusu (approve/reject/suspend) |
| GET | `/users/departments` | ADMIN, HR | Lista działów (widok users) |
| PATCH | `/users/departments/rename` | ADMIN | Zmiana nazwy działu |

## Organizations

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/organizations` | SUPER_ADMIN | Lista wszystkich firm |
| GET | `/organizations/pending` | SUPER_ADMIN | Firmy oczekujące na zatwierdzenie |
| GET | `/organizations/my` | ADMIN, HR | Dane własnej organizacji |
| GET | `/organizations/:id` | SUPER_ADMIN | Szczegóły firmy |
| POST | `/organizations` | SUPER_ADMIN | Utworzenie firmy |
| POST | `/organizations/:id/approve` | SUPER_ADMIN | Zatwierdzenie firmy |
| POST | `/organizations/:id/reject` | SUPER_ADMIN | Odrzucenie firmy (body: opcjonalne `reason` — trafia do audit logu i e-maila) |
| POST | `/organizations/:id/block` | SUPER_ADMIN | Zablokowanie firmy |

## Departments

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/departments` | ADMIN, HR | Działy organizacji |
| POST | `/departments` | ADMIN | Tworzenie działu |
| PATCH | `/departments/:id` | ADMIN | Edycja działu |
| DELETE | `/departments/:id` | ADMIN | Usunięcie działu (409, gdy przypisani są pracownicy) |

## Assessments (testy i przypisania)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/assessments` | dowolny | Katalog testów |
| GET | `/assessments/assigned` | dowolny | Testy przypisane do zalogowanego |
| GET | `/assessments/assignments` | ADMIN, HR | Wszystkie przypisania w organizacji |
| POST | `/assessments/assignments` | ADMIN, HR | Utworzenie przypisania (firma/dział/pracownik + okno czasowe) |
| DELETE | `/assessments/assignments/:id` | ADMIN, HR | Usunięcie przypisania |
| GET | `/assessments/:id` | dowolny | Szczegóły testu (pytania + opcje odpowiedzi) |

## Responses (wypełnienie testu)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/responses` | dowolny (EMPLOYEE) | Zapis wypełnionego testu; walidacja kompletności/zakresów/duplikatów; transakcyjny zapis odpowiedzi + wyniku |

## Results (wyniki własne)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/results` | dowolny | Lista własnych wyników |
| GET | `/results/wellbeing-index` | dowolny | Aktualny indeks dobrostanu |
| GET | `/results/wellbeing-history` | dowolny | Historia indeksu |
| GET | `/results/:id` | dowolny | Szczegóły własnego wyniku |

## Analytics (HR/ADMIN — wyłącznie agregaty)

Wszystkie endpointy z rolami HR, ADMIN. Kolumna „k=5" oznacza maskowanie/pomijanie grup poniżej `MIN_GROUP_SIZE = 5`.

| Metoda | Ścieżka | Opis | k=5 |
|---|---|---|---|
| GET | `/analytics/summary` | KPI organizacji | — |
| GET | `/analytics/trends` | Trendy w czasie (historia tygodniowa) | **tak** |
| GET | `/analytics/severity-distribution` | Rozkład poziomów nasilenia per test | **tak** |
| GET | `/analytics/participation` | Uczestnictwo per test | — |
| GET | `/analytics/departments` | Statystyki per dział | **tak** |
| GET | `/analytics/assessments` | Statystyki per test | — |
| GET | `/analytics/hr-dashboard` | Dane zbiorcze dashboardu HR | **tak** |
| GET | `/analytics/department-wellbeing-load` | Indeks dobrostanu per dział | **tak** |
| GET | `/analytics/org-wellbeing-history` | Historia indeksu organizacji | **tak** |
| GET | `/analytics/risk-report` | Raport ryzyka | — |
| GET | `/analytics/critical-changes` | Zmiany krytyczne per dział (próg zmiany ≥8, krytyczna ≥15) | **tak** |

## Notifications

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/notifications` | dowolny | Lista powiadomień zalogowanego |
| GET | `/notifications/unread-count` | dowolny | Licznik nieprzeczytanych |
| POST | `/notifications/:id/read` | dowolny | Oznaczenie jako przeczytane |
| POST | `/notifications/read-all` | dowolny | Oznaczenie wszystkich |
| DELETE | `/notifications/:id` | dowolny | Usunięcie powiadomienia |
| DELETE | `/notifications` | dowolny | Usunięcie wszystkich |

## Admin

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/admin/overview` | ADMIN, HR | Przegląd systemu |
| GET | `/admin/activity-today` | ADMIN, HR | Aktywność dzisiaj (godzinowo) |

## Audit

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/audit?limit=N` | ADMIN, SUPER_ADMIN | Dziennik akcji administracyjnych |

## Health

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/health` | publiczny | Status aplikacji + bazy danych |

## Format odpowiedzi

### Sukces

```json
{ "id": 1, "...": "..." }
```

### Błąd (standard NestJS)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Tokeny (odpowiedź logowania)

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

Dodatkowo ustawiane są ciasteczka httpOnly:
- `mf_access` — 15 min,
- `mf_refresh` — 7 dni.

Klienci używają nagłówka `Authorization: Bearer` z automatycznym odświeżeniem po 401 (interceptor axios).
