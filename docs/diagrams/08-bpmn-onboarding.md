# BPMN — proces rejestracji firmy i pierwszego testu

Diagram pokazuje pełen proces biznesowy od rejestracji firmy po pierwsze
wypełnienie testu przez pracownika.

## Diagram

```mermaid
flowchart TB
    Start([Start]) --> A1{Czy firma<br/>istnieje?}

    A1 -->|Nie| B1[Admin firmy:<br/>rejestruje firmę<br/>POST /auth/register-company]
    A1 -->|Tak| C1[Admin firmy<br/>otrzymuje kod zaproszenia]

    B1 --> B2[(Org status:<br/>PENDING)]
    B2 --> B3[Super-admin:<br/>weryfikuje zgłoszenie]
    B3 --> B4{Akceptacja?}
    B4 -->|Tak| B5[Org status: ACTIVE<br/>Admin status: ACTIVE]
    B4 -->|Nie| B6([Org status: REJECTED])

    B5 --> C1
    C1 --> D1[Admin firmy:<br/>udostępnia kod zaproszenia<br/>pracownikom]

    D1 --> E1[Pracownik:<br/>POST /auth/register-employee<br/>z kodem zaproszenia]
    E1 --> E2[(User status:<br/>PENDING)]
    E2 --> E3[Admin firmy:<br/>weryfikuje pracownika]
    E3 --> E4{Akceptacja?}
    E4 -->|Tak| E5[User status: ACTIVE]
    E4 -->|Nie| E6([User status: REJECTED])

    E5 --> F1[HR/Admin:<br/>tworzy assignment<br/>POST /assessments/assignments]
    F1 --> F2[Backend:<br/>resolveTargetUsers]
    F2 --> F3[Backend:<br/>filtruje EMPLOYEE only]
    F3 --> F4[/Email do pracowników:<br/>nowy test do wykonania/]
    F3 --> F5[Audit log:<br/>ASSIGNMENT_CREATED]

    F4 --> G1[Pracownik:<br/>otwiera ekran Testy]
    G1 --> G2[Pracownik:<br/>wypełnia test]
    G2 --> G3[Backend:<br/>oblicza scoring + severity]
    G3 --> G4[(assessment_results:<br/>INSERT)]
    G4 --> G5[Pracownik:<br/>widzi wynik na ekranie]
    G5 --> G6[Wellbeing index<br/>aktualizowany]

    G6 --> H1[HR:<br/>otwiera dashboard]
    H1 --> H2{Liczba<br/>wyników >=5?}
    H2 -->|Tak| H3[Wyświetl<br/>zagregowane statystyki]
    H2 -->|Nie| H4[Wyświetl status:<br/>Ukryte k=5]
    H3 --> End([Koniec])
    H4 --> End

    B6 --> End
    E6 --> End

    classDef pending fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef active fill:#d1fae5,stroke:#10b981,color:#065f46
    classDef rejected fill:#fee2e2,stroke:#ef4444,color:#991b1b
    classDef event fill:#dbeafe,stroke:#3b82f6,color:#1e40af

    class B2,E2 pending
    class B5,E5 active
    class B6,E6 rejected
    class F4 event
```

## Role w procesie i ich odpowiedzialności

| Rola | Odpowiedzialność | Stany w procesie |
|---|---|---|
| Super-admin | Zatwierdza rejestracje firm | B3, B4 |
| Admin firmy | Rejestruje firmę, zatwierdza pracowników, tworzy assignments | B1, E3, E4, F1 |
| HR | Tworzy assignments, analizuje raporty | F1, H1 |
| Pracownik | Rejestruje się, wypełnia testy | E1, G1, G2 |
| System | Walidacja, scoring, audyt, mailing | wszędzie automatycznie |

## Punkty decyzyjne

1. **B4 — Akceptacja firmy**: super-admin sprawdza czy NIP jest poprawny, czy nazwa firmy istnieje w KRS, czy nie ma duplikatów.
2. **E4 — Akceptacja pracownika**: admin firmy weryfikuje czy email należy do pracownika (z listy zatrudnionych), czy nie ma duplikatów.
3. **H2 — Próg anonimizacji**: minimum 5 osób w grupie aby HR widział agregaty (k-anonymity zgodnie z RULES.md pkt 12).

## Logowanie audytu (audit_logs)

| Akcja | Akcja w audit_logs | Aktor |
|---|---|---|
| Akceptacja firmy | `ORGANIZATION_APPROVED` | Super-admin |
| Odrzucenie firmy | `ORGANIZATION_REJECTED` | Super-admin |
| Akceptacja pracownika | `USER_APPROVED` | Admin firmy |
| Odrzucenie pracownika | `USER_REJECTED` | Admin firmy |
| Stworzenie assignmentu | `ASSIGNMENT_CREATED` | HR / Admin firmy |
| Logowanie | `LOGIN_SUCCESS` / `LOGIN_FAILED` | każdy |
