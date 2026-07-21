#!/usr/bin/env python3
"""4.7. Moduły testów psychologicznych — PHQ-9, GAD-7, PSS-10, WHO-5 — DOCX zgodny z formatem CDV."""

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def set_run(run, *, bold=False, italic=False, size=10, font='Verdana', mono=False):
    name = 'Consolas' if mono else font
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)
    rFonts.set(qn('w:cs'), name)


def add_paragraph(doc, runs, *, indent_first=True, justify=True, space_after=8):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(0)
    pf.space_after = Pt(space_after)
    if indent_first:
        pf.first_line_indent = Cm(0.6)
    if justify:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    for text, *style in runs:
        bold = 'b' in style
        italic = 'i' in style
        mono = 'm' in style
        r = p.add_run(text)
        set_run(r, bold=bold, italic=italic, mono=mono)
    return p


def add_heading(doc, text, *, size=11, level=2):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8 if level == 2 else 6)
    pf.space_after = Pt(8 if level == 2 else 4)
    r = p.add_run(text)
    set_run(r, bold=True, size=size)


def add_listing(doc, *, listing_no, title, file_path, lines, comment):
    box = doc.add_paragraph()
    box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = box.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(2)
    r = box.add_run(f'[ TUTAJ WSTAW ZRZUT EKRANU KODU — Listing {listing_no} ]')
    set_run(r, bold=True, italic=True)

    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = info.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(0)
    pf.space_after = Pt(2)
    r1 = info.add_run('Plik: ')
    set_run(r1)
    r2 = info.add_run(file_path)
    set_run(r2, mono=True)
    r3 = info.add_run(f'   Linie: {lines}')
    set_run(r3)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = cap.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(2)
    pf.space_after = Pt(8)
    r = cap.add_run(f'Listing {listing_no}. {title}')
    set_run(r, italic=True)

    if comment:
        add_paragraph(doc, [(comment,)])


