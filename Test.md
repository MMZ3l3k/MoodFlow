Masz rację — do dokumentacji technicznej i dla Claude’a sama interpretacja nie wystarczy. Trzeba opisać też **strukturę każdego testu**: liczbę pytań, zakres czasu, warianty odpowiedzi, mapowanie punktów, pozycje odwracane, progi interpretacyjne i sposób zapisania w systemie.

Nie mogę wkleić pełnych, dosłownych treści wszystkich kwestionariuszy 1:1, bo część z nich ma ograniczenia licencyjne albo niepewny status użycia w aplikacji produkcyjnej. Mogę za to dać Ci **kompletną strukturę implementacyjną**: dokładnie jak taki test ma być zbudowany w aplikacji, jakie ma mieć pytania jako typy/obszary, jakie odpowiedzi, jak liczyć wynik i jak to zapisać w dokumentacji. Dla PHQ-9 i GAD-7 źródła oficjalne potwierdzają publiczną dostępność i zasady punktacji; dla PSS-10 i części skal nastroju warto przed wdrożeniem produkcyjnym sprawdzić prawa do pełnej treści pozycji. ([phqscreeners.com][1])

Poniżej masz wersję gotową do wklejenia do dokumentacji.

---

# Struktura testów w aplikacji MoodMaster

## Zasada ogólna implementacji testów

Każdy test w systemie powinien mieć wspólną strukturę danych:

* `id`
* `code`
* `name`
* `description`
* `timeframe`
* `questionCount`
* `answerScale`
* `questions`
* `scoringMethod`
* `interpretationRules`
* `flags`
* `isAnonymousForHR`
* `requiresAllAnswers`
* `version`

Każde pytanie powinno mieć:

* `id`
* `order`
* `label`
* `text`
* `theme`
* `scaleType`
* `reverseScored`
* `required`

Każda odpowiedź powinna mieć:

* `questionId`
* `selectedValue`
* `selectedLabel`

Każdy wynik powinien mieć:

* `rawScore`
* `normalizedScore`
* `severity`
* `riskFlags`
* `submittedAt`

---

## 1. PHQ-9

### Cel

Przesiewowa ocena nasilenia objawów depresyjnych w ciągu ostatnich 2 tygodni. Składa się z 9 pozycji ocenianych w skali 0–3. Wynik całkowity to suma punktów 0–27. Oficjalne progi interpretacyjne to 5, 10, 15 i 20. ([phqscreeners.com][1])

### Zakres czasu

`Oceń, jak często w ciągu ostatnich 2 tygodni występowały u Ciebie poniższe problemy.`

### Odpowiedzi do zaznaczenia

Dla każdego pytania ta sama skala:

* `0` — wcale
* `1` — kilka dni
* `2` — więcej niż połowę dni
* `3` — niemal codziennie ([phqscreeners.com][1])

### Struktura pytań

W dokumentacji i implementacji możesz zapisać je tak:

1. **Obniżone zainteresowanie lub brak przyjemności**
2. **Smutek, przygnębienie lub poczucie beznadziei**
3. **Problemy ze snem**
4. **Zmęczenie lub brak energii**
5. **Zmiany apetytu**
6. **Poczucie niskiej wartości lub winy**
7. **Trudności z koncentracją**
8. **Spowolnienie lub pobudzenie psychoruchowe**
9. **Myśli o śmierci lub samouszkodzeniu**

To jest poprawna struktura domenowa do systemu i dokumentacji. Do wersji produkcyjnej możesz podpiąć oficjalne, licencjonowane/brzmieniowo zatwierdzone treści pytań. Punktacja i interpretacja pozostają takie same. ([phqscreeners.com][1])

### Liczenie wyniku

`rawScore = suma odpowiedzi z 9 pytań`

Zakres:

* minimum `0`
* maksimum `27` ([phqscreeners.com][1])

### Interpretacja

* `0–4` — brak lub minimalne objawy
* `5–9` — łagodne
* `10–14` — umiarkowane
* `15–19` — umiarkowanie ciężkie
* `20–27` — ciężkie ([phqscreeners.com][1])

### Flagi systemowe

Dodatkowa flaga:

* jeśli pytanie 9 > 0 → `selfHarmRiskFlag = true`

### Struktura JSON

