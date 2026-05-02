# Model danych — MoodFlow

Dokumentacja encji TypeORM mapowanych na tabele PostgreSQL.

## Encje

### users

Konto użytkownika w systemie.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | Auto-inkrement |
| `email` | varchar UNIQUE | Email logowania |
| `passwordHash` | varchar | bcrypt, 12 rounds |
| `firstName`, `lastName` | varchar | Imię i nazwisko |
| `role` | enum | `EMPLOYEE` / `HR` / `ADMIN` / `SUPER_ADMIN` |
| `status` | enum | `PENDING` / `ACTIVE` / `REJECTED` / `SUSPENDED` |
| `organizationId` | int FK | nullable, brak dla SUPER_ADMIN |
| `departmentId` | int FK | nullable, link do działu |
| `department` | varchar | legacy field (string), zachowany dla kompatybilności |
| `isOnline` | bool | Aktualizowany przy logowaniu |
| `lastSeenAt` | timestamp | Ostatnia aktywność |
| `createdAt` | timestamp | Data utworzenia |

### organizations

Firma korzystająca z platformy (multi-tenant).

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | Auto-inkrement |
| `name` | varchar | Nazwa firmy |
| `nip` | varchar UNIQUE | Numer NIP |
| `description` | text | Opcjonalny opis |
| `status` | enum | `PENDING` / `ACTIVE` / `BLOCKED` / `REJECTED` |
| `inviteCode` | varchar | Kod zaproszenia dla pracowników (`MOOD-XXXX`) |
| `adminUserId` | int FK | Administrator firmy |
| `createdAt` | timestamp | Data zgłoszenia |

### departments

Działy organizacji.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `name` | varchar | Nazwa działu |
| `organizationId` | int FK | Powiązanie z firmą |
| `createdAt` | timestamp | — |

### assessments

Definicja testu psychologicznego.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `code` | varchar UNIQUE | Krótki kod testu (`PHQ9`, `GAD7`, `WHO5`, `PSS10`, `MOOD10`) |
| `name` | varchar | Pełna nazwa po polsku |
| `description` | text | Opis dla użytkownika |
| `timeframe` | varchar | Okres jakiego dotyczy (np. „2 tygodnie") |
| `questionCount` | int | Liczba pytań |
| `isAnonymousForHR` | bool | Czy wynik HR widzi anonimowo |
| `requiresAllAnswers` | bool | Wymóg odpowiedzi na wszystkie pytania |
| `version` | varchar | Wersja kwestionariusza |
| `isActive` | bool | Czy test jest aktywny w katalogu |

### questions

Pytania testów.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `assessmentId` | int FK | Test do którego należy |
| `text` | text | Treść pytania |
| `order` | int | Kolejność wyświetlania |
| `reversed` | bool | Czy odpowiedź jest odwrócona przy obliczaniu |

### answer_options

Opcje odpowiedzi (skala Likerta dla testów).

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `assessmentId` | int FK | Test |
| `value` | int | Wartość liczbowa (np. 0, 1, 2, 3, 4) |
| `label` | varchar | Etykieta („Wcale nie", „Bardzo często") |
| `order` | int | Kolejność |

### assessment_assignments

Przypisanie testu do użytkownika / działu / wszystkich.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `assessmentId` | int FK | Test |
| `targetType` | enum | `ALL` / `USER` / `DEPARTMENT` |
| `targetUserId` | int FK | nullable — gdy USER |
| `targetDepartment` | varchar | nullable — gdy DEPARTMENT |
| `availableFrom` | timestamp | Start okna dostępności |
| `availableTo` | timestamp | Koniec okna |
| `assignedByUserId` | int FK | Kto przypisał |
| `organizationId` | int FK | Multi-tenant filter |

### assessment_results

Zapisany wynik wypełnionego testu.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `userId` | int FK | Użytkownik |
| `assignmentId` | int FK | Powiązany assignment (nullable) |
| `assessmentId` | int FK | Test |
| `rawScore` | int | Suma punktów z odpowiedzi |
| `normalizedScore` | int | Wynik znormalizowany 0-100 |
| `severity` | varchar | Poziom nasilenia objawów |
| `riskFlags` | json | Flagi krytyczne (np. myśli samobójcze w PHQ-9 #9) |
| `answersSnapshot` | json | Pełny snapshot odpowiedzi |
| `submittedAt` | timestamp | Data wypełnienia |

### user_responses

Pojedyncze odpowiedzi (oprócz snapshot dla audytu).

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `resultId` | int FK | Powiązany wynik |
| `questionId` | int FK | Pytanie |
| `answerValue` | int | Wartość odpowiedzi |

### audit_logs

Dziennik akcji administracyjnych.

| Pole | Typ | Opis |
|---|---|---|
| `id` | int PK | — |
| `actorUserId` | int FK | Kto wykonał (nullable dla nieznanych) |
| `organizationId` | int FK | Skąd akcja (nullable dla globalnych) |
| `action` | varchar(64) | Typ akcji (`USER_APPROVED`, `LOGIN_FAILED` itd.) |
| `entityType` | varchar(64) | Typ encji (`user`, `organization`, `assignment`) |
| `entityId` | int | ID encji |
| `metadata` | jsonb | Dodatkowe dane (poprzedni status, IP, email) |
| `ipAddress` | varchar(64) | nullable |
| `createdAt` | timestamp | — |

**Indeksy:** `(actorUserId, createdAt)`, `(organizationId, createdAt)`, `(entityType, entityId)`.

## Algorytmy scoringu

### Wellbeing Index (Indeks dobrostanu)

Obliczany w `analytics.service.ts` i `results.service.ts` jako średnia ważona z 5 testów:

| Test | Waga | Polarność |
|---|---|---|
| WHO-5 | 30% | dodatnia (więcej = lepiej) |
| PSS-10 | 20% | odwrócona |
| PHQ-9 | 20% | odwrócona |
| GAD-7 | 15% | odwrócona |
| MOOD10 | 15% | dodatnia |

**Wzór:** każdy test normalizowany do 0-100, jeśli polarność odwrócona to `100 - norm`. Wynik to średnia ważona dostępnych komponentów.

**Interpretacja poziomów:**
- ≥80 — wysoki dobrostan (zielony)
- 60-79 — umiarkowany (żółty)
- 40-59 — obniżony (pomarańczowy)
- <40 — krytyczny (czerwony)

### Anonimizacja k-anonymity

Próg `MIN_GROUP_SIZE = 5`. Dla działów z mniej niż 5 uczestnikami `avgScore` i `wellbeingIndex` są zwracane jako `null`, a obiekt ma `anonymized: true`.

Zgodne z RULES.md pkt 12: dane HR muszą być zagregowane i niemożliwe do deanonimizacji.
