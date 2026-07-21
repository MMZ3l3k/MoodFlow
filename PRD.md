# PRD — MoodFlow (Product Requirements Document)

## 1. Cel dokumentu

Dokument definiuje wymagania produktowe platformy MoodFlow: problem biznesowy, interesariuszy, zakres funkcjonalny (z priorytetyzacją MoSCoW), wymagania funkcjonalne i niefunkcjonalne oraz świadome wykluczenia z zakresu MVP.

Opis architektury technicznej znajduje się w [ARCHITECTURE.md](./ARCHITECTURE.md), lista endpointów w [docs/api-endpoints.md](./docs/api-endpoints.md), a dziennik decyzji w [docs/decisions.md](./docs/decisions.md).

---

## 2. Problem biznesowy

Organizacje nie mają wiarygodnego, systematycznego wglądu w dobrostan psychiczny pracowników:

- pogorszenie kondycji psychicznej zespołu jest zauważane późno (rotacja, absencje, spadek zaangażowania),
- klasyczne ankiety okresowe są rzadkie, nieanonimowe w odczuciu pracowników i mają niską zwracalność,
- pracownicy nie ujawniają problemów, jeśli nie mają gwarancji, że pracodawca nie zobaczy ich indywidualnych odpowiedzi.

MoodFlow rozwiązuje ten problem przez **regularne, krótkie pomiary** (codzienny check-in nastroju + walidowane kwestionariusze psychologiczne) oraz **raportowanie wyłącznie zagregowane i anonimizowane** dla HR — z twardą, techniczną gwarancją progu anonimowości.

### Czym MoodFlow NIE jest

MoodFlow **nie jest narzędziem medycznym ani diagnostycznym**. System służy do monitorowania, analizy trendów i wczesnego wykrywania sygnałów ostrzegawczych — nie stawia diagnoz i nie zastępuje specjalisty. Komunikaty w aplikacji konsekwentnie odsyłają do pomocy specjalistycznej tam, gdzie to zasadne.

---

## 3. Interesariusze i persony

| Persona | Rola w systemie | Główna potrzeba |
|---|---|---|
| **Pracownik** | `EMPLOYEE` | Szybko wykonać check-in/test, mieć wgląd we własne wyniki, mieć pewność prywatności |
| **Specjalista HR** | `HR` | Widzieć zagregowane trendy dobrostanu zespołów i reagować na alerty — bez dostępu do danych jednostkowych |
| **Administrator firmy** | `ADMIN` | Zarządzać strukturą firmy, zatwierdzać pracowników, planować cykle testów |
| **Właściciel platformy** | `SUPER_ADMIN` | Zatwierdzać nowe firmy (tenanty) i utrzymywać platformę |
| Zarząd / menedżer (pośrednio) | — | Otrzymywać od HR syntetyczny obraz kondycji organizacji |

---

## 4. Model produktu

MoodFlow działa w modelu **multi-tenant SaaS**: jedna instalacja obsługuje wiele firm, a dane każdej firmy są odizolowane (`organizationId` na poziomie każdej encji domenowej). Cykl życia tenanta:

1. przedstawiciel firmy zakłada konto firmy (rejestracja),
2. właściciel platformy zatwierdza firmę,
3. administrator firmy otrzymuje kod zaproszenia (`MOOD-XXXX`) i przekazuje go pracownikom,
4. pracownicy rejestrują się kodem, a administrator zatwierdza ich konta,
5. HR/administrator planuje testy; pracownicy je wypełniają; HR czyta raporty zagregowane.

---

## 5. Zakres funkcjonalny — MoSCoW

### Must have (MVP — zaimplementowane)

- rejestracja firmy + zatwierdzanie firm przez właściciela platformy,
- rejestracja pracownika kodem zaproszenia + zatwierdzanie przez administratora firmy,
- logowanie z podziałem na role (JWT access + refresh, cztery role),
- codzienny check-in nastroju (skala 1–5),
- walidowane kwestionariusze: PHQ-9, GAD-7, PSS-10, WHO-5, MOOD10,
- obliczanie wyników wyłącznie po stronie backendu (progi interpretacyjne, pytania odwrócone, flagi ryzyka),
- historia własnych wyników pracownika + indeks dobrostanu,
- planowanie testów przez HR/administratora (cała firma / dział / pracownik, okno czasowe),
- dashboard HR z danymi wyłącznie zagregowanymi i progiem k-anonimowości (k=5),
- panel administratora firmy (pracownicy, działy, zatwierdzenia),
- panel właściciela platformy (firmy, zatwierdzenia),
- powiadomienia in-app (dzwonek) o przypisanych testach i zatwierdzeniach,
- audit log działań administracyjnych,
- wsparcie kryzysowe: przy odpowiedzi >0 na pytanie 9 PHQ-9 ekran z informacją o pomocy (bez powiadamiania pracodawcy).

