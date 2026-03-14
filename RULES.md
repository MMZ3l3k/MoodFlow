## Podstawowe zasady

### 0. Zawsze myśl w kontekście pracy inżynierskiej

Każda decyzja projektowa musi być podejmowana tak, aby dało się ją później jasno opisać w pracy.
Nie tworzymy rozwiązań „bo tak się robi”, tylko dlatego, że:

* rozwiązują konkretny problem biznesowy,
* są adekwatne do skali projektu,
* wspierają bezpieczeństwo, skalowalność i utrzymanie,
* umożliwiają poprawne opisanie metodyki, implementacji, testów i wdrożenia.

Każda istotna decyzja powinna mieć odpowiedź na pytania:

* **co zostało zastosowane,**
* **dlaczego właśnie to,**
* **jak działa,**
* **jakie daje korzyści,**
* **dlaczego nie wybrano prostszej lub innej alternatywy.**

---

### 1. Zawsze odpowiadaj i dokumentuj projekt w języku polskim

Cały opis projektowy, dokumentacja do pracy, uzasadnienia decyzji, komentarze architektoniczne i notatki do rozdziałów pracy mają być przygotowywane po polsku.
Kod, nazwy techniczne, nazwy klas, endpointów, interfejsów i commitów mogą pozostać anglojęzyczne, ale **opis decyzji i ich uzasadnienie do pracy ma być po polsku**.

---

### 2. Każdy wybór technologii musi mieć uzasadnienie

Nie wolno dodawać frameworka, biblioteki, wzorca ani usługi bez wskazania powodu użycia.

Dla każdej głównej technologii trzeba umieć uzasadnić:

* dlaczego została wybrana,
* jakie problemy rozwiązuje,
* jakie ma zalety w tym projekcie,
* dlaczego pasuje do architektury MoodMaster,
* dlaczego jest odpowiednia do pracy inżynierskiej.

Przykładowa logika uzasadnień:

* **React** — szybkie budowanie nowoczesnego, komponentowego interfejsu użytkownika,
* **Next.js** — uporządkowany panel administracyjny i dobra organizacja aplikacji,
* **NestJS** — modularny backend, czytelny podział na kontrolery, serwisy i moduły,
* **TypeScript** — większe bezpieczeństwo typów i mniejsze ryzyko błędów,
* **MySQL** — stabilna relacyjna baza danych odpowiednia do użytkowników, ról, ankiet, wyników i raportów,
* **Docker** — powtarzalne środowisko uruchomieniowe i łatwiejsze wdrożenie.

Jeżeli technologia nie daje realnej wartości dla projektu lub nie da się jej dobrze uzasadnić w pracy, nie powinna zostać użyta.

---

## Zasady projektowe

### 3. Projekt musi być zgodny z celem MoodMaster

MoodMaster to platforma do monitorowania dobrostanu psychicznego pracowników, oparta o:

* regularne ankiety i testy,
* walidowane narzędzia psychologiczne,
* anonimowość danych w raportach HR,
* analizę trendów,
* dashboardy dla pracownika, HR i administratora,
* zatwierdzanie użytkowników przez administratora.  

Każda funkcja musi wspierać ten zakres.
Nie dodawaj funkcji oderwanych od głównego celu produktu.

---

### 4. Najpierw zakres MVP, potem rozszerzenia

Najpierw implementujemy funkcje krytyczne dla działania systemu:

* logowanie,
* role i uprawnienia,
* zatwierdzanie użytkowników,
* wypełnianie testów,
* zapis odpowiedzi,
* obliczanie wyników,
* anonimizację raportów,
* dashboardy podstawowe,
* panel HR,
* panel administratora.

Dopiero później można przechodzić do funkcji rozszerzających:

* eksporty,
* zaawansowane alerty,
* analiza komentarzy,
* przypomnienia,
* integracje.

Zakres powinien być zgodny z podejściem MoSCoW, które służy do wyraźnego rozróżnienia funkcji krytycznych od rozszerzeń. 

---

### 5. Każda funkcjonalność musi być możliwa do opisania w pracy

Nie implementuj funkcji, których potem nie da się sensownie opisać w:

* wymaganiach funkcjonalnych,
* przypadkach użycia,
* diagramach,
* opisie realizacji,
* testach,
* wdrożeniu.

Każda większa funkcja powinna mieć:

* aktora,
* cel,
* dane wejściowe,
* wynik,
* warunki wstępne,
* warunki końcowe,
* sens biznesowy.

Takie podejście jest spójne z wymaganiami minimalnymi dla dokumentacji projektowej. 

