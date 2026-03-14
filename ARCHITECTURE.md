
## 1. Cel dokumentu

Dokument opisuje architekturę systemu MoodMaster — aplikacji webowej wspierającej monitorowanie dobrostanu psychicznego pracowników w organizacji.  
Celem dokumentu jest ujednolicenie sposobu projektowania, implementacji i rozwijania systemu przez zespół programistyczny.

MoodMaster ma umożliwiać:
- wykonywanie testów i ankiet przez pracowników,
- analizę wyników oraz trendów dobrostanu,
- prezentację danych w dashboardach,
- wspieranie działu HR i administratorów w monitorowaniu zbiorczych wskaźników,
- zachowanie wysokiego poziomu bezpieczeństwa i prywatności danych.

---

## 2. Założenia architektoniczne

Architektura systemu została zaprojektowana zgodnie z następującymi założeniami:

- system ma być modularny i łatwy do rozbudowy,
- frontend użytkownika i panel administracyjny mają być od siebie oddzielone,
- backend ma udostępniać spójne API dla wszystkich klientów,
- logika biznesowa ma być skoncentrowana po stronie serwera,
- system ma być gotowy na rozwój o kolejne moduły, np. raporty PDF, integracje z firmowym SSO, powiadomienia e-mail, rekomendacje lub moduły AI,
- dane wrażliwe mają być odpowiednio chronione, a dostęp do nich ograniczony rolami i uprawnieniami.

---

## 3. Styl architektury

W projekcie przyjmujemy architekturę warstwową z wyraźnym podziałem na:

1. **Warstwę prezentacji**
   - aplikacja dla pracownika,
   - panel administracyjny / HR.

2. **Warstwę logiki biznesowej**
   - backend API,
   - autoryzacja,
   - obsługa testów, wyników, raportów i dashboardów.

3. **Warstwę danych**
   - relacyjna baza danych,
   - struktury do przechowywania użytkowników, organizacji, testów, odpowiedzi, wyników i raportów.

Dodatkowo system jest logicznie podzielony na moduły domenowe, co ułatwia dalsze utrzymanie i rozwój.

---

## 4. Architektura wysokiego poziomu

System składa się z czterech głównych części:

### 4.1 Client Frontend
Aplikacja przeznaczona dla pracownika końcowego.  
Odpowiada za:
- logowanie i rejestrację,
- wypełnianie ankiet i testów,
- przegląd własnych wyników,
- podgląd historii ocen,
- odbieranie zaleceń i informacji zwrotnych,
- zarządzanie podstawowymi ustawieniami konta.

### 4.2 Admin Frontend
Panel dla administratora, HR lub managera z odpowiednimi uprawnieniami.  
Odpowiada za:
- zarządzanie użytkownikami i organizacjami,
- zarządzanie testami i ankietami,
- przegląd danych zagregowanych,
- analizę wyników i trendów,
- generowanie raportów,
- nadawanie ról i uprawnień.

### 4.3 Backend API
Centralny element systemu.  
Odpowiada za:
- uwierzytelnianie i autoryzację,
- obsługę logiki biznesowej,
- walidację danych,
- obliczanie wyników testów,
- agregację danych do dashboardów,
- komunikację z bazą danych,
- integracje z zewnętrznymi usługami.

### 4.4 Database
Relacyjna baza danych przechowująca:
- użytkowników,
- role i uprawnienia,
- organizacje i działy,
- ankiety i testy,
- pytania i odpowiedzi,
- wyniki indywidualne i zbiorcze,
- logi zdarzeń,
- konfigurację systemową.

---

## 5. Docelowy stack technologiczny

## 5.1 Client Frontend
- **Język:** TypeScript
- **Framework:** React
- **Routing:** React Router
- **Stan aplikacji:** Redux Toolkit
- **UI:** Shadcn/ui + Tailwind CSS
- **Port:** 3000
- **Katalog:** `client-frontend/`