```json
{
  "code": "PHQ9",
  "name": "PHQ-9",
  "timeframe": "Ostatnie 2 tygodnie",
  "questionCount": 9,
  "answerScale": [
    { "value": 0, "label": "Wcale" },
    { "value": 1, "label": "Kilka dni" },
    { "value": 2, "label": "Więcej niż połowę dni" },
    { "value": 3, "label": "Niemal codziennie" }
  ],
  "questions": [
    { "order": 1, "theme": "Brak zainteresowania", "reverseScored": false },
    { "order": 2, "theme": "Obniżony nastrój", "reverseScored": false },
    { "order": 3, "theme": "Sen", "reverseScored": false },
    { "order": 4, "theme": "Energia", "reverseScored": false },
    { "order": 5, "theme": "Apetyt", "reverseScored": false },
    { "order": 6, "theme": "Poczucie własnej wartości", "reverseScored": false },
    { "order": 7, "theme": "Koncentracja", "reverseScored": false },
    { "order": 8, "theme": "Psychomotoryka", "reverseScored": false },
    { "order": 9, "theme": "Myśli samouszkadzające", "reverseScored": false }
  ]
}
```

### Pseudokod

```ts
const totalScore = answers.reduce((sum, a) => sum + a, 0)

let severity = "minimal"
if (totalScore >= 5 && totalScore <= 9) severity = "mild"
else if (totalScore >= 10 && totalScore <= 14) severity = "moderate"
else if (totalScore >= 15 && totalScore <= 19) severity = "moderately_severe"
else if (totalScore >= 20) severity = "severe"

const selfHarmRiskFlag = answers[8] > 0
```

---

## 2. GAD-7

### Cel

Przesiewowa ocena nasilenia objawów lęku uogólnionego z ostatnich 2 tygodni. Narzędzie ma 7 pytań, punktowanych 0–3, a wynik całkowity wynosi 0–21. Typowe progi to 5, 10 i 15. ([phqscreeners.com][1])

### Zakres czasu

`Oceń, jak często w ciągu ostatnich 2 tygodni występowały u Ciebie poniższe trudności.`

### Odpowiedzi do zaznaczenia

Dla każdego pytania:

* `0` — wcale
* `1` — kilka dni
* `2` — więcej niż połowę dni
* `3` — niemal codziennie ([phqscreeners.com][1])

### Struktura pytań

1. **Nerwowość, niepokój, napięcie**
2. **Trudność z powstrzymaniem zamartwiania się**
3. **Nadmierne martwienie się różnymi sprawami**
4. **Trudności z relaksem**
5. **Niepokój ruchowy / trudność usiedzenia w miejscu**
6. **Rozdrażnienie**
7. **Poczucie, że może wydarzyć się coś złego**

### Liczenie wyniku

`rawScore = suma odpowiedzi z 7 pytań`

Zakres:

* minimum `0`
* maksimum `21` ([phqscreeners.com][1])

### Interpretacja

* `0–4` — minimalny poziom lęku
* `5–9` — łagodny
* `10–14` — umiarkowany
* `15–21` — wysoki / ciężki ([phqscreeners.com][1])

### Dodatkowa flaga

* jeśli `rawScore >= 10` → `needsFurtherEvaluation = true`

### Struktura JSON

```json
{
  "code": "GAD7",
  "name": "GAD-7",
  "timeframe": "Ostatnie 2 tygodnie",
  "questionCount": 7,
  "answerScale": [
    { "value": 0, "label": "Wcale" },
    { "value": 1, "label": "Kilka dni" },
    { "value": 2, "label": "Więcej niż połowę dni" },
    { "value": 3, "label": "Niemal codziennie" }
  ],
  "questions": [
    { "order": 1, "theme": "Napięcie", "reverseScored": false },
    { "order": 2, "theme": "Brak kontroli nad zamartwianiem", "reverseScored": false },
    { "order": 3, "theme": "Nadmierne martwienie się", "reverseScored": false },
    { "order": 4, "theme": "Relaks", "reverseScored": false },
    { "order": 5, "theme": "Niepokój ruchowy", "reverseScored": false },
    { "order": 6, "theme": "Drażliwość", "reverseScored": false },
    { "order": 7, "theme": "Obawa przed czymś złym", "reverseScored": false }
  ]
}
```

### Pseudokod

```ts
const totalScore = answers.reduce((sum, a) => sum + a, 0)

let severity = "minimal"
if (totalScore >= 5 && totalScore <= 9) severity = "mild"
else if (totalScore >= 10 && totalScore <= 14) severity = "moderate"
else if (totalScore >= 15) severity = "severe"

const needsFurtherEvaluation = totalScore >= 10
```

---

## 3. PSS-10

### Cel

Ocena subiektywnie postrzeganego stresu w ostatnim miesiącu. PSS-10 mierzy, w jakim stopniu osoba ocenia swoje życie jako nieprzewidywalne, niekontrolowane i przeciążające. Ma 10 pozycji, każda oceniana 0–4, a 4 pozycje są odwracane przy liczeniu. ([UCTV Podcasts][2])