def main():
    doc = Document()

    style = doc.styles['Normal']
    style.font.name = 'Verdana'
    style.font.size = Pt(10)

    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.0)

    add_heading(doc, '4.7. Moduły testów psychologicznych — implementacja kwestionariuszy walidowanych klinicznie', size=12)

    add_paragraph(doc, [
        ('Sercem platformy MoodFlow jest moduł testów psychologicznych, w którym zaimplementowano sześć kwestionariuszy do oceny dobrostanu pracowników. Cztery z nich to ', ),
        ('walidowane narzędzia kliniczne', 'b'),
        (' o ugruntowanej pozycji w psychologii i psychiatrii: ', ),
        ('PHQ-9', 'b'),
        (' (Patient Health Questionnaire — przesiewowa ocena nasilenia objawów depresyjnych), ', ),
        ('GAD-7', 'b'),
        (' (Generalized Anxiety Disorder — przesiewowa ocena lęku uogólnionego), ', ),
        ('PSS-10', 'b'),
        (' (Perceived Stress Scale — postrzegany poziom stresu), ', ),
        ('WHO-5', 'b'),
        (' (WHO Wellbeing Index — wskaźnik subiektywnego dobrostanu psychicznego). Pozostałe dwa kwestionariusze — ', ),
        ('MOOD10', 'i'),
        (' i ', ),
        ('DAILY_MOOD', 'i'),
        (' — zostały opracowane na potrzeby projektu jako narzędzia uzupełniające: pierwszy do tygodniowej oceny ogólnego nastroju, drugi do codziennego, jednopytaniowego sprawdzenia samopoczucia.', ),
    ])

    add_paragraph(doc, [
        ('Wybór tych konkretnych narzędzi nie jest przypadkowy. PHQ-9 i GAD-7 są najczęściej cytowanymi w literaturze przesiewowymi kwestionariuszami w obszarze zdrowia psychicznego, dostępnymi na licencji wolnego użytku i powszechnie stosowanymi w badaniach populacyjnych. PSS-10 dostarcza kontekstu stresu zawodowego, a WHO-5 — pozytywnej miary dobrostanu, równoważącej diagnostyczny charakter pozostałych testów. Należy podkreślić — i jest to wymóg etyczny zapisany w regule 34 dokumentu projektowego — że MoodFlow ', ),
        ('nie pełni roli narzędzia diagnostycznego', 'b'),
        (', a jedynie narzędzia monitorującego i przesiewowego. Wynik kwestionariusza nie zastępuje konsultacji ze specjalistą i jest prezentowany pracownikowi wraz z odpowiednim zastrzeżeniem.', ),
    ])

    add_heading(doc, 'Model danych testu psychologicznego', level=3)

    add_paragraph(doc, [
        ('Każdy test psychologiczny w bazie danych jest reprezentowany przez trzy powiązane encje: ', ),
        ('Assessment', 'm'),
        (' (definicja testu jako całości), ', ),
        ('Question', 'm'),
        (' (pojedyncze pytanie wchodzące w skład testu) oraz ', ),
        ('AnswerOption', 'm'),
        (' (możliwa odpowiedź na pytanie z przypisaną wartością liczbową). Encja ', ),
        ('Assessment', 'm'),
        (' przechowuje metadane kwestionariusza: unikalny kod (np. ', ),
        ('PHQ9', 'm'),
        (', ', ),
        ('GAD7', 'm'),
        ('), nazwę wyświetlaną, opis, ramy czasowe pytań (np. „Ostatnie 2 tygodnie"), liczbę pytań, wersję, status aktywności, flagę anonimizacji wyników dla działu HR oraz flagę wymagania kompletu odpowiedzi. Dwa ostatnie pola są kluczowe: ', ),
        ('isAnonymousForHR', 'm'),
        (' decyduje, czy wyniki tego testu są dostępne dla HR wyłącznie w postaci zagregowanej, a ', ),
        ('requiresAllAnswers', 'm'),
        (' wymusza walidację kompletności podczas obliczania wyniku.', ),
    ])

    add_listing(
        doc,
        listing_no='4.32',
        title='Encja Assessment — definicja kwestionariusza psychologicznego',
        file_path='backend-api/src/modules/assessments/entities/assessment.entity.ts',
        lines='1–51',
        comment=(
            'Listing 4.32 prezentuje encję Assessment. Relacje OneToMany do '
            'encji Question i AnswerOption z opcją cascade umożliwiają zapisanie '
            'kompletnego testu wraz z pytaniami i opcjami w pojedynczej '
            'transakcji. Pole code jest unikalne, ponieważ stanowi klucz '
            'wykorzystywany przez serwis obliczający wyniki do wyboru '
            'odpowiedniego algorytmu scoring.'
        ),
    )

    add_heading(doc, 'Definicje testów — mechanizm seed', level=3)

    add_paragraph(doc, [
        ('Treść wszystkich kwestionariuszy jest umieszczona w pliku ', ),
        ('seed/assessments.seed.ts', 'm'),
        (', który podczas pierwszego uruchomienia aplikacji ładuje definicje do bazy danych. Każda definicja zawiera kod testu, nazwę, opis, ramy czasowe, listę pytań (wraz z porządkiem, tematem domenowym i ewentualną flagą ', ),
        ('reverseScored', 'm'),
        (' dla pytań odwróconych) oraz listę opcji odpowiedzi z przypisanymi wartościami liczbowymi. Ulokowanie definicji w kodzie źródłowym, a nie w panelu administracyjnym, jest świadomą decyzją projektową: treść standardowych testów psychologicznych jest ustabilizowana przez literaturę i nie powinna podlegać dowolnej modyfikacji przez administratora firmy. Każda zmiana w treści wymaga przejścia przez proces przeglądu kodu i merytorycznej oceny, co zapobiega przypadkowemu naruszeniu właściwości psychometrycznych narzędzia.', ),
    ])

    add_listing(
        doc,
        listing_no='4.33',
        title='Definicja kwestionariusza PHQ-9 w pliku seed',
        file_path='backend-api/src/seed/assessments.seed.ts',
        lines='6–31',
        comment=(
            'Listing 4.33 pokazuje pełną definicję testu PHQ-9. Dziewięć pytań '
            'odpowiada dziewięciu kryteriom diagnostycznym dużego epizodu '
            'depresji wg DSM-5. Cztery opcje odpowiedzi z wartościami 0–3 '
            'odpowiadają częstotliwości występowania objawu w ostatnich dwóch '
            'tygodniach. Pytanie dziewiąte jest oznaczone tematem „Myśli '
            'samouszkadzające" i pełni rolę krytyczną — niezerowa odpowiedź '
            'aktywuje flagę ryzyka samookaleczenia, omówioną w dalszej części '
            'rozdziału.'
        ),
    )

    add_heading(doc, 'Przyjmowanie odpowiedzi i walidacja przed obliczeniem wyniku', level=3)

    add_paragraph(doc, [
        ('Przesłanie odpowiedzi przez pracownika obsługuje endpoint ', ),
        ('POST /responses', 'm'),
        (' przyjmujący obiekt ', ),
        ('SubmitResponsesDto', 'm'),
        (' zawierający identyfikator testu, identyfikator przypisania oraz tablicę odpowiedzi (par ', ),
        ('questionId → value', 'm'),
        ('). Logikę realizuje metoda ', ),
        ('submit', 'm'),
        (' w klasie ', ),
        ('ResponsesService', 'm'),
        (', która przed zapisaniem wyniku wykonuje ', ),
        ('osiem niezależnych etapów walidacji', 'b'),
        (': sprawdzenie istnienia przypisania, zgodności identyfikatora testu z przypisaniem, otwarcia okna czasowego (', ),
        ('availableFrom', 'm'),
        (' ≤ teraz ≤ ', ),
        ('availableTo', 'm'),
        ('), izolacji organizacyjnej (test musi należeć do tej samej firmy co użytkownik), uprawnienia do tego konkretnego przypisania (typ docelowy ', ),
        ('ALL', 'i'),
        (', ', ),
        ('USER', 'i'),
        (' lub ', ),
        ('DEPARTMENT', 'i'),
        (' z dopasowaniem do profilu użytkownika), braku wcześniejszego wypełnienia tego przypisania oraz załadowania definicji testu. Dopiero po pozytywnym przejściu wszystkich etapów następuje wywołanie serwisu obliczającego wynik i zapisanie rekordu w tabeli ', ),
        ('assessment_results', 'm'),
        ('.', ),
    ])

    add_paragraph(doc, [
        ('Każda z walidacji wymusza zwrócenie konkretnego wyjątku HTTP: ', ),
        ('NotFoundException', 'm'),
        (' (404) gdy obiekt nie istnieje, ', ),
        ('BadRequestException', 'm'),
        (' (400) przy błędnych danych wejściowych, ', ),
        ('ForbiddenException', 'm'),
        (' (403) przy próbie naruszenia uprawnień. Komunikaty błędów są w języku polskim i bezpośrednio prezentowane w interfejsie pracownika, dzięki czemu nawet w przypadku awarii synchronizacji okna czasowego między urządzeniami użytkownik otrzymuje czytelne wyjaśnienie sytuacji.', ),
    ])

    add_listing(
        doc,
        listing_no='4.34',
        title='Pełna ścieżka walidacji i zapisu odpowiedzi w serwisie ResponsesService',
        file_path='backend-api/src/modules/responses/responses.service.ts',
        lines='31–114',
        comment=(
            'Listing 4.34 prezentuje metodę submit. Numerowane komentarze '
            'w kodzie odpowiadają kolejnym etapom walidacji. Po wyliczeniu '
            'wyniku przez ScoringService tworzony jest rekord AssessmentResult '
            'oraz tablica obiektów UserResponse — po jednym rekordzie na '
            'odpowiedź. Pole answersSnapshot zachowuje pełen kontekst odpowiedzi '
            '(wartość, identyfikator pytania, temat domenowy) jako migawkę JSON, '
            'co umożliwia odtworzenie wyniku nawet jeśli definicja testu uległa '
            'zmianie w przyszłości.'
        ),
    )

    add_heading(doc, 'Algorytm obliczania wyniku — strategia per kod testu', level=3)

    add_paragraph(doc, [
        ('Centralnym elementem domeny psychometrycznej jest klasa ', ),
        ('ScoringService', 'm'),
        (' z metodą ', ),
        ('compute', 'm'),
        (' realizującą wzorzec ', ),
        ('strategii', 'b'),
        (' wybieranej na podstawie kodu kwestionariusza. Wewnątrz metody znajduje się instrukcja ', ),
        ('switch', 'm'),
        (' delegująca obliczenia do prywatnej metody specyficznej dla danego testu (', ),
        ('scorePHQ9', 'm'),
        (', ', ),
        ('scoreGAD7', 'm'),
        (', ', ),
        ('scorePSS10', 'm'),
        (', ', ),
        ('scoreWHO5', 'm'),
        (', ', ),
        ('scoreMOOD10', 'm'),
        (', ', ),
        ('scoreDailyMood', 'm'),
        ('). Każda metoda zwraca strukturę ', ),
        ('ScoringResult', 'm'),
        (' zawierającą cztery pola: ', ),
        ('rawScore', 'm'),
        (' (surowy wynik testu), ', ),
        ('normalizedScore', 'm'),
        (' (wynik znormalizowany do skali 0–100, jeśli test tego wymaga), ', ),
        ('severity', 'm'),
        (' (stopień nasilenia jako etykieta tekstowa) oraz ', ),
        ('riskFlags', 'm'),
        (' (mapa flag ryzyka, wykrywanych podczas analizy odpowiedzi).', ),
    ])

    add_paragraph(doc, [
        ('Najbardziej krytyczna jest metoda ', ),
        ('scorePHQ9', 'm'),
        ('. Po zsumowaniu odpowiedzi (zakres 0–27) wybierany jest stopień nasilenia depresji według progów uznanych w literaturze klinicznej: ', ),
        ('minimal', 'i'),
        (' (0–4), ', ),
        ('mild', 'i'),
        (' (5–9), ', ),
        ('moderate', 'i'),
        (' (10–14), ', ),
        ('moderately_severe', 'i'),
        (' (15–19), ', ),
        ('severe', 'i'),
        (' (≥20). Niezależnie od ogólnego wyniku, niezerowa odpowiedź na pytanie dziewiąte (myśli samouszkadzające) ustawia flagę ', ),
        ('selfHarmRiskFlag', 'b'),
        (' w polu ', ),
        ('riskFlags', 'm'),
        ('. Frontend pracownika reaguje na tę flagę wyświetleniem odrębnego komunikatu z numerami telefonów zaufania, a panel HR generuje cichy alert dla działu kadr — wszystko z zachowaniem zasady, że konkretna osoba nie zostaje zidentyfikowana w raporcie zbiorczym.', ),
    ])

    add_listing(
        doc,
        listing_no='4.35',
        title='Strategia obliczania wyniku w ScoringService z implementacją PHQ-9',
        file_path='backend-api/src/modules/results/scoring/scoring.service.ts',
        lines='14–52',
        comment=(
            'Listing 4.35 zawiera metodę compute z dyspozytorem opartym na '
            'kodzie testu oraz pełną implementację scorePHQ9. Walidacja kompletu '
            'odpowiedzi (linie 17–21) jest wspólna dla wszystkich strategii. '
            'Wykrycie pytania dziewiątego po polu order — a nie po identyfikatorze '
            '— zapewnia poprawność nawet jeśli baza zostanie zaseedowana w innej '
            'kolejności, co stanowi przykład defensywnego programowania.'
        ),
    )

    add_heading(doc, 'Pytania odwracane i normalizacja skali — PSS-10 oraz WHO-5', level=3)

    add_paragraph(doc, [
        ('Dwa kwestionariusze wymagają nietrywialnej obróbki odpowiedzi. ', ),
        ('PSS-10', 'b'),
        (' zawiera pytania odwracane (', ),
        ('reverseScored', 'm'),
        ('): część pytań mierzy stres bezpośrednio (np. „jak często czułeś się zdenerwowany"), a część — przeciwnie, mierzy zasoby radzenia sobie ze stresem (np. „jak często czułeś, że panujesz nad sytuacją"). Aby uzyskać spójny wynik, w którym wyższa wartość zawsze oznacza wyższy stres, odpowiedzi na pytania odwracane są transformowane wzorem ', ),
        ('4 − wartość', 'b'),
        (' przed sumowaniem (skala odpowiedzi w PSS-10 to 0–4). Algorytm jest zaimplementowany w metodzie ', ),
        ('scorePSS10', 'm'),
        (' poprzez funkcję ', ),
        ('reduce', 'm'),
        (' z warunkową transformacją per pytanie.', ),
    ])

    add_paragraph(doc, [
        ('Z kolei ', ),
        ('WHO-5', 'b'),
        (' wymaga ', ),
        ('normalizacji skali', 'b'),
        (' — surowy wynik (zakres 0–25) jest mnożony przez cztery, aby uzyskać znormalizowany wskaźnik dobrostanu w skali 0–100, co jest kanonicznym sposobem prezentacji wyniku tego narzędzia. Wynik poniżej 50 oznacza obniżony dobrostan, wynik poniżej 13 punktów surowych dodatkowo aktywuje flagę ', ),
        ('poorWellbeingFlag', 'm'),
        (' sugerującą wskazanie do konsultacji ze specjalistą. Identyczny mechanizm flag ostrzegawczych dotyczy GAD-7 (', ),
        ('needsFurtherEvaluation', 'm'),
        (' przy wyniku ≥10) — w obu przypadkach flaga jest interpretowana jedynie jako sygnał alarmowy, a nie diagnoza.', ),
    ])

    add_listing(
        doc,
        listing_no='4.36',
        title='Strategie scorePSS10 i scoreWHO5 — pytania odwracane i normalizacja skali',
        file_path='backend-api/src/modules/results/scoring/scoring.service.ts',
        lines='66–87',
        comment=(
            'Listing 4.36 prezentuje dwie najistotniejsze metody pod względem '
            'algorytmicznym. scorePSS10 obsługuje pytania reverseScored '
            'jednolitym wzorem 4 − wartość, dzięki czemu skala wyniku '
            'pozostaje monotoniczna. scoreWHO5 przekształca surowy wynik 0–25 '
            'na znormalizowaną skalę 0–100 przez mnożenie przez 4 — '
            'standardowy zabieg dla tego narzędzia.'
        ),
    )

    add_heading(doc, 'Trwałe zapisanie wyniku z migawką odpowiedzi', level=3)

    add_paragraph(doc, [
        ('Wynik testu jest zapisywany w tabeli ', ),
        ('assessment_results', 'm'),
        (' w postaci pełnego rekordu wraz z migawką odpowiedzi. Encja ', ),
        ('AssessmentResult', 'm'),
        (' zawiera identyfikator użytkownika, identyfikator przypisania (z ograniczeniem unikalności pary ', ),
        ('userId + assignmentId', 'm'),
        (' uniemożliwiającym dwukrotne wypełnienie tego samego przypisania), identyfikator testu, surowy wynik, znormalizowany wynik, etykietę nasilenia, mapę flag ryzyka oraz ', ),
        ('migawkę odpowiedzi', 'b'),
        (' (', ),
        ('answersSnapshot', 'm'),
        (') w polu typu JSON. Migawka przechowuje wartości odpowiedzi wraz z tematami domenowymi pytań, dzięki czemu wynik historyczny może być poprawnie zinterpretowany nawet po zmianie definicji testu lub usunięciu pytania. Jest to praktyczna realizacja zasady ', ),
        ('immutable audit trail', 'i'),
        (' — wynik raz zapisany nie jest zależny od stanu definicji w przyszłości.', ),
    ])

    add_listing(
        doc,
        listing_no='4.37',
        title='Encja AssessmentResult z migawką odpowiedzi i flagami ryzyka',
        file_path='backend-api/src/modules/results/entities/assessment-result.entity.ts',
        lines='1–48',
        comment=(
            'Listing 4.37 pokazuje encję AssessmentResult. Ograniczenie '
            'Unique([userId, assignmentId]) wymusza na poziomie bazy danych '
            'unikalność wypełnienia pojedynczego przypisania przez użytkownika '
            '— stanowi to drugą linię obrony przed duplikatami, niezależną od '
            'kontroli aplikacyjnej. Pola riskFlags i answersSnapshot mają typ '
            'JSON, co umożliwia elastyczne przechowywanie danych o różnej '
            'strukturze dla różnych typów testów.'
        ),
    )

    add_heading(doc, 'Podsumowanie modułu psychometrycznego', level=3)

    add_paragraph(doc, [
        ('Moduł testów psychologicznych w MoodFlow łączy klinicznie walidowane narzędzia (PHQ-9, GAD-7, PSS-10, WHO-5) z prostą, ale kompletną implementacją techniczną. Definicje testów są umieszczone w kodzie źródłowym w postaci pliku seed, co zabezpiecza ich integralność psychometryczną. Przyjmowanie odpowiedzi przechodzi przez ośmioetapową walidację obejmującą izolację multi-tenant, okno czasowe, uprawnienia per typ przypisania i zapobieganie duplikatom. Algorytm obliczania wyników wykorzystuje wzorzec strategii wybieranej po kodzie testu, a każda strategia hermetyzuje progi nasilenia, transformacje pytań odwracanych, normalizację skali oraz wykrywanie flag ryzyka. Najbardziej krytyczna z flag — ', ),
        ('selfHarmRiskFlag', 'm'),
        (' aktywowana niezerową odpowiedzią na dziewiąte pytanie PHQ-9 — uruchamia odrębną ścieżkę reakcji w interfejsie pracownika oraz cichy alert w panelu HR, z zachowaniem anonimizacji identyfikatora osoby w widokach zbiorczych. Wynik testu jest zapisywany w postaci niezmiennej migawki, co umożliwia rzetelną interpretację historyczną nawet po zmianie definicji testu w przyszłości.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.7-Moduly-testow-psychologicznych.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
