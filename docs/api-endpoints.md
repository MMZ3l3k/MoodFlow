# Lista endpointów API — MoodFlow

Wszystkie endpointy oprócz `/auth/*`, `/health` wymagają uwierzytelnienia
(JWT w httpOnly cookie `mf_access` lub nagłówek `Authorization: Bearer`).
Bazowy URL: `https://api.moodflow.pl` (prod) lub `http://localhost:4000` (dev).

## Auth

| Metoda | Ścieżka | Rola | Opis | Rate limit |
|---|---|---|---|---|
| POST | `/auth/register` | publiczny | Rejestracja użytkownika (legacy) | 5 / 15 min |
| POST | `/auth/register-company` | publiczny | Rejestracja firmy + admin | 5 / 60 min |
| POST | `/auth/register-employee` | publiczny | Rejestracja pracownika z kodem zaproszenia | 5 / 15 min |
| POST | `/auth/login` | publiczny | Logowanie, zwraca tokeny + ustawia cookies | 10 / 15 min |
| POST | `/auth/refresh` | refresh JWT | Odświeżenie tokenu access | — |
| POST | `/auth/logout` | dowolny | Wylogowanie + czyszczenie cookies | — |

## Users

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/users/me` | dowolny | Profil zalogowanego |
| PATCH | `/users/me/password` | dowolny | Zmiana hasła |
| POST | `/users/me/change-password` | dowolny | Zmiana hasła (alias) |
| DELETE | `/users/me` | dowolny | Usunięcie własnego konta |
| GET | `/users` | ADMIN, HR, SUPER_ADMIN | Lista użytkowników (org filter) |
| GET | `/users/pending` | ADMIN, SUPER_ADMIN | Konta oczekujące na zatwierdzenie |
| POST | `/users` | ADMIN | Dodanie pracownika |
| PATCH | `/users/:id` | ADMIN, SUPER_ADMIN | Aktualizacja danych |
| PATCH | `/users/:id/profile` | ADMIN, HR | Aktualizacja profilu |
| PATCH | `/users/:id/status` | ADMIN, SUPER_ADMIN | Zmiana statusu (approve/reject/suspend) |
| GET | `/users/departments` | ADMIN, HR | Lista działów |
| PATCH | `/users/departments/rename` | ADMIN | Zmiana nazwy działu |

## Organizations

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/organizations` | SUPER_ADMIN | Lista wszystkich firm |
| GET | `/organizations/my` | ADMIN, HR | Dane swojej organizacji |
| POST | `/organizations/:id/approve` | SUPER_ADMIN | Zatwierdzenie firmy |
| POST | `/organizations/:id/reject` | SUPER_ADMIN | Odrzucenie firmy |
| POST | `/organizations/:id/block` | SUPER_ADMIN | Zablokowanie firmy |

## Departments

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/departments` | dowolny | Działy w org. (z JWT) |
| POST | `/departments` | ADMIN | Tworzenie działu |
| PATCH | `/departments/:id` | ADMIN | Edycja działu |
| DELETE | `/departments/:id` | ADMIN | Usunięcie działu |

## Assessments (testy)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/assessments` | dowolny | Katalog testów |
| GET | `/assessments/:id` | dowolny | Szczegóły testu (pytania + odpowiedzi) |
| GET | `/assessments/assigned` | EMPLOYEE | Testy przypisane do mnie |
| GET | `/assessments/assignments` | ADMIN, HR | Wszystkie przypisania w org. |
| POST | `/assessments/assignments` | ADMIN, HR | Tworzenie assignmentu |
| DELETE | `/assessments/assignments/:id` | ADMIN, HR | Usunięcie assignmentu |

## Results (wyniki)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/results/submit` | EMPLOYEE | Zapis wyniku testu |
| GET | `/results` | EMPLOYEE | Moje wyniki (lista) |
| GET | `/results/wellbeing-index` | EMPLOYEE | Aktualny indeks dobrostanu |
| GET | `/results/wellbeing-history` | EMPLOYEE | Historia indeksu (30 dni) |

## Analytics (HR)

| Metoda | Ścieżka | Rola | Opis | Anonimizacja |
|---|---|---|---|---|
| GET | `/analytics/summary` | HR, ADMIN | KPI organizacji | nie |
| GET | `/analytics/trends` | HR, ADMIN | Trendy w czasie | nie |
| GET | `/analytics/severity-distribution` | HR, ADMIN | Rozkład nasilenia objawów | tak |
| GET | `/analytics/participation` | HR, ADMIN | Uczestnictwo per test | nie |
| GET | `/analytics/departments` | HR, ADMIN | Statystyki per dział | **tak** (k=5) |
| GET | `/analytics/department-wellbeing-load` | HR, ADMIN | Indeks per dział | **tak** (k=5) |
| GET | `/analytics/risk-report` | HR, ADMIN | Raport ryzyka | nie |
| GET | `/analytics/critical-changes` | HR, ADMIN | Zmiany krytyczne | nie |

## Admin

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/admin/overview` | ADMIN | Przegląd systemu |
| GET | `/admin/activity-today` | ADMIN | Aktywność dzisiaj (godzinowo) |

## Audit

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/audit?limit=N` | ADMIN, SUPER_ADMIN | Dziennik akcji administracyjnych |

## Health

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/health` | publiczny | Status aplikacji + DB |

## Format odpowiedzi

### Sukces

```json
{ "id": 1, "...": "..." }
```

### Błąd (NestJS standard)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Auth tokens (login response)

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

W odpowiedzi również ustawiane są ciasteczka:
- `mf_access` — HttpOnly, SameSite=Lax (Strict w prod), 15 min
- `mf_refresh` — HttpOnly, SameSite=Lax (Strict w prod), 7 dni