### Uzasadnienie
React zapewnia szybkie budowanie nowoczesnego interfejsu użytkownika, dobrą skalowalność oraz szerokie wsparcie społeczności.  
TypeScript zwiększa bezpieczeństwo typów i ogranicza liczbę błędów.  
Redux Toolkit upraszcza zarządzanie stanem globalnym, np. sesją użytkownika, wynikami i dashboardem.

---

## 5.2 Admin Frontend
- **Język:** TypeScript
- **Framework:** Next.js
- **UI:** Shadcn/ui + Tailwind CSS
- **Port:** 3001
- **Katalog:** `admin-frontend/`

### Uzasadnienie
Panel administracyjny wymaga przejrzystej struktury, dobrej organizacji routingu oraz możliwości rozbudowy o rozbudowane widoki tabelaryczne, raportowe i analityczne.  
Next.js dobrze sprawdza się przy panelach administracyjnych i umożliwia uporządkowany rozwój projektu.

---

## 5.3 Backend API
- **Język:** TypeScript
- **Framework:** NestJS
- **Port:** 4000
- **Katalog:** `backend-api/`

### Uzasadnienie
NestJS wspiera podejście modułowe, warstwową organizację kodu i dobrą separację odpowiedzialności.  
Dzięki TypeScript i architekturze opartej o moduły, kontrolery, serwisy i repozytoria backend będzie czytelny i łatwy w utrzymaniu.

---

## 5.4 Database
- **Silnik:** MySQL
- **Port:** 3306
- **Katalog:** `mysql/`

### Uzasadnienie
MySQL jest stabilnym i sprawdzonym rozwiązaniem relacyjnym.  
Dobrze nadaje się do systemów biznesowych opartych o użytkowników, role, ankiety, wyniki oraz raportowanie.

---

## 6. Struktura repozytorium