---

## Jakość architektury i kodu

### 6. Zachowuj prostą, modularną architekturę

System ma być prosty do zrozumienia, ale gotowy na rozwój.
Preferowana architektura:

* osobny frontend pracownika,
* osobny frontend administratora/HR,
* centralny backend API,
* relacyjna baza danych.

Logika biznesowa ma znajdować się po stronie backendu.
Frontend nie może samodzielnie liczyć wyników testów, podejmować decyzji uprawnień ani wykonywać logiki anonimizacji.

---

### 7. Utrzymuj separację odpowiedzialności

Nie mieszaj:

* widoku z logiką domenową,
* logiki biznesowej z warstwą persystencji,
* autoryzacji z logiką UI,
* modeli bazy z DTO API,
* logiki HR z logiką pracownika.

Podział powinien być czytelny:

* **frontend** odpowiada za interfejs,
* **backend** za reguły biznesowe,
* **baza danych** za trwałe przechowywanie danych.

---

### 8. Każdy moduł ma mieć jasną odpowiedzialność

Dla backendu preferowany jest podział na moduły, np.:

* auth,
* users,
* approvals,
* organizations,
* departments,
* assessments,
* questions,
* responses,
* results,
* analytics,
* reports,
* audit,
* notifications.

Nie twórz „modułów śmietników”, które robią wszystko naraz.

---

### 9. Nie dodawaj złożoności bez potrzeby

Nie stosuj mikroserwisów, event busów, CQRS, skomplikowanych wzorców lub dodatkowych warstw tylko dlatego, że brzmią „bardziej profesjonalnie”.
MoodMaster jako praca inżynierska powinien być:

* technicznie poprawny,
* dobrze ustrukturyzowany,
* łatwy do wyjaśnienia,
* sensowny w implementacji.

Złożoność musi być uzasadniona realną potrzebą.

---

### 10. Kod ma być gotowy do omówienia na obronie

Każdy ważny fragment projektu powinien dać się wyjaśnić prostym językiem:

* co robi,
* kiedy działa,
* jak przepływają dane,
* jakie są zależności,
* jak jest zabezpieczony,
* jak został przetestowany.

Jeżeli coś jest trudne do obronienia lub opisania, należy to uprościć.

---

## Bezpieczeństwo i prywatność

### 11. Bezpieczeństwo jest wymaganiem krytycznym

System operuje na danych dotyczących dobrostanu psychicznego, więc bezpieczeństwo jest obowiązkowe, a nie opcjonalne.

Minimalne wymagania:

* uwierzytelnianie użytkowników,
* autoryzacja oparta o role,
* bezpieczne hashowanie haseł,
* szyfrowanie komunikacji,
* ograniczanie dostępu do danych zgodnie z rolą,
* anonimizacja raportów HR,
* zgodność z podstawowymi założeniami RODO.  

---

### 12. Dane HR muszą być zagregowane i anonimowe

Panel HR nie może prezentować danych pozwalających łatwo zidentyfikować konkretną osobę.
Raporty mają przedstawiać dane zbiorcze, trendy, alerty i poziomy zagregowane.

To jest jedna z najważniejszych cech MoodMaster i jeden z jego głównych wyróżników biznesowych. 

---

### 13. Dane wrażliwe traktuj według zasady minimalizacji

Przetwarzaj tylko te dane, które są niezbędne do działania systemu.
Nie zapisuj zbędnych informacji.
Nie pokazuj danych, których użytkownik nie potrzebuje do wykonania swojej roli.
Nie przekazuj do frontendu informacji, które nie są potrzebne w danym widoku.

---

### 14. Zasady bezpieczeństwa muszą być opisane, a nie tylko wdrożone

Każde wdrożone zabezpieczenie musi dać się opisać w pracy, np.:

* JWT i podział na role,
* bcrypt,
* HTTPS,
* anonimizacja raportów,
* kontrola dostępu,
* walidacja danych wejściowych,
* logowanie działań administracyjnych.

W pracy trzeba pokazać nie tylko „że działa”, ale też **jak i po co to zostało zastosowane**. 

---

## Wymagania funkcjonalne i analiza

### 15. Funkcjonalności buduj na podstawie interesariuszy

Każda funkcja ma wynikać z potrzeb interesariuszy:

* pracownika,
* HR,
* administratora,
* pośrednio menedżera i zarządu. 

Nie tworzymy funkcji przypadkowych.
Najpierw potrzeba użytkownika, potem implementacja.

---

### 16. Wszystkie wymagania muszą być jednoznaczne

Wymagania powinny mówić:

