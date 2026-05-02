# Diagram maszyny stanów — cykl życia konta użytkownika

Diagram pokazuje stany konta użytkownika i przejścia między nimi.
Statusy są przechowywane w `users.status` (enum).

## Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING: Rejestracja
    PENDING --> ACTIVE: Admin/Super-admin zatwierdza
    PENDING --> REJECTED: Admin/Super-admin odrzuca
    ACTIVE --> SUSPENDED: Admin zawiesza
    SUSPENDED --> ACTIVE: Admin reaktywuje
    REJECTED --> [*]: brak działań (możliwe usunięcie)
    ACTIVE --> [*]: Użytkownik usuwa konto
    SUSPENDED --> [*]: Admin usuwa konto

    note right of PENDING
        - Konto utworzone
        - Brak dostępu do panelu
        - Email zarejestrowany
    end note

    note right of ACTIVE
        - Pełen dostęp (zgodny z rolą)
        - Otrzymuje powiadomienia (jeśli EMPLOYEE)
        - Może wypełniać testy
    end note

    note right of SUSPENDED
        - Logowanie odmówione
        - Konto można reaktywować
        - Dane zachowane
    end note

    note right of REJECTED
        - Logowanie odmówione
        - Brak możliwości reaktywacji
    end note
```

## Tabela przejść

| Stan początkowy | Stan końcowy | Akcja | Aktor | Audit log |
|---|---|---|---|---|
| (brak) | PENDING | rejestracja | Pracownik / Admin firmy | (nie logowany) |
| PENDING | ACTIVE | zatwierdzenie | ADMIN / SUPER_ADMIN | `USER_APPROVED` |
| PENDING | REJECTED | odrzucenie | ADMIN / SUPER_ADMIN | `USER_REJECTED` |
| ACTIVE | SUSPENDED | zawieszenie | ADMIN / SUPER_ADMIN | `USER_SUSPENDED` |
| SUSPENDED | ACTIVE | reaktywacja | ADMIN / SUSPER_ADMIN | `USER_REACTIVATED` |
| ACTIVE / SUSPENDED | (usunięty) | self-delete lub admin delete | sam użytkownik / ADMIN | `ACCOUNT_DELETED` |

## Diagram cyklu organizacji

```mermaid
stateDiagram-v2
    [*] --> PENDING: Rejestracja firmy (registerCompany)
    PENDING --> ACTIVE: Super-admin zatwierdza
    PENDING --> REJECTED: Super-admin odrzuca
    ACTIVE --> BLOCKED: Super-admin blokuje
    BLOCKED --> ACTIVE: Super-admin odblokowuje
    REJECTED --> [*]
```