### Should have (zaimplementowane częściowo lub w prostszej formie)

- powiadomienia e-mail (SMTP) o zatwierdzeniach — zaimplementowane,
- PWA (instalowalność, service worker) — zaimplementowane,
- eksport raportów HR — w formie uproszczonej (widok raportów),
- przełącznik motywu jasny/ciemny — zaimplementowany.

### Could have (świadomie poza MVP)

- eksport PDF/CSV raportów,
- przypomnienia automatyczne o niewypełnionych testach,
- analiza komentarzy tekstowych,
- zaawansowane alerty progowe konfigurowane przez HR.

### Won't have (świadomie wykluczone)

- diagnoza kliniczna, rekomendacje terapeutyczne,
- integracje z systemami kadrowymi / SSO,
- aplikacje mobilne natywne (PWA wystarcza w tym zakresie),
- moduły AI/rekomendacyjne.

---

## 6. Wymagania funkcjonalne

Format: aktor — cel — rezultat. Numeracja FR-x używana też w dokumentacji testów.

### Konta i dostęp

- **FR-1** Przedstawiciel firmy rejestruje firmę (dane firmy + konto administratora); firma czeka na zatwierdzenie.
- **FR-2** Właściciel platformy zatwierdza lub odrzuca firmę; decyzja trafia do audit logu, a wnioskodawca dostaje e-mail.
- **FR-3** Pracownik rejestruje się kodem zaproszenia swojej firmy; konto ma status `PENDING` do zatwierdzenia.
- **FR-4** Administrator firmy zatwierdza/odrzuca pracowników i nadaje role (`EMPLOYEE`/`HR`/`ADMIN`) w obrębie własnej firmy.
- **FR-5** Użytkownik loguje się e-mailem i hasłem; sesja odświeża się automatycznie (refresh token); wylogowanie unieważnia refresh token.
- **FR-6** Logowanie kontem HR/ADMIN przez panel pracownika przekierowuje do panelu administracyjnego przez jednorazowy kod wymiany (handoff) — tokeny nie występują w URL.

### Pomiary

- **FR-7** Pracownik wykonuje codzienny check-in nastroju (1–5); jeden na dzień.
- **FR-8** Pracownik wypełnia przypisany test w oknie czasowym przypisania; szkic odpowiedzi jest autozapisywany lokalnie i przeżywa odświeżenie strony.
- **FR-9** Backend waliduje kompletność i zakres odpowiedzi; zapis odpowiedzi i wyniku jest transakcyjny; przypisania nie można wypełnić dwukrotnie.
- **FR-10** Backend oblicza wynik, poziom interpretacyjny i flagi ryzyka zgodnie z metodyką danego kwestionariusza (w tym pytania odwrócone PSS-10/MOOD10, normalizacja WHO-5).
- **FR-11** Pracownik widzi własny wynik natychmiast po wypełnieniu oraz pełną historię swoich wyników.

### Planowanie i raportowanie