```txt
moodmaster/
├── client-frontend/      # aplikacja pracownika
├── admin-frontend/       # panel administratora / HR
├── backend-api/          # API i logika biznesowa
├── mysql/                # konfiguracja bazy danych
├── docs/                 # dokumentacja projektowa
├── docker-compose.yml    # uruchamianie całego środowiska
├── .env.example          # przykładowe zmienne środowiskowe
└── README.md             # instrukcja uruchomienia projektu
````

---

## 7. Główne moduły domenowe backendu

Backend powinien być podzielony na moduły domenowe.

### 7.1 Auth Module

Odpowiada za:

* logowanie,
* rejestrację,
* odświeżanie tokenów,
* reset hasła,
* obsługę sesji,
* integrację z JWT lub innym mechanizmem tokenowym.

### 7.2 Users Module

Odpowiada za:

* profile użytkowników,
* dane kont,
* role,
* uprawnienia,
* status aktywności użytkownika.

### 7.3 Organizations Module

Odpowiada za:

* firmy,
* działy,
* zespoły,
* powiązanie użytkowników z organizacją.

### 7.4 Assessments Module

Odpowiada za:

* testy psychologiczne,
* ankiety okresowe,
* definicje formularzy,
* pytania,
* wersjonowanie formularzy.

### 7.5 Responses Module

Odpowiada za:

* zapisywanie odpowiedzi użytkowników,
* walidację odpowiedzi,
* przypisanie odpowiedzi do konkretnego testu i użytkownika.

### 7.6 Results Module

Odpowiada za:

* obliczanie wyników,
* interpretację progów,
* zapis wyników końcowych,
* generowanie historii pomiarów.

### 7.7 Dashboard Module

Odpowiada za:

* przygotowanie danych do wykresów,
* agregację statystyk,
* filtrowanie wyników,
* raportowanie dla administratorów i HR.

### 7.8 Notifications Module

Odpowiada za:

* przypomnienia o ankietach,
* komunikaty systemowe,
* powiadomienia e-mail lub in-app.

### 7.9 Reports Module

Odpowiada za:

* eksport raportów,
* generowanie zestawień zbiorczych,
* przygotowanie danych do analiz.

### 7.10 Audit / Logs Module

Odpowiada za:

* rejestrowanie ważnych operacji,
* historię logowań,
* śledzenie zmian administracyjnych,
* wsparcie bezpieczeństwa i zgodności.

---

## 8. Warstwy backendu

W backendzie należy zachować spójny podział na warstwy:

### 8.1 Controllers

Odpowiadają za:

* odbieranie żądań HTTP,
* walidację wejścia na poziomie DTO,
* zwracanie odpowiedzi do klienta.

### 8.2 Services

Odpowiadają za:

* logikę biznesową,
* wywoływanie odpowiednich repozytoriów,
* przetwarzanie danych,
* egzekwowanie reguł domenowych.

### 8.3 Repositories / Data Access

Odpowiadają za:

* komunikację z bazą danych,
* pobieranie i zapis danych,
* operacje CRUD.

### 8.4 DTO / Validators

Odpowiadają za:

* walidację danych wejściowych,
* definiowanie kontraktów API,
* ograniczanie błędnych żądań.

### 8.5 Guards / Middleware / Interceptors

Odpowiadają za:

* uwierzytelnianie,
* autoryzację,
* logowanie żądań,
* obsługę wyjątków,
* transformację odpowiedzi.

---

## 9. Role użytkowników w systemie

W systemie przewiduje się następujące role:

### 9.1 Employee

Pracownik końcowy, który:

* wypełnia testy i ankiety,
* przegląda własne wyniki,
* śledzi własne zmiany w czasie.

### 9.2 HR / Manager

Użytkownik biznesowy z dostępem do danych zagregowanych:

* przegląda dashboardy zbiorcze,
* analizuje trendy,
* monitoruje poziom dobrostanu w organizacji,
* nie powinien mieć dostępu do nieuzasadnionych danych wrażliwych jednostki, jeśli system nie przewiduje takiego zakresu.

### 9.3 Admin

Administrator techniczny systemu:

* zarządza kontami,
* zarządza konfiguracją systemu,
* nadaje role,
* zarządza ankietami, testami i ustawieniami.

---

## 10. Przepływ danych w systemie

### 10.1 Przykładowy przepływ — wykonanie testu przez pracownika

1. Użytkownik loguje się do aplikacji.
2. Frontend pobiera listę dostępnych testów z backendu.
3. Użytkownik wybiera test i odpowiada na pytania.
4. Odpowiedzi są wysyłane do backendu.
5. Backend waliduje dane i zapisuje odpowiedzi.
6. Moduł wyników oblicza rezultat testu.
7. Wynik zostaje zapisany w bazie danych.
8. Frontend pobiera wynik oraz interpretację i prezentuje je użytkownikowi.
9. Dane zagregowane mogą zostać uwzględnione w dashboardzie administratora.

### 10.2 Przykładowy przepływ — analiza przez administratora

1. Administrator loguje się do panelu.
2. Panel pobiera dane dashboardowe z backendu.
3. Backend pobiera dane zagregowane z bazy.
4. Wyniki są filtrowane wg organizacji, działu, zakresu dat lub typu testu.
5. Administrator otrzymuje dashboard z wykresami, wskaźnikami i trendami.

---

## 11. Komunikacja między komponentami

Komunikacja odbywa się w modelu:

* frontendy → backend API → baza danych

Frontendy nie komunikują się bezpośrednio z bazą danych.
Wszelka logika biznesowa i dostęp do danych przechodzi przez backend API.

### Format komunikacji

* REST API
* JSON jako podstawowy format wymiany danych
* HTTPS w środowisku produkcyjnym

---

## 12. Autoryzacja i uwierzytelnianie

System powinien wykorzystywać mechanizm oparty o tokeny, np. JWT.

### Założenia:

* logowanie przez e-mail i hasło,
* hasła przechowywane wyłącznie w postaci hashowanej,
* sesje zarządzane przez access token i refresh token,
* kontrola dostępu oparta o role,
* zabezpieczenie endpointów guardami,
* możliwość rozszerzenia o SSO w przyszłości.

---

## 13. Bezpieczeństwo

Ze względu na charakter danych, bezpieczeństwo jest jednym z kluczowych elementów architektury.

### Wymagania bezpieczeństwa:

* szyfrowanie komunikacji HTTPS,
* hashowanie haseł,
* walidacja danych wejściowych,
* ochrona przed podstawowymi atakami webowymi,
* ograniczanie dostępu do danych zgodnie z rolą użytkownika,
* logowanie zdarzeń administracyjnych,
* minimalizacja zakresu przetwarzanych danych,
* przygotowanie systemu pod wymagania prywatności i ochrony danych osobowych.

### Dodatkowe zalecenia:

* rate limiting dla logowania,
* blokada konta po wielu nieudanych próbach,
* maskowanie danych wrażliwych w logach,
* wersjonowanie API i kontrola zmian.

---

## 14. Prywatność i dane wrażliwe

MoodMaster operuje na danych dotyczących samopoczucia i dobrostanu, dlatego należy stosować zasadę minimalizacji danych.

### Zasady:

* gromadzić wyłącznie dane niezbędne do działania systemu,
* ograniczyć dostęp do wyników indywidualnych,
* dane zbiorcze prezentować w formie zagregowanej,
* jednoznacznie rozdzielić dane identyfikacyjne od danych ankietowych tam, gdzie jest to uzasadnione,
* przewidzieć możliwość anonimizacji lub pseudonimizacji danych,
* zapewnić kontrolę dostępu i audyt operacji.

---

## 15. Skalowalność

Architektura powinna umożliwiać rozwój systemu bez konieczności przebudowy całej aplikacji.

### Podejście:

* podział na niezależne aplikacje frontendowe,
* modularny backend,
* oddzielenie warstwy prezentacji od logiki biznesowej,
* możliwość wydzielenia wybranych modułów do osobnych usług w przyszłości,
* możliwość rozbudowy o cache, kolejki i zewnętrzne integracje.

### Potencjalne kierunki rozwoju:

* moduł AI do rekomendacji,
* integracja z narzędziami HR,
* import użytkowników z systemów zewnętrznych,
* eksport raportów do PDF/Excel,
* powiadomienia push i e-mail automation,
* wielojęzyczność.

---

## 16. Wydajność

System nie wymaga na początku architektury mikroserwisowej, jednak powinien być przygotowany na wzrost liczby użytkowników.

### Założenia wydajnościowe:

* szybki czas odpowiedzi dla operacji CRUD,
* paginacja dla dużych list,
* filtrowanie i sortowanie po stronie backendu,
* indeksowanie kluczowych pól w bazie danych,
* ograniczenie liczby ciężkich zapytań raportowych,
* możliwość cache’owania wybranych dashboardów.

---

## 17. Strategia wdrożenia

Na potrzeby developmentu i testów system powinien być uruchamiany lokalnie w środowisku kontenerowym.

### Kontenery:

* `client-frontend`
* `admin-frontend`
* `backend-api`
* `mysql`

Całość powinna być uruchamiana przez `docker-compose.yml`.

### Środowiska:

* local
* development
* staging
* production

Dla każdego środowiska należy przewidzieć osobne zmienne środowiskowe.

---

## 18. Zmienne środowiskowe

Każda aplikacja powinna korzystać z własnych zmiennych środowiskowych.

### Przykładowe zmienne:

* `PORT`
* `NODE_ENV`
* `DATABASE_URL`
* `DB_HOST`
* `DB_PORT`
* `DB_USER`
* `DB_PASSWORD`
* `DB_NAME`
* `JWT_SECRET`
* `JWT_REFRESH_SECRET`
* `CORS_ORIGIN`
* `MAIL_HOST`
* `MAIL_PORT`
* `MAIL_USER`
* `MAIL_PASSWORD`

W repozytorium należy umieścić plik `.env.example` bez wrażliwych danych.

---

## 19. Konwencje projektowe

### 19.1 Zasady ogólne

* używać TypeScript we wszystkich warstwach aplikacji,
* utrzymywać spójne nazewnictwo modułów i plików,
* stosować podział na małe, czytelne komponenty,
* unikać duplikacji logiki,
* logikę biznesową trzymać w backendzie.

### 19.2 Nazewnictwo

* komponenty React: `PascalCase`
* pliki pomocnicze: `camelCase` lub `kebab-case`
* endpointy REST: `kebab-case` lub logiczne nazwy zasobów
* moduły backendowe: zgodnie z domeną biznesową

### 19.3 Jakość kodu

* ESLint
* Prettier
* spójne reguły formatowania
* code review przed mergem
* sensowne komunikaty commitów

---

## 20. Testowanie

System powinien być rozwijany z uwzględnieniem testów.

### Typy testów:

* testy jednostkowe dla logiki biznesowej,
* testy integracyjne dla API,
* testy komponentów frontendowych,
* testy end-to-end dla kluczowych ścieżek użytkownika.

### Kluczowe obszary testowania:

* logowanie i autoryzacja,
* wypełnianie ankiet,
* obliczanie wyników,
* dostęp zależny od roli,
* dashboardy i filtrowanie,
* bezpieczeństwo wejścia i walidacja danych.

---

## 21. Dokumentacja techniczna

Każdy główny moduł powinien być opisany w dokumentacji technicznej.

Minimalny zestaw dokumentów:

* `README.md`
* `ARCHITECTURE.md`
* `PRD.md`
* dokumentacja endpointów API
* opis modelu danych
* instrukcja uruchomienia lokalnego środowiska

---

## 22. Zasady pracy dla programistów

Rules:
Zaczynaj od szkieletu aplikacji, następnie utwórz konfigurację Dockera.
Najpierw opracuj plan — napisz, co, jak i dlaczego chcesz zrobić.
Utrzymuj jak najprostszą strukturę katalogów, nie twórz katalogu pośredniego.
Wykorzystuj komendę `pwd`, aby upewnić się, że wykonujesz operacje w odpowiednim katalogu.
Stwórz dokumentację w pliku `README.md`.

Dodatkowo:

* nie implementuj wszystkiego naraz — rozwijaj projekt etapami,
* najpierw przygotuj fundament: auth, users, organizations, assessments,
* każdą większą zmianę poprzedzaj krótkim planem technicznym,
* dbaj o spójność typów między frontendem i backendem,
* nie mieszaj logiki widoku z logiką domenową,
* endpointy i modele danych projektuj tak, aby były gotowe na rozwój.

---

## 23. Minimalna kolejność implementacji

### Etap 1 — fundament projektu

* konfiguracja repozytorium,
* utworzenie aplikacji frontendowych,
* utworzenie backendu,
* konfiguracja bazy danych,
* docker-compose,
* podstawowy README.

### Etap 2 — bezpieczeństwo i użytkownicy

* rejestracja,
* logowanie,
* role i uprawnienia,
* profile użytkowników,
* organizacje i przypisanie użytkowników.

### Etap 3 — ankiety i testy

* definicje testów,
* pytania,
* odpowiedzi,
* zapis formularzy,
* obliczanie wyników.

### Etap 4 — dashboard i raportowanie

* historia wyników użytkownika,
* dashboard administratora,
* agregacje,
* filtrowanie,
* raporty.

### Etap 5 — rozwój i optymalizacja

* powiadomienia,
* eksport danych,
* audyt,
* optymalizacje wydajności,
* rozbudowa bezpieczeństwa.

---

## 24. Podsumowanie

Architektura MoodMaster opiera się na czytelnym podziale odpowiedzialności pomiędzy dwa frontendy, centralny backend API i relacyjną bazę danych.
Wybrany stack technologiczny wspiera szybki rozwój MVP, a jednocześnie pozostawia przestrzeń do późniejszej rozbudowy systemu.

Najważniejsze cechy tej architektury:

* modularność,
* bezpieczeństwo,
* skalowalność,
* prostota wdrożenia,
* gotowość do dalszego rozwoju funkcjonalnego i biznesowego.

```