* kto wykonuje działanie,
* co chce osiągnąć,
* po co to robi,
* jaki ma być rezultat.

Wymagania funkcjonalne mają być zrozumiałe jednocześnie dla:

* promotora,
* programisty,
* testera,
* odbiorcy biznesowego. 

---

### 17. Wymagania niefunkcjonalne traktuj tak samo poważnie jak funkcjonalne

MoodMaster wymaga szczególnej dbałości o:

* bezpieczeństwo,
* wydajność,
* skalowalność,
* zgodność prawną,
* użyteczność.

Przykłady, które muszą być uwzględnione:

* szybki i intuicyjny proces wypełniania ankiet,
* obsługa wielu użytkowników jednocześnie,
* rozsądny czas odpowiedzi API,
* możliwość rozwoju bez przebudowy całego systemu,
* zgodność z RODO.  

---

## Diagramy i modelowanie

### 18. Diagramy nie są dodatkiem — są częścią inżynierii projektu

Projekt musi dać się przedstawić w formie diagramów wymaganych w pracy:

* przypadków użycia,
* klas,
* maszyny stanów,
* czynności,
* sekwencji,
* komunikacji,
* komponentów,
* wdrożenia,
* ERD bazy danych. 

Implementacja ma wspierać te diagramy, a nie z nimi walczyć.

---

### 19. BPMN wykorzystuj do pokazania procesu biznesowego

Jeżeli modelujesz procesy biznesowe wokół MoodMaster, BPMN ma służyć:

* wizualizacji procesu,
* analizie i optymalizacji,
* komunikacji między biznesem a IT,
* uchwyceniu logiki procesu w sposób zrozumiały dla obu stron.  

Dobre diagramy BPMN powinny być:

* czytelne,
* nazwane biznesowo,
* nieskomplikowane,
* logiczne,
* zgodne z przepływem procesu. 

---

## Implementacja

### 20. Najpierw plan, potem kod

Zanim zaczniesz implementować większą zmianę, zawsze określ:

* co dokładnie powstaje,
* w jakim module,
* jakie dane będą potrzebne,
* jakie endpointy są potrzebne,
* jakie widoki będą zmienione,
* jakie ryzyka techniczne istnieją,
* jak to opisać później w pracy.

Nie koduj „od razu wszystkiego”.

---

### 21. Najpierw fundamenty techniczne, potem funkcje poboczne

Kolejność prac:

1. struktura repozytorium,
2. konfiguracja środowiska,
3. Docker,
4. baza danych,
5. auth,
6. role i uprawnienia,
7. zarządzanie użytkownikami,
8. testy i ankiety,
9. wyniki,
10. dashboardy,
11. raporty,
12. rozszerzenia.

---

### 22. Każda funkcja powinna przejść pełen cykl

Dla każdej istotnej funkcji należy przejść przez:

* analizę,
* model danych,
* endpoint,
* logikę backendową,
* interfejs frontendowy,
* walidację,
* test,
* opis do dokumentacji.

Nie zostawiaj funkcji „na pół”.

---

### 23. Nie twórz kodu, którego nie umiesz obronić

Nie dodawaj:

* nieczytelnych bibliotek,
* magicznych konfiguracji,
* skopiowanych rozwiązań bez zrozumienia,
* nieuzasadnionych abstrakcji,
* eksperymentalnych fragmentów bez potrzeby projektowej.

Każdy ważny element ma być świadomą decyzją.

---

## Testy

### 24. Testy muszą być planowane od początku

Projekt ma zawierać procedury testowania i opis ich wyników, ponieważ testy są wymaganym elementem pracy inżynierskiej.  

Dla MoodMaster należy przewidzieć testy:

* logowania i rejestracji,
* zatwierdzania użytkownika przez administratora,
* dostępu zgodnego z rolą,
* wypełniania ankiety,
* zapisu odpowiedzi,
* obliczania wyników,
* anonimizacji danych,
* poprawności dashboardów,
* filtrów raportowych,
* responsywności widoków.

---

### 25. Testuj funkcjonalnie i niefunkcjonalnie

W pracy trzeba uwzględnić nie tylko testy „czy działa”, ale też:

* czy działa poprawnie,
* czy działa bezpiecznie,
* czy działa wydajnie,
* czy działa zgodnie z uprawnieniami,
* czy jest użyteczne.

---

### 26. Każdy istotny błąd powinien mieć ścieżkę diagnozy

Gdy pojawia się problem:

* zidentyfikuj moduł,
* odtwórz scenariusz,
* wskaż dane wejściowe,
* ustal przyczynę,
* zaproponuj poprawkę,
* udokumentuj efekt naprawy.