### Zakres czasu

`Oceń, jak często w ciągu ostatniego miesiąca występowały u Ciebie poniższe odczucia i myśli.`

### Odpowiedzi do zaznaczenia

* `0` — nigdy
* `1` — prawie nigdy
* `2` — czasem
* `3` — dość często
* `4` — bardzo często ([UCTV Podcasts][2])

### Struktura pytań

Pytania można modelować tak:

1. **Zdenerwowanie z powodu czegoś niespodziewanego**
2. **Poczucie braku kontroli nad ważnymi sprawami**
3. **Napięcie i stres**
4. **Pewność, że poradzisz sobie z problemami osobistymi**
5. **Poczucie, że sprawy układają się po Twojej myśli**
6. **Poczucie przeciążenia obowiązkami**
7. **Kontrola nad rozdrażnieniem**
8. **Poczucie, że wszystko idzie dobrze**
9. **Złość z powodu braku wpływu**
10. **Poczucie, że trudności Cię przerastają**

### Pozycje odwracane

Oficjalnie odwracane są:

* `4`
* `5`
* `7`
* `8` ([UCTV Podcasts][2])

### Liczenie wyniku

1. Najpierw odwrócić pozycje 4, 5, 7, 8:

   * `0 -> 4`
   * `1 -> 3`
   * `2 -> 2`
   * `3 -> 1`
   * `4 -> 0`
2. Następnie zsumować wszystkie 10 odpowiedzi.

Zakres:

* minimum `0`
* maksimum `40` ([UCTV Podcasts][2])

### Interpretacja

Często stosowany praktyczny podział:

* `0–13` — niski poziom stresu
* `14–26` — umiarkowany
* `27–40` — wysoki ([Das][3])

### Struktura JSON

```json
{
  "code": "PSS10",
  "name": "PSS-10",
  "timeframe": "Ostatni miesiąc",
  "questionCount": 10,
  "answerScale": [
    { "value": 0, "label": "Nigdy" },
    { "value": 1, "label": "Prawie nigdy" },
    { "value": 2, "label": "Czasem" },
    { "value": 3, "label": "Dość często" },
    { "value": 4, "label": "Bardzo często" }
  ],
  "questions": [
    { "order": 1, "theme": "Nieprzewidywalność", "reverseScored": false },
    { "order": 2, "theme": "Brak kontroli", "reverseScored": false },
    { "order": 3, "theme": "Napięcie", "reverseScored": false },
    { "order": 4, "theme": "Radzenie sobie", "reverseScored": true },
    { "order": 5, "theme": "Poczucie wpływu", "reverseScored": true },
    { "order": 6, "theme": "Przeciążenie", "reverseScored": false },
    { "order": 7, "theme": "Kontrola emocji", "reverseScored": true },
    { "order": 8, "theme": "Sprawy idą dobrze", "reverseScored": true },
    { "order": 9, "theme": "Bezsilność", "reverseScored": false },
    { "order": 10, "theme": "Przytłoczenie trudnościami", "reverseScored": false }
  ]
}
```

### Pseudokod

```ts
const reverseItems = [4, 5, 7, 8]

const totalScore = answers.reduce((sum, answer, index) => {
  const item = index + 1
  const normalized = reverseItems.includes(item) ? 4 - answer : answer
  return sum + normalized
}, 0)

let severity = "low"
if (totalScore >= 14 && totalScore <= 26) severity = "moderate"
else if (totalScore >= 27) severity = "high"
```

### Ważna uwaga

W dokumentacji projektu zapisz, że pełna, oficjalna treść pytań PSS-10 powinna być używana zgodnie z warunkami licencyjnymi właściwymi dla wdrożenia. Sama logika punktacji i struktura testu są jasno określone w źródłach. ([Scribd][4])

---

## 4. WHO-5

### Cel

Ocena subiektywnego dobrostanu psychicznego. WHO-5 ma 5 pozycji odnoszących się do ostatnich 2 tygodni. Każda pozycja jest oceniana w 6-stopniowej skali, a wyższy wynik oznacza lepszy dobrostan. Wynik surowy 0–25 przelicza się na skalę 0–100 przez pomnożenie przez 4. Wynik poniżej 50 sugeruje obniżony dobrostan. ([Światowa Organizacja Zdrowia][5])

### Zakres czasu

`Oceń, jak czułeś/czułaś się w ciągu ostatnich 2 tygodni.`

### Odpowiedzi do zaznaczenia

