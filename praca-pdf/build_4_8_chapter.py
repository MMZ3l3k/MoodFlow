#!/usr/bin/env python3
"""4.8. Anonimizacja danych i raporty HR — k-anonymity, agregacje — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '4.8. Anonimizacja danych i raporty HR — agregacja i k-anonymity', size=12)

    add_paragraph(doc, [
        ('System MoodFlow operuje na danych wrażliwych dotyczących dobrostanu psychicznego pracowników. Z tego powodu projekt od samego początku zakłada, że ', ),
        ('panel HR nigdy nie prezentuje wyników indywidualnych', 'b'),
        (' — wszystkie dane analityczne dostępne dla działu kadr są agregowane i poddane mechanizmom anonimizacji uniemożliwiającym identyfikację konkretnej osoby. Założenie to wynika zarówno z dobrych praktyk inżynierii bezpieczeństwa danych, jak i z zasad zapisanych w wewnętrznym dokumencie projektowym ', ),
        ('RULES.md', 'm'),
        (' (punkt 12: „dane HR muszą być zagregowane i anonimowe"). Naruszenie tej zasady oznaczałoby utratę zaufania pracowników do platformy oraz potencjalne ryzyko prawne związane z przetwarzaniem danych szczególnej kategorii w rozumieniu RODO.', ),
    ])

    add_paragraph(doc, [
        ('Realizację warstwy anonimizacji oparto na trzech niezależnych filarach: ', ),
        ('kontroli dostępu', 'b'),
        (' (uprawnienia per rola wymuszane na poziomie kontrolera HTTP), ', ),
        ('agregacji statystycznej', 'b'),
        (' (każdy endpoint analityczny zwraca wyłącznie zbiorcze metryki, nigdy listy konkretnych pracowników wraz z wynikami) oraz ', ),
        ('k-anonymity', 'b'),
        (' (maskowania wyników dla grup mniejszych niż próg minimalnej liczebności). Każdy z filarów działa niezależnie, ale dopiero ich łączna obecność realizuje pełen wymóg ochrony danych.', ),
    ])

    add_heading(doc, 'Filar pierwszy — kontrola dostępu rolami', level=3)

    add_paragraph(doc, [
        ('Wszystkie endpointy analityczne są umieszczone pod prefiksem ', ),
        ('/analytics', 'm'),
        (' i chronione dwoma strażnikami: ', ),
        ('JwtAuthGuard', 'm'),
        (' (wymóg posiadania ważnego tokena dostępu) oraz ', ),
        ('RolesGuard', 'm'),
        (' (wymóg posiadania konkretnej roli). Dekorator ', ),
        ('@Roles(Role.HR, Role.ADMIN)', 'm'),
        (' ogranicza dostęp do dwóch ról: pracownika działu kadr oraz administratora firmy. Pracownik o roli ', ),
        ('EMPLOYEE', 'i'),
        (' z ważnym tokenem otrzyma odpowiedź ', ),
        ('403 Forbidden', 'm'),
        (' niezależnie od żądanej ścieżki w obrębie ', ),
        ('/analytics', 'm'),
        ('. Strażnicy są deklarowane na poziomie klasy kontrolera, dzięki czemu obowiązują automatycznie dla wszystkich jedenastu endpointów modułu — nie ma możliwości przypadkowego pominięcia kontroli dla nowo dodanego endpointu.', ),
    ])

    add_listing(
        doc,
        listing_no='4.38',
        title='Kontroler analytics z deklaratywną kontrolą dostępu rolami',
        file_path='backend-api/src/modules/analytics/analytics.controller.ts',
        lines='1–72',
        comment=(
            'Listing 4.38 prezentuje pełen kontroler analytics. Każdy endpoint '
            'pobiera identyfikator organizacji z obiektu request.user '
            '(wstrzykniętego przez JwtAuthGuard z payload tokena JWT) i '
            'przekazuje go do serwisu jako pierwszy argument. Dzięki temu '
            'serwis nie ma dostępu do tożsamości wywołującego — operuje '
            'wyłącznie na identyfikatorze organizacji, którego dane może '
            'agregować. Wzorzec ten realizuje zasadę najmniejszych uprawnień '
            'na poziomie warstwy biznesowej.'
        ),
    )

    add_heading(doc, 'Filar drugi — agregacje SQL i izolacja multi-tenant', level=3)

    add_paragraph(doc, [
        ('Druga warstwa ochrony polega na tym, że żaden endpoint analityczny nie zwraca listy indywidualnych wyników — wszystkie zapytania używają funkcji agregujących SQL (', ),
        ('AVG', 'm'),
        (', ', ),
        ('COUNT', 'm'),
        (', ', ),
        ('COUNT DISTINCT', 'm'),
        (') z klauzulą ', ),
        ('GROUP BY', 'm'),
        (' grupującą dane po działach lub okresach tygodniowych. Każde zapytanie obowiązkowo zawiera filtr ', ),
        ('WHERE u.organizationId = :organizationId', 'm'),
        (' — dane są zawsze ograniczone do organizacji wywołującego, co realizuje izolację multi-tenant opisaną w rozdziale 4.4. Dodatkowo wszystkie agregacje są ograniczone do użytkowników o roli ', ),
        ('EMPLOYEE', 'i'),
        (' i statusie ', ),
        ('ACTIVE', 'i'),
        (', dzięki czemu konta administracyjne, oczekujące i zablokowane nie zniekształcają statystyk.', ),
    ])

    add_paragraph(doc, [
        ('Reprezentatywnym przykładem są agregacje wykonywane przez metodę ', ),
        ('getDepartmentWellbeingLoad', 'm'),
        (' obliczającą zbiorcze obciążenie psychiczne każdego działu. Zapytanie łączy tabelę wyników z tabelami testów i użytkowników, a następnie grupuje wyniki po dziale i kodzie testu, obliczając średni surowy wynik oraz liczbę unikalnych uczestników. Drugie, równoległe zapytanie wykonuje analogiczną agregację dla okresu poprzedniego (sprzed 14 dni) — pozwala to wyznaczyć trend (poprawa, pogorszenie, stabilny). Trzecie zapytanie zlicza całkowitą liczebność każdego działu, co jest niezbędne do późniejszego sprawdzenia progu k-anonymity.', ),
    ])

    add_listing(
        doc,
        listing_no='4.39',
        title='Agregacje SQL dla wskaźnika dobrostanu per dział',
        file_path='backend-api/src/modules/analytics/analytics.service.ts',
        lines='357–408',
        comment=(
            'Listing 4.39 pokazuje trzy zapytania agregujące. Każde z nich '
            'jest filtrowane po organizationId, statusie ACTIVE i roli '
            'EMPLOYEE — bez tych warunków raport mógłby zawierać dane innych '
            'firm albo statystyki kont administracyjnych. Operator IN (...) '
            'ogranicza zapytanie do testów ujętych w konfiguracji wskaźnika '
            'dobrostanu (WHO5, PSS10, PHQ9, GAD7, MOOD10) — pozostałe testy '
            'nie wpływają na wskaźnik zbiorczy.'
        ),
    )

    add_heading(doc, 'Filar trzeci — k-anonymity i próg minimalnej liczebności grupy', level=3)

    add_paragraph(doc, [
        ('Najistotniejszym mechanizmem ochrony tożsamości jest ', ),
        ('k-anonymity', 'b'),
        (' — koncepcja z dziedziny prywatności danych, zgodnie z którą każdy rekord w zbiorze publikowanym musi być nieodróżnialny od co najmniej ', ),
        ('k − 1', 'i'),
        (' innych rekordów. W kontekście MoodFlow oznacza to, że jeśli dział liczy mniej niż ', ),
        ('MIN_GROUP_SIZE', 'm'),
        (' aktywnych pracowników (próg ustawiony na ', ),
        ('5', 'b'),
        ('), wyniki zbiorcze tego działu nie są ujawniane — niezależnie od liczby uczestników, którzy faktycznie wypełnili test. Wartość 5 jest powszechnie stosowanym minimum w praktyce ochrony danych medycznych i wystarcza, by uniemożliwić identyfikację konkretnej osoby na podstawie pojedynczego wyniku zagregowanego (np. „średni wynik PHQ-9 w dziale liczącym 2 osoby" jest praktycznie tożsamy z indywidualnym wynikiem każdej z nich).', ),
    ])

    add_listing(
        doc,
        listing_no='4.40',
        title='Próg k-anonymity oraz konfiguracja indeksu dobrostanu',
        file_path='backend-api/src/modules/analytics/analytics.service.ts',
        lines='10–25',
        comment=(
            'Listing 4.40 prezentuje stałą MIN_GROUP_SIZE wraz z funkcją '
            'meetsThreshold oraz konfigurację wag indeksu dobrostanu (WB_CONFIG). '
            'Komentarz w kodzie jawnie wskazuje powiązanie z punktem 12 '
            'dokumentu RULES.md, co stanowi praktykę zalecaną w pracy '
            'inżynierskiej — decyzje projektowe są jawnie dokumentowane '
            'w miejscu ich realizacji, a nie ukryte w intuicji autora.'
        ),
    )

    add_paragraph(doc, [
        ('Maskowanie wyników odbywa się w warstwie aplikacyjnej, ', ),
        ('po', 'i'),
        (' wykonaniu zapytania SQL. Serwis ', ),
        ('AnalyticsService', 'm'),
        (' przechodzi po każdym wierszu wyniku zbiorczego, sprawdza liczbę uczestników i jeśli próg nie został spełniony — ustawia konkretne wartości liczbowe na ', ),
        ('null', 'm'),
        (' oraz dołącza flagę ', ),
        ('anonymized: true', 'm'),
        ('. Frontend wykrywa flagę i prezentuje użytkownikowi komunikat o niewystarczającej liczebności próby zamiast konkretnych liczb. Dzięki temu HR widzi, że dział istnieje i ile osób się znajduje w grupie (sama liczebność nie jest wrażliwa), ale nie poznaje konkretnych wyników. W panelu HR pole ', ),
        ('minGroupSize', 'm'),
        (' jest dodatkowo eksponowane w komunikacie wyjaśniającym mechanizm — dzięki temu użytkownik nie czuje się zaskoczony ani oszukany przez „brakujące dane".', ),
    ])

    add_listing(
        doc,
        listing_no='4.41',
        title='Maskowanie wyników w getDepartmentStats z flagą anonymized',
        file_path='backend-api/src/modules/analytics/analytics.service.ts',
        lines='209–245',
        comment=(
            'Listing 4.41 prezentuje pełną metodę getDepartmentStats. Po '
            'wykonaniu zapytania SQL agregującego wyniki per dział następuje '
            'iteracja, w której funkcja meetsThreshold decyduje o ujawnieniu '
            'średniej. W przypadku grup poniżej progu pole avgScore jest '
            'wyzerowane, a flaga anonymized ustawiona na true. Liczba '
            'uczestników (participantCount) jest zwracana zawsze — sama '
            'liczność nie jest danym wrażliwym i jest potrzebna HR, by '
            'rozumieć kontekst maskowania.'
        ),
    )

    add_paragraph(doc, [
        ('Identyczny mechanizm jest stosowany w metodzie ', ),
        ('getDepartmentWellbeingLoad', 'm'),
        (' obliczającej wskaźnik dobrostanu per dział. Po zbudowaniu map agregowanych wyników z dwóch okresów następuje finalna obróbka, w której każdy dział jest przekształcany w obiekt wynikowy. Sprawdzenie liczebności poprzedza wywołanie funkcji ', ),
        ('calcWellbeingIndex', 'm'),
        (' — w przypadku grup poniżej progu indeks pozostaje ', ),
        ('null', 'm'),
        (', a trend ustawiany jest na ', ),
        ('no_data', 'i'),
        (' (zamiast wartości liczbowej, która mogłaby ujawnić dane). Identyczny próg jest stosowany konsekwentnie w obu metodach analitycznych ujawniających dane per dział.', ),
    ])

    add_listing(
        doc,
        listing_no='4.42',
        title='Anonimizacja wskaźnika dobrostanu i klasyfikacja trendu per dział',
        file_path='backend-api/src/modules/analytics/analytics.service.ts',
        lines='438–462',
        comment=(
            'Listing 4.42 pokazuje finalną obróbkę danych w metodzie '
            'getDepartmentWellbeingLoad. Funkcja meetsThreshold jest wywoływana '
            'przed obliczeniem indeksu dobrostanu, dzięki czemu nawet liczby '
            'pośrednie (norm, contribution) nigdy nie są wyliczane dla grup '
            'poniżej progu. Klasyfikacja trendu używa progu ±5 punktów '
            'wskaźnika — drobne wahania w przedziale ±5 są klasyfikowane '
            'jako stabilne, co eliminuje fałszywe alarmy wynikające z naturalnej '
            'wariancji wyników.'
        ),
    )

    add_heading(doc, 'Wskaźnik dobrostanu jako wskaźnik zbiorczy', level=3)

    add_paragraph(doc, [
        ('Centralnym wskaźnikiem prezentowanym na dashboardzie HR jest ', ),
        ('wskaźnik dobrostanu', 'b'),
        (' (', ),
        ('wellbeingIndex', 'm'),
        (') — pojedyncza liczba w skali 0–100 podsumowująca pięć kluczowych testów psychometrycznych z odpowiednimi wagami: WHO-5 (30 %, kierunek pozytywny), PSS-10 (20 %, kierunek odwrócony), PHQ-9 (20 %, odwrócony), GAD-7 (15 %, odwrócony) oraz MOOD10 (15 %, pozytywny). Konfiguracja wag jest umieszczona w stałej ', ),
        ('WB_CONFIG', 'm'),
        (' wspólnej dla całego serwisu i identycznej z konfiguracją w ', ),
        ('ResultsService', 'm'),
        (' — dzięki temu wskaźnik osobisty pracownika i wskaźnik zbiorczy działu są wyliczane tym samym algorytmem, co zapewnia spójność interpretacyjną. Funkcja ', ),
        ('calcWellbeingIndex', 'm'),
        (' normalizuje surowe wyniki każdego testu do skali 0–100, odwraca te o kierunku negatywnym i wylicza średnią ważoną. Wskaźnik nie jest wyliczany, jeśli dział nie spełnia progu k-anonymity — w takim przypadku zwracany jest ', ),
        ('null', 'm'),
        (' i flaga ', ),
        ('anonymized', 'm'),
        ('.', ),
    ])

    add_heading(doc, 'Świadome ograniczenia i kierunki dalszego rozwoju', level=3)

    add_paragraph(doc, [
        ('Architektura modułu raportowego została celowo zachowana w prostocie odpowiadającej skali projektu inżynierskiego. Świadomie nie wprowadzono kilku elementów, które byłyby wskazane w środowisku produkcyjnym o większej skali: ', ),
        ('automatycznych alertów', 'b'),
        (' wysyłanych do działu HR przy nagłym wzroście udziału wyników o nasileniu ciężkim, ', ),
        ('audytu dostępu do raportów', 'b'),
        (' (każde wywołanie endpointu analitycznego logowane do tabeli ', ),
        ('audit_logs', 'm'),
        ('), oraz ', ),
        ('różnicowej prywatności', 'b'),
        (' (ang. ', ),
        ('differential privacy', 'i'),
        (') — bardziej zaawansowanego mechanizmu dodawania kontrolowanego szumu do statystyk zbiorczych w celu uniemożliwienia ataków wnioskowania. Wszystkie te elementy są wymienione w sekcji „dalszego rozwoju systemu" jako naturalne kierunki rozszerzenia w przyszłości — w obecnym zakresie pracy inżynierskiej trzy zaimplementowane filary (kontrola dostępu, agregacja, k-anonymity) wystarczają do realizacji założeń projektowych.', ),
    ])

    add_heading(doc, 'Podsumowanie warstwy anonimizacji', level=3)

    add_paragraph(doc, [
        ('Anonimizacja danych w panelu HR systemu MoodFlow jest realizowana w trzech komplementarnych warstwach: deklaratywną kontrolą dostępu rolami na poziomie kontrolera HTTP, agregacją SQL z obowiązkową izolacją multi-tenant w każdym zapytaniu oraz mechanizmem k-anonymity z progiem ', ),
        ('MIN_GROUP_SIZE = 5', 'm'),
        (' maskującym wyniki dla grup poniżej minimalnej liczebności. Stała progu jest umieszczona w jednym, jawnie udokumentowanym miejscu w kodzie, dzięki czemu przyszła zmiana wartości (np. podniesienie do 10 dla większych organizacji) wymaga modyfikacji wyłącznie pojedynczej linii. Funkcja maskowania zwraca jawną flagę ', ),
        ('anonymized: true', 'm'),
        (' wraz z polem ', ),
        ('minGroupSize', 'm'),
        (', co umożliwia frontendowi pokazanie czytelnego komunikatu zamiast brakujących danych. W ten sposób MoodFlow realizuje kluczową zasadę projektową — dane indywidualnych pracowników nie są nigdy ujawniane działowi HR, niezależnie od tego, w jaki sposób użytkownik wykorzysta interfejs analityczny.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.8-Anonimizacja-i-raporty-HR.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