To później bardzo dobrze nadaje się do rozdziału o realizacji i testowaniu.

---

## Dokumentacja do pracy

### 27. Dokumentacja jest częścią produktu

Dokumentacja nie powstaje na końcu „na szybko”.
Musi być rozwijana równolegle z projektem.

Obowiązkowo należy utrzymywać:

* `PRD.md`,
* `ARCHITECTURE.md`,
* `RULES.md`,
* `README.md`,
* opis modeli danych,
* listę endpointów,
* opis wdrożenia,
* notatki do rozdziałów pracy.

To wspiera wymagania uczelni dotyczące metodyki, realizacji, wdrożenia i opisu sposobu działania systemu. 

---

### 28. Każdy rozdział pracy musi mieć pokrycie w projekcie

Jeżeli w pracy ma się pojawić:

* analiza rynku,
* SWOT,
* wymagania,
* MoSCoW,
* diagramy,
* architektura,
* implementacja,
* testy,
* bezpieczeństwo,
* archiwizacja,
* wdrożenie,

to odpowiednie materiały muszą istnieć wcześniej w projekcie i dokumentacji. 

---

### 29. Uzasadnienia zapisuj na bieżąco

Przy każdej ważniejszej decyzji zapisuj:

* alternatywy,
* wybrane rozwiązanie,
* powód wyboru,
* wpływ na system,
* wpływ na pracę inżynierską.

Dzięki temu nie będziesz później odtwarzał decyzji z pamięci.

---

## Wdrożenie i eksploatacja

### 30. Projekt musi dać się uruchomić w kontrolowany sposób

System ma mieć przewidywalny sposób uruchomienia lokalnego i wdrożeniowego:

* konteneryzacja,
* plik `docker-compose.yml`,
* plik `.env.example`,
* jasny opis portów,
* instrukcję uruchomienia krok po kroku.

Wdrożenie i eksploatacja są osobnym, wymaganym elementem opisu pracy. 

---

### 31. Archiwizacja danych musi być świadomie zaprojektowana

W pracy trzeba wskazać:

* gdzie dane są przechowywane,
* jak są zabezpieczane,
* jak wygląda kopia zapasowa,
* które dane są trwałe,
* jakie dane mogą być anonimizowane lub usuwane.

To jest część bezpieczeństwa i eksploatacji systemu. 

---

## Zasady praktyczne dla developmentu

### 32. Utrzymuj porządek w nazwach i strukturze

Nazwy mają być spójne, przewidywalne i technicznie poprawne.
Nie mieszaj stylów nazewnictwa bez powodu.

---

### 33. Każda rola w systemie musi mieć jasno określone granice

Pracownik, HR i administrator muszą mieć odrębne:

* widoki,
* uprawnienia,
* endpointy,
* scenariusze użycia,
* zakres danych.

To jest ważne zarówno dla bezpieczeństwa, jak i dla diagramów oraz testów. 

---

### 34. Funkcje diagnostyczne nie mogą udawać diagnozy klinicznej

MoodMaster nie może być przedstawiany jako narzędzie medyczne ani diagnostyczne w sensie klinicznym.
System służy do monitorowania, analizy i wczesnego wykrywania trendów, a nie do stawiania diagnozy lub zastępowania specjalisty. 

---

### 35. Interfejs ma być prosty, szybki i zrozumiały

Szczególnie część pracownicza musi pozwalać na szybkie wykonanie zadania:

* mało kroków,
* jasne komunikaty,
* brak zbędnego obciążenia,
* czytelna informacja o prywatności,
* responsywność.

To wynika z wymagań użyteczności systemu. 

---

### 36. Projektuj pod rozwój, ale implementuj realistycznie

Architektura ma umożliwiać rozwój po pracy inżynierskiej, ale nie wszystko musi być wykonane teraz.
To, czego nie ma w MVP, powinno być:

* świadomie wykluczone,
* wpisane do sekcji przyszłego rozwoju,
* technicznie przewidziane.

---

## Reguła końcowa

### 37. Każdy element projektu musi przejść test trzech pytań

Przed dodaniem czegokolwiek zapytaj:

1. **Czy to jest potrzebne MoodMasterowi?**
2. **Czy potrafię to uzasadnić technicznie i biznesowo?**
3. **Czy potrafię to później opisać i obronić w pracy inżynierskiej?**

Jeżeli na któreś pytanie odpowiedź brzmi „nie”, to rozwiązanie należy uprościć, odłożyć albo usunąć.

---