* `5` — przez cały czas
* `4` — przez większość czasu
* `3` — przez więcej niż połowę czasu
* `2` — przez mniej niż połowę czasu
* `1` — od czasu do czasu
* `0` — nigdy / wcale ([Światowa Organizacja Zdrowia][5])

### Struktura pytań

1. **Czułem(am) się pogodnie i w dobrym nastroju**
2. **Czułem(am) się spokojnie i zrelaksowanie**
3. **Czułem(am) się aktywnie i energicznie**
4. **Budziłem(am) się wypoczęty(a)**
5. **Moje codzienne życie było wypełnione interesującymi mnie rzeczami**

To akurat można bezpiecznie traktować jako strukturę pozytywnych stwierdzeń WHO-5, bo oficjalne źródła WHO opisują ten instrument właśnie jako 5 stwierdzeń dotyczących dobrostanu. ([Światowa Organizacja Zdrowia][5])

### Liczenie wyniku

* `rawScore = suma 5 odpowiedzi`
* zakres `0–25`
* `normalizedScore = rawScore * 4`
* zakres końcowy `0–100` ([cdn.who.int][6])

### Interpretacja

* wyższy wynik = lepszy dobrostan
* `normalizedScore < 50` lub `rawScore < 13` → obniżony dobrostan, wskazanie do dalszej oceny
* bardzo niski wynik może być oznaczony jako `criticalLowWellbeing` ([cdn.who.int][6])

### Struktura JSON

```json
{
  "code": "WHO5",
  "name": "WHO-5 Well-Being Index",
  "timeframe": "Ostatnie 2 tygodnie",
  "questionCount": 5,
  "answerScale": [
    { "value": 5, "label": "Przez cały czas" },
    { "value": 4, "label": "Przez większość czasu" },
    { "value": 3, "label": "Przez więcej niż połowę czasu" },
    { "value": 2, "label": "Przez mniej niż połowę czasu" },
    { "value": 1, "label": "Od czasu do czasu" },
    { "value": 0, "label": "Nigdy" }
  ],
  "questions": [
    { "order": 1, "theme": "Pozytywny nastrój", "reverseScored": false },
    { "order": 2, "theme": "Spokój", "reverseScored": false },
    { "order": 3, "theme": "Energia", "reverseScored": false },
    { "order": 4, "theme": "Wypoczynek", "reverseScored": false },
    { "order": 5, "theme": "Zaangażowanie w życie", "reverseScored": false }
  ]
}
```

### Pseudokod

```ts
const rawScore = answers.reduce((sum, a) => sum + a, 0)
const normalizedScore = rawScore * 4

const poorWellbeingFlag = rawScore < 13
```

---

## 5. Skala Nastroju Ogólnego / skala nastroju 1–5

Na podstawie Twojego screena to wygląda na polską skalę nastroju opartą o stwierdzenia oceniane w skali 1–5. Tu szczególnie zalecam **nie wpisywać do repo pełnej, dosłownej treści wszystkich pytań bez sprawdzenia praw do wykorzystania**. Do implementacji i dokumentacji możesz jednak opisać strukturę techniczną.

### Cel

Krótka ocena aktualnego nastroju ogólnego, łącząca stwierdzenia pozytywne i negatywne.

### Odpowiedzi do zaznaczenia

* `1` — nie zgadzam się
* `2` — raczej się nie zgadzam
* `3` — trochę tak, trochę nie
* `4` — raczej się zgadzam
* `5` — zgadzam się

### Struktura pytań

Z tego, co widać na screenie, pytania obejmują obszary:

1. zły humor
2. świetne samopoczucie
3. zły nastrój
4. rozluźnienie i spokój
5. szarość / beznadziejność
6. dobry humor
7. pogoda ducha
8. przygnębienie
9. złe samopoczucie
10. dobre samopoczucie

### Pozycje odwracane

W praktyce:

* pozycje negatywne zwykle liczy się odwrotnie, jeśli chcesz mieć jeden wynik, gdzie więcej = lepszy nastrój
* pozycje pozytywne liczysz normalnie

Proponowany model:

* negatywne: `1, 3, 5, 8, 9`
* pozytywne: `2, 4, 6, 7, 10`

### Liczenie

Opcja 1:

* odwrócić pozycje negatywne według `1↔5, 2↔4, 3↔3`
* zsumować wszystkie 10 odpowiedzi

Opcja 2:

* policzyć osobno `positiveMoodScore`
* policzyć osobno `negativeMoodScore`
* wyliczyć indeks ogólny

### Struktura JSON