- **FR-12** HR/administrator planuje test dla całej firmy, działu lub pracownika, z czasem trwania (24h/48h/3dni/7dni); przypisani dostają powiadomienie in-app.
- **FR-13** HR widzi wyłącznie dane zagregowane: indeks dobrostanu organizacji, trendy, rozkłady poziomów, uczestnictwo — z filtrem działu i zakresu czasu.
- **FR-14** Grupy mniejsze niż k=5 są maskowane („Dane utajnione — niewystarczająca liczebność próby"); próg egzekwuje backend.
- **FR-15** Administrator firmy zarządza działami i przypisaniem pracowników do działów.
- **FR-16** Działania administracyjne (zatwierdzenia, zmiany ról, przypisania) są rejestrowane w audit logu z aktorem, akcją i metadanymi.

### Prywatność i bezpieczeństwo (funkcjonalne)

- **FR-17** Ekran testu informuje pracownika, że pracodawca i HR nie widzą indywidualnych odpowiedzi.
- **FR-18** Odpowiedź >0 na pytanie 9 PHQ-9 wyświetla pracownikowi ekran wsparcia kryzysowego; informacja nie jest udostępniana pracodawcy w formie jednostkowej.
- **FR-19** Dane każdej firmy są odizolowane — żądania spoza własnej organizacji są odrzucane na poziomie backendu.

---

## 7. Wymagania niefunkcjonalne

- **NFR-1 Bezpieczeństwo:** bcrypt (12 rund), JWT z krótkim access tokenem i odświeżaniem, walidacja DTO na każdym endpointcie, nagłówki bezpieczeństwa (Helmet/nginx), CORS z jawną listą originów, rate limiting na endpointach auth, sekrety wyłącznie w zmiennych środowiskowych (fail-fast przy braku).
- **NFR-2 Prywatność:** k-anonimowość (k=5) dla wszystkich agregatów HR; zasada minimalizacji danych; brak indywidualnych wyników w panelach HR; zgodność z podstawowymi założeniami RODO (podstawa: dobrowolność, przejrzystość, ograniczenie celu).
- **NFR-3 Użyteczność:** wypełnienie check-inu ≤ 30 s, testu PHQ-9 ≤ 3 min; interfejs responsywny (mobile-first dla panelu pracownika); komunikaty po polsku; nota prywatności widoczna w miejscu zbierania danych.
- **NFR-4 Wydajność:** odpowiedzi API dla operacji pracownika < 500 ms przy typowym obciążeniu; agregacje HR liczone po stronie bazy; paginacja list administracyjnych.
- **NFR-5 Utrzymanie i wdrożenie:** całość konteneryzowana (Docker Compose lokalnie, Railway produkcyjnie); konfiguracja przez `.env` (`.env.example` w repo bez sekretów); przewidywalna struktura modułowa backendu.
- **NFR-6 Skalowalność:** architektura multi-tenant na wspólnej bazie z izolacją wierszy (`organizationId`) — wystarczająca dla skali projektu, z możliwością przejścia na schema-per-tenant (ADR-y w docs/decisions.md).

---

## 8. Kluczowe przepływy (poziom produktu)

### Wypełnienie testu przez pracownika

1. HR planuje test → pracownik dostaje powiadomienie,
2. pracownik otwiera test, widzi notę prywatności i zakres czasowy pytań,
3. odpowiada na pytania (szkic autozapisywany), wysyła komplet,
4. backend waliduje, zapisuje transakcyjnie odpowiedzi + wynik, nalicza interpretację,
5. pracownik widzi wynik i poziom; wynik zasila jego historię oraz — po przekroczeniu progu k — agregaty HR.

### Raport HR

1. HR otwiera dashboard, wybiera dział/zakres czasu,
2. backend weryfikuje rolę i przynależność do organizacji,
3. agregaty poniżej k=5 są maskowane,
4. HR widzi indeks dobrostanu, trendy tygodniowe, rozkład poziomów, uczestnictwo.

---

## 9. Metryki sukcesu (dla wdrożenia produkcyjnego)

- ≥ 60% aktywnych pracowników wykonuje check-in min. 3×/tydzień,
- ≥ 70% zwracalność zaplanowanych testów w oknie czasowym,
- czas od rejestracji firmy do pierwszego zaplanowanego testu < 1 dzień roboczy,
- 0 przypadków ekspozycji danych jednostkowych w panelu HR (gwarancja techniczna k-anonimowości).

---

## 10. Założenia i ograniczenia

- Kwestionariusze PHQ-9 i GAD-7 są publicznie dostępne; status licencyjny pełnych treści PSS-10 i skal nastroju należy zweryfikować przed komercjalizacją (w projekcie inżynierskim użyto struktur punktacji i parafraz pozycji).
- System przechowuje dane wrażliwe (dobrostan psychiczny) — każda nowa funkcja musi przejść ocenę wpływu na prywatność (zasada z RULES.md §11–13).
- Skala projektu: praca inżynierska / MVP — decyzje techniczne optymalizowane pod czytelność i obronę, nie pod skalę enterprise (RULES.md §9).

---

## 11. Przyszły rozwój (poza zakresem pracy)

- eksporty PDF/CSV, przypomnienia automatyczne, konfigurowalne alerty,
- cookies SameSite + CSRF dla panelu admina, refresh token rotation, 2FA,
- migracje TypeORM jako jedyny mechanizm zmian schematu na produkcji,
- silniejsza izolacja danych firm: schema-per-tenant, docelowo osobne bazy danych per firma (database-per-tenant) przy większej liczbie klientów — obecna izolacja wierszowa (`organizationId`) jest świadomym wyborem adekwatnym do skali MVP (ADR-006),
- integracja SSO, analiza komentarzy, wielojęzyczność.