```json
{
  "code": "MOOD10",
  "name": "Skala nastroju ogólnego",
  "timeframe": "Aktualny stan / ostatnie dni",
  "questionCount": 10,
  "answerScale": [
    { "value": 1, "label": "Nie zgadzam się" },
    { "value": 2, "label": "Raczej się nie zgadzam" },
    { "value": 3, "label": "Trochę tak, trochę nie" },
    { "value": 4, "label": "Raczej się zgadzam" },
    { "value": 5, "label": "Zgadzam się" }
  ],
  "questions": [
    { "order": 1, "theme": "Zły humor", "reverseScored": true },
    { "order": 2, "theme": "Świetne samopoczucie", "reverseScored": false },
    { "order": 3, "theme": "Zły nastrój", "reverseScored": true },
    { "order": 4, "theme": "Spokój", "reverseScored": false },
    { "order": 5, "theme": "Beznadziejność", "reverseScored": true },
    { "order": 6, "theme": "Dobry humor", "reverseScored": false },
    { "order": 7, "theme": "Pogoda ducha", "reverseScored": false },
    { "order": 8, "theme": "Przygnębienie", "reverseScored": true },
    { "order": 9, "theme": "Złe samopoczucie", "reverseScored": true },
    { "order": 10, "theme": "Dobre samopoczucie", "reverseScored": false }
  ]
}
```

---

## 6. Mood meter / szybki check-in nastroju z emotikonami

To nie jest klasyczny standaryzowany test psychometryczny jak PHQ-9 czy GAD-7, tylko prosty wskaźnik codziennego samopoczucia. W aplikacji jest bardzo przydatny jako szybki check-in.

### Cel

Błyskawiczny codzienny pomiar nastroju.

### Odpowiedzi do zaznaczenia

Najprostsza wersja 5-stopniowa:

* `5` — bardzo dobrze
* `4` — dobrze
* `3` — neutralnie
* `2` — słabo
* `1` — bardzo źle

Możesz też użyć etykiet:

* `VERY_GOOD`
* `GOOD`
* `NEUTRAL`
* `BAD`
* `VERY_BAD`

### Struktura

Jedno pytanie:

* `Jak się dzisiaj czujesz?`

Opcjonalne pole:

* komentarz tekstowy
* tagi: sen, stres, praca, relacje, zdrowie

### Liczenie

Tu nie liczysz wyniku klinicznego. Zapisujesz:

* wartość 1–5
* datę
* opcjonalny komentarz

Potem liczysz trendy:

* średnia 7 dni
* średnia 30 dni
* spadek tydzień do tygodnia
* liczba dni z nastrojem `1` lub `2`

### Struktura JSON

```json
{
  "code": "DAILY_MOOD",
  "name": "Daily mood check-in",
  "timeframe": "Dzisiaj",
  "questionCount": 1,
  "answerScale": [
    { "value": 5, "label": "Bardzo dobrze" },
    { "value": 4, "label": "Dobrze" },
    { "value": 3, "label": "Neutralnie" },
    { "value": 2, "label": "Słabo" },
    { "value": 1, "label": "Bardzo źle" }
  ],
  "questions": [
    { "order": 1, "theme": "Ogólny nastrój dnia", "reverseScored": false }
  ]
}
```

---

# Reguły implementacyjne dla Claude / programisty

## 1. Każdy test ma wspólny model

Claude powinien tworzyć testy w oparciu o wspólny schemat:

* metadata testu
* lista pytań
* skala odpowiedzi
* logika scoringu
* progi interpretacji
* flagi ryzyka
* historia wyników

## 2. Frontend

Każdy test powinien mieć:

* nagłówek z nazwą testu
* opis zakresu czasu
* listę pytań
* identyczny komponent odpowiedzi dla wszystkich pozycji danego testu
* walidację pełnego uzupełnienia
* ekran wyniku po wysłaniu

## 3. Backend

Backend powinien:

* przyjąć odpowiedzi jako liczby
* walidować kompletność
* obliczyć wynik na serwerze
* przypisać poziom nasilenia
* zapisać odpowiedzi i wynik
* zwrócić tylko bezpieczną interpretację

## 4. Panel HR

Do panelu HR nie wysyłać surowych odpowiedzi jednostkowych.
Pokazywać wyłącznie:

* średnie wyniki
* trendy
* odsetki w przedziałach
* dane zagregowane dla grup powyżej ustalonego minimum

## 5. Ważna zasada prawna i produktowa

W dokumentacji MoodMaster zapisz:

* system wykorzystuje testy przesiewowe i wskaźniki dobrostanu,
* nie stawia diagnozy klinicznej,
* pełne, oficjalne treści niektórych skal muszą być używane zgodnie z warunkami licencyjnymi danego narzędzia. ([phqscreeners.com][1])

