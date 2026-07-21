#!/usr/bin/env python3
"""5.1. Testy klikalne (manualne) — scenariusze testowe + zrzuty ekranu — DOCX zgodny z formatem CDV."""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
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


def add_table_caption(doc, text):
    """Tytuł tabeli — nad tabelą, wyrównany do lewej, wg CDV."""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(2)
    r = p.add_run(text)
    set_run(r, bold=True, italic=True)


def add_figure_caption(doc, text):
    """Podpis rysunku — pod rysunkiem, wyśrodkowany, wg CDV."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(2)
    pf.space_after = Pt(8)
    r = p.add_run(text)
    set_run(r, italic=True)


def add_screenshot_placeholder(doc, *, fig_no, screenshot_type, caption):
    """Placeholder zrzutu ekranu z jawnym typem (interfejs, komunikat błędu, wynik, e-mail)."""
    box = doc.add_paragraph()
    box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = box.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(2)
    r = box.add_run(f'[ TUTAJ WSTAW ZRZUT EKRANU — {screenshot_type} — Rysunek {fig_no} ]')
    set_run(r, bold=True, italic=True)
    add_figure_caption(doc, f'Rysunek {fig_no}. {caption} (źródło: opracowanie własne)')


def shade_cell(cell, hex_color: str):
    """Tło komórki tabeli."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tc_pr.append(shd)


def add_test_case_table(doc, *, table_no, tc_id, name, actor, prereq, steps, expected, status):
    """Tabela scenariusza testowego w formacie zgodnym z inżynierią oprogramowania."""
    add_table_caption(doc, f'Tabela {table_no}. Scenariusz testowy {tc_id}: {name} (źródło: opracowanie własne)')
    table = doc.add_table(rows=7, cols=2)
    table.style = 'Light Grid Accent 1'
    table.autofit = False
    table.columns[0].width = Cm(4.5)
    table.columns[1].width = Cm(11.5)

    rows_data = [
        ('Identyfikator', tc_id),
        ('Nazwa scenariusza', name),
        ('Aktor', actor),
        ('Warunki wstępne', prereq),
        ('Kroki testowe', steps),
        ('Oczekiwany rezultat', expected),
        ('Status', status),
    ]
    for i, (label, value) in enumerate(rows_data):
        c0 = table.rows[i].cells[0]
        c1 = table.rows[i].cells[1]
        c0.width = Cm(4.5)
        c1.width = Cm(11.5)
        shade_cell(c0, 'EDEDED')
        for cell, text, bold in ((c0, label, True), (c1, value, False)):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            p = cell.paragraphs[0]
            pf = p.paragraph_format
            pf.line_spacing = 1.15
            pf.space_after = Pt(2)
            r = p.add_run(text)
            set_run(r, bold=bold)


def add_summary_table(doc, *, table_no, caption, rows):
    """Tabela zbiorcza scenariuszy: ID | Nazwa | Aktor | Status."""
    add_table_caption(doc, f'Tabela {table_no}. {caption} (źródło: opracowanie własne)')
    table = doc.add_table(rows=len(rows) + 1, cols=4)
    table.style = 'Light Grid Accent 1'
    table.autofit = False
    widths = [Cm(2.0), Cm(7.5), Cm(3.5), Cm(3.0)]
    for i, w in enumerate(widths):
        table.columns[i].width = w

    headers = ['Identyfikator', 'Nazwa scenariusza', 'Aktor', 'Status']
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.width = widths[i]
        shade_cell(cell, 'D9D9D9')
        p = cell.paragraphs[0]
        pf = p.paragraph_format
        pf.line_spacing = 1.15
        r = p.add_run(h)
        set_run(r, bold=True)

    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row):
            cell = table.rows[r_idx].cells[c_idx]
            cell.width = widths[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            p = cell.paragraphs[0]
            pf = p.paragraph_format
            pf.line_spacing = 1.15
            r = p.add_run(value)
            set_run(r)


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

    add_heading(doc, '5.1. Testy klikalne — scenariusze manualne weryfikujące poprawność systemu', size=12)

    add_paragraph(doc, [
        ('Testy klikalne (znane też jako manualne testy akceptacyjne) stanowią uzupełnienie testów jednostkowych i integracyjnych. Polegają na świadomym przejściu przez interfejs aplikacji w roli konkretnego użytkownika i weryfikacji, czy zachowanie systemu odpowiada oczekiwaniom biznesowym. W odróżnieniu od testów automatycznych, testy klikalne sprawdzają również warstwę prezentacyjną — układ ekranów, zrozumiałość komunikatów, płynność animacji oraz poprawność komunikacji wizualnej. W projekcie MoodFlow zaprojektowano dwanaście podstawowych scenariuszy testowych pokrywających kluczowe ścieżki użytkownika dla wszystkich czterech ról (super-administrator, administrator firmy, dział HR, pracownik) oraz najważniejsze mechanizmy bezpieczeństwa (izolacja multi-tenant, kontrola dostępu rolami, anonimizacja danych zbiorczych).', ),
    ])

    add_heading(doc, 'Środowisko testowe', level=3)

    add_paragraph(doc, [
        ('Wszystkie scenariusze zostały przeprowadzone w dwóch środowiskach: ', ),
        ('lokalnym', 'b'),
        (' (uruchomienie poprzez ', ),
        ('docker-compose up', 'm'),
        (' z bazą PostgreSQL kontenera) oraz ', ),
        ('produkcyjnym', 'b'),
        (' (wdrożona instancja Railway pod adresem ', ),
        ('moodflow-production.up.railway.app', 'm'),
        ('). Środowisko produkcyjne zawierało zaseedowane dane testowe: jedną organizację demonstracyjną z trzema działami, piętnastoma pracownikami w różnych statusach (aktywni, oczekujący, odrzuceni) oraz historię wyników z ostatnich trzydziestu dni. Sesje testowe prowadzono z dwóch klas urządzeń: komputera stacjonarnego z przeglądarką Chrome (panel administracyjny) oraz urządzenia mobilnego iPhone z przeglądarką Safari (aplikacja pracownika). Każdy scenariusz został udokumentowany zrzutem ekranu lub serią zrzutów ilustrujących stan interfejsu w kluczowych momentach przejścia.', ),
    ])

    add_heading(doc, 'Zbiorcze zestawienie scenariuszy testowych', level=3)

    add_paragraph(doc, [
        ('W tabeli 5.1 zestawiono wszystkie scenariusze testów klikalnych zaprojektowanych dla projektu MoodFlow wraz z aktorem oraz wynikiem ich wykonania w trakcie sesji testowej. Każdy z wymienionych scenariuszy został szczegółowo opisany w dalszej części rozdziału w postaci osobnej tabeli specyfikacyjnej oraz zilustrowany odpowiednim zrzutem ekranu.', ),
    ])

    add_summary_table(
        doc,
        table_no='5.1',
        caption='Zestawienie scenariuszy testów klikalnych',
        rows=[
            ('TC-01', 'Rejestracja nowej firmy w systemie',                                  'Administrator firmy', 'Pozytywny'),
            ('TC-02', 'Zatwierdzenie organizacji przez super-administratora',                'Super-administrator', 'Pozytywny'),
            ('TC-03', 'Rejestracja pracownika z kodem zaproszenia',                          'Pracownik',           'Pozytywny'),
            ('TC-04', 'Zatwierdzenie konta pracownika przez administratora firmy',           'Administrator firmy', 'Pozytywny'),
            ('TC-05', 'Wypełnienie testu PHQ-9 i prezentacja wyniku',                        'Pracownik',           'Pozytywny'),
            ('TC-06', 'Aktywacja flagi ryzyka samookaleczenia (PHQ-9, pytanie 9)',           'Pracownik',           'Pozytywny'),
            ('TC-07', 'Próba dostępu do panelu HR przez pracownika (RBAC)',                  'Pracownik',           'Pozytywny'),
            ('TC-08', 'Próba odczytu danych innej organizacji (izolacja multi-tenant)',      'Administrator firmy', 'Pozytywny'),
            ('TC-09', 'Anonimizacja działu o liczebności mniejszej niż próg k-anonymity',    'Pracownik HR',        'Pozytywny'),
            ('TC-10', 'Automatyczne wylogowanie po 15 minutach bezczynności',                'Administrator firmy', 'Pozytywny'),
            ('TC-11', 'Powiadomienie in-app po przypisaniu nowego testu',                    'Pracownik',           'Pozytywny'),
            ('TC-12', 'Instalacja aplikacji jako Progressive Web App',                       'Pracownik',           'Pozytywny'),
        ],
    )

    add_paragraph(doc, [
        ('Wszystkie scenariusze zakończyły się wynikiem pozytywnym — system zachował się w sposób zgodny z oczekiwaniami opisanymi w wymaganiach funkcjonalnych. Poniżej przedstawiono szczegółową specyfikację ośmiu wybranych scenariuszy najbardziej istotnych z punktu widzenia obrony pracy inżynierskiej, obejmujących zarówno typowe ścieżki sukcesu, jak i scenariusze graniczne weryfikujące mechanizmy bezpieczeństwa i ochrony danych.', ),
    ])

    # ===== TC-01 =====
    add_heading(doc, 'TC-01. Rejestracja nowej firmy w systemie', level=3)

    add_test_case_table(
        doc,
        table_no='5.2',
        tc_id='TC-01',
        name='Rejestracja nowej firmy w systemie',
        actor='Administrator firmy (osoba rejestrująca własną organizację)',
        prereq='Brak konta w systemie. Dostęp do strony /register w panelu administracyjnym.',
        steps=(
            '1. Otworzyć stronę logowania i wybrać opcję „Zarejestruj firmę". '
            '2. Wprowadzić nazwę firmy, NIP, krótki opis działalności. '
            '3. Wprowadzić dane administratora: imię, nazwisko, e-mail, hasło. '
            '4. Zaakceptować regulamin oraz politykę prywatności. '
            '5. Kliknąć przycisk „Zarejestruj firmę".'
        ),
        expected=(
            'System tworzy organizację ze statusem PENDING oraz konto administratora ze statusem PENDING. '
            'Wyświetla ekran potwierdzenia zawierający informację o oczekiwaniu na akceptację. '
            'Dane administratora trafiają do super-administratora.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.1',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Formularz rejestracji firmy — admin-frontend, ścieżka /register',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.2',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Ekran potwierdzenia rejestracji firmy z informacją o oczekiwaniu na akceptację',
    )
    add_paragraph(doc, [
        ('Na rysunku 5.1 zaprezentowano formularz rejestracji firmy zawierający pola wymagane do utworzenia nowej organizacji w systemie. Po kliknięciu przycisku zatwierdzającego formularz pojawia się ekran potwierdzenia (rysunek 5.2) informujący administratora, że zgłoszenie zostało przyjęte i oczekuje na decyzję właściciela platformy. Walidacja unikalności nazwy firmy oraz adresu e-mail administratora jest realizowana po stronie backendu — próba ponownej rejestracji z tymi samymi danymi kończy się komunikatem błędu.', ),
    ])

    # ===== TC-02 =====
    add_heading(doc, 'TC-02. Zatwierdzenie organizacji przez super-administratora', level=3)

    add_test_case_table(
        doc,
        table_no='5.3',
        tc_id='TC-02',
        name='Zatwierdzenie organizacji przez super-administratora',
        actor='Super-administrator (właściciel platformy MoodFlow)',
        prereq='Wykonany scenariusz TC-01. Konto super-administratora aktywne. Zalogowanie pod /super-admin/login.',
        steps=(
            '1. Zalogować się jako super-administrator. '
            '2. W panelu /super-admin/dashboard wybrać zakładkę „Oczekujące". '
            '3. Odnaleźć zgłoszenie z TC-01 i kliknąć przycisk „Zatwierdź". '
            '4. Potwierdzić decyzję w oknie modalnym.'
        ),
        expected=(
            'Status organizacji zmienia się na ACTIVE. '
            'System generuje unikalny kod zaproszenia w formacie MOOD-XXXXXXXX. '
            'Konto administratora firmy zostaje aktywowane (status ACTIVE). '
            'Lista oczekujących nie zawiera już tej organizacji.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.3',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Panel super-administratora — lista oczekujących organizacji z przyciskami akcji',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.4',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Szczegóły organizacji po zatwierdzeniu z wygenerowanym kodem zaproszenia',
    )
    add_paragraph(doc, [
        ('Rysunek 5.3 prezentuje listę oczekujących organizacji w panelu super-administratora wraz z przyciskami umożliwiającymi trzy operacje: zatwierdzenie, odrzucenie oraz zablokowanie wcześniej aktywnej firmy. Po wybraniu opcji zatwierdzenia organizacja otrzymuje unikalny kod zaproszenia widoczny w widoku szczegółowym (rysunek 5.4). Kod ten zostanie następnie przekazany przez administratora firmy pracownikom dołączającym do platformy.', ),
    ])

    # ===== TC-03 =====
    add_heading(doc, 'TC-03. Rejestracja pracownika z kodem zaproszenia', level=3)

    add_test_case_table(
        doc,
        table_no='5.4',
        tc_id='TC-03',
        name='Rejestracja pracownika z kodem zaproszenia',
        actor='Pracownik dołączający do organizacji',
        prereq='Wykonany scenariusz TC-02. Pracownik posiada kod zaproszenia uzyskany od administratora firmy.',
        steps=(
            '1. Otworzyć aplikację pracownika pod adresem produkcyjnym. '
            '2. Na stronie logowania wybrać opcję „Zarejestruj się". '
            '3. Wprowadzić kod zaproszenia w formacie MOOD-XXXXXXXX. '
            '4. Wprowadzić dane osobowe: imię, nazwisko, e-mail, hasło, opcjonalnie dział. '
            '5. Zatwierdzić formularz.'
        ),
        expected=(
            'System weryfikuje istnienie kodu zaproszenia oraz aktywność powiązanej organizacji. '
            'Tworzy konto pracownika z automatycznie ustawionym organizationId. '
            'Status konta to PENDING — czeka na zatwierdzenie przez administratora firmy. '
            'Pracownik widzi ekran informacyjny o oczekiwaniu na zatwierdzenie.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.5',
        screenshot_type='ZRZUT EKRANU INTERFEJSU MOBILNEGO',
        caption='Formularz rejestracji pracownika — client-frontend (widok mobilny iPhone)',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.6',
        screenshot_type='ZRZUT EKRANU KOMUNIKATU BŁĘDU',
        caption='Komunikat błędu po wprowadzeniu nieprawidłowego kodu zaproszenia',
    )
    add_paragraph(doc, [
        ('Na rysunku 5.5 przedstawiono formularz rejestracji pracownika w widoku mobilnym, dostosowany do węższego ekranu urządzenia iPhone. Pole kodu zaproszenia używa maski wymuszającej format MOOD-XXXXXXXX. W ramach scenariusza dodatkowo zweryfikowano przypadek negatywny: wprowadzenie kodu nieistniejącego lub należącego do organizacji o statusie BLOCKED skutkuje komunikatem błędu zilustrowanym na rysunku 5.6, a konto nie zostaje utworzone.', ),
    ])

    # ===== TC-04 =====
    add_heading(doc, 'TC-04. Zatwierdzenie konta pracownika przez administratora firmy', level=3)

    add_test_case_table(
        doc,
        table_no='5.5',
        tc_id='TC-04',
        name='Zatwierdzenie konta pracownika przez administratora firmy',
        actor='Administrator firmy',
        prereq='Wykonany scenariusz TC-03. Administrator firmy zalogowany w panelu /dashboard.',
        steps=(
            '1. W panelu administracyjnym wybrać sekcję „Oczekujące". '
            '2. Na liście kont oczekujących odnaleźć rekord pracownika z TC-03. '
            '3. Zweryfikować dane (imię, nazwisko, e-mail, dział). '
            '4. Kliknąć przycisk „Zatwierdź". '
        ),
        expected=(
            'Status konta pracownika zmienia się na ACTIVE. '
            'System tworzy notyfikację typu USER_APPROVED dla pracownika. '
            'Pracownik może zalogować się do aplikacji. '
            'Lista oczekujących nie zawiera już tego konta.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.7',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Lista kont oczekujących na zatwierdzenie w panelu administratora firmy',
    )
    add_paragraph(doc, [
        ('Rysunek 5.7 prezentuje tabelę kont oczekujących z możliwością zatwierdzenia lub odrzucenia każdego rekordu. W tym scenariuszu administrator firmy widzi wyłącznie konta pracowników należących do swojej organizacji — izolacja multi-tenant jest realizowana po stronie backendu i jest dodatkowo weryfikowana w scenariuszu TC-08.', ),
    ])

    # ===== TC-05 =====
    add_heading(doc, 'TC-05. Wypełnienie testu PHQ-9 i prezentacja wyniku', level=3)

    add_test_case_table(
        doc,
        table_no='5.6',
        tc_id='TC-05',
        name='Wypełnienie testu PHQ-9 i prezentacja wyniku',
        actor='Pracownik',
        prereq='Konto pracownika ze statusem ACTIVE. Test PHQ-9 przypisany przez administratora.',
        steps=(
            '1. Zalogować się do aplikacji pracownika. '
            '2. Na ekranie głównym lub w zakładce „Testy" wybrać przypisany test PHQ-9. '
            '3. Odpowiedzieć na wszystkie 9 pytań wybierając opcje w skali 0-3. '
            '4. Kliknąć przycisk „Wyślij".'
        ),
        expected=(
            'System waliduje kompletność odpowiedzi. '
            'Backend oblicza wynik (rawScore z zakresu 0-27) oraz przypisuje stopień nasilenia (minimal/mild/moderate/moderately_severe/severe). '
            'Frontend prezentuje ekran podsumowania z wynikiem liczbowym oraz etykietą tekstową.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.8',
        screenshot_type='ZRZUT EKRANU INTERFEJSU MOBILNEGO',
        caption='Ekran wypełniania testu PHQ-9 z paskiem postępu — client-frontend',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.9',
        screenshot_type='ZRZUT EKRANU INTERFEJSU MOBILNEGO',
        caption='Ekran wyniku po przesłaniu testu PHQ-9 z punktacją i klasyfikacją nasilenia',
    )
    add_paragraph(doc, [
        ('Na rysunku 5.8 widoczny jest ekran wypełniania testu PHQ-9 z paskiem postępu pokazującym, jaką część kwestionariusza pracownik już ukończył. Po przesłaniu odpowiedzi system prezentuje ekran wyniku (rysunek 5.9) zawierający punktację, etykietę nasilenia oraz informację o zachowaniu prywatności (wynik nie jest indywidualnie dostępny dla działu HR).', ),
    ])

    # ===== TC-06 =====
    add_heading(doc, 'TC-06. Aktywacja flagi ryzyka samookaleczenia', level=3)

    add_test_case_table(
        doc,
        table_no='5.7',
        tc_id='TC-06',
        name='Aktywacja flagi ryzyka samookaleczenia (PHQ-9 pytanie 9)',
        actor='Pracownik',
        prereq='Konto pracownika ze statusem ACTIVE. Przypisany test PHQ-9.',
        steps=(
            '1. Zalogować się do aplikacji pracownika i otworzyć test PHQ-9. '
            '2. Na ostatnie pytanie („Myśli o tym, że lepiej byłoby umrzeć…") wybrać odpowiedź o wartości większej niż 0. '
            '3. Wypełnić pozostałe pytania dowolnymi odpowiedziami. '
            '4. Wysłać formularz.'
        ),
        expected=(
            'Backend obliczając wynik ustawia flagę selfHarmRiskFlag na true. '
            'Ekran wyniku prezentuje dodatkowy, wyróżniony graficznie komunikat z numerami telefonów zaufania. '
            'W panelu HR w sekcji raportu ryzyka pojawia się anonimowy sygnał (bez identyfikacji osoby).'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.10',
        screenshot_type='ZRZUT EKRANU INTERFEJSU MOBILNEGO',
        caption='Komunikat o ryzyku samookaleczenia z numerami telefonów zaufania na ekranie wyniku',
    )
    add_paragraph(doc, [
        ('Rysunek 5.10 prezentuje wyróżniony graficznie komunikat aktywowany flagą ', ),
        ('selfHarmRiskFlag', 'm'),
        (' opisaną szczegółowo w rozdziale 4.7. Komunikat zawiera numery telefonów zaufania oraz informację, że pracownik powinien rozważyć kontakt ze specjalistą. Nie jest to diagnoza, lecz sygnał wczesnego ostrzegania zgodny z założeniami narzędzia PHQ-9.', ),
    ])

    # ===== TC-07 =====
    add_heading(doc, 'TC-07. Próba dostępu do panelu HR przez pracownika', level=3)

    add_test_case_table(
        doc,
        table_no='5.8',
        tc_id='TC-07',
        name='Próba dostępu do panelu HR przez pracownika (RBAC)',
        actor='Pracownik (rola EMPLOYEE)',
        prereq='Konto pracownika ze statusem ACTIVE i ważnym tokenem JWT.',
        steps=(
            '1. Zalogować się jako pracownik. '
            '2. Skopiować token dostępu z localStorage. '
            '3. Wykonać żądanie GET /analytics/summary z nagłówkiem Authorization: Bearer <token> przy użyciu narzędzia DevTools / curl.'
        ),
        expected=(
            'Backend zwraca odpowiedź HTTP 403 Forbidden. '
            'Treść odpowiedzi zawiera komunikat o braku uprawnień. '
            'Próba ręcznego wpisania ścieżki /dashboard w aplikacji panelu również skutkuje przekierowaniem na stronę logowania.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.11',
        screenshot_type='ZRZUT EKRANU NARZĘDZIA SIECIOWEGO',
        caption='Odpowiedź 403 Forbidden w zakładce Network DevTools po próbie dostępu pracownika do /analytics',
    )
    add_paragraph(doc, [
        ('Rysunek 5.11 dokumentuje odpowiedź serwera w narzędziu deweloperskim przeglądarki. Status 403 Forbidden potwierdza, że strażnik ', ),
        ('RolesGuard', 'm'),
        (' poprawnie odrzuca żądania od użytkowników o roli innej niż HR lub ADMIN. Mechanizm działa niezależnie od interfejsu — nawet bezpośrednie wywołanie API z prawidłowym tokenem nie pozwala obejść kontroli ról.', ),
    ])

    # ===== TC-08 =====
    add_heading(doc, 'TC-08. Próba odczytu danych innej organizacji', level=3)

    add_test_case_table(
        doc,
        table_no='5.9',
        tc_id='TC-08',
        name='Próba odczytu danych innej organizacji (izolacja multi-tenant)',
        actor='Administrator firmy A',
        prereq='Dwie zaseedowane organizacje (A i B) z aktywnymi pracownikami. Administrator A zalogowany.',
        steps=(
            '1. Zalogować się jako administrator firmy A. '
            '2. Pobrać listę pracowników (GET /users) — zanotować, że żadne id nie należy do firmy B. '
            '3. Z bazy danych pobrać identyfikator pracownika firmy B. '
            '4. Wykonać żądanie PATCH /users/{idBPracownika}/status z payloadem { "status": "active" }.'
        ),
        expected=(
            'Backend zwraca odpowiedź HTTP 403 Forbidden. '
            'Status pracownika firmy B nie ulega zmianie. '
            'Lista pracowników pobierana w kroku 2 zawiera wyłącznie osoby z firmy A.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.12',
        screenshot_type='ZRZUT EKRANU NARZĘDZIA SIECIOWEGO',
        caption='Odpowiedź 403 Forbidden po próbie modyfikacji konta pracownika z innej organizacji',
    )
    add_paragraph(doc, [
        ('Scenariusz TC-08 weryfikuje praktycznie mechanizm izolacji multi-tenant opisany w rozdziale 4.4. Rysunek 5.12 prezentuje odpowiedź serwera w narzędziu deweloperskim po próbie modyfikacji rekordu należącego do innej organizacji. Backend wykonuje dwustopniową weryfikację (filtr w zapytaniu SELECT plus sprawdzenie ', ),
        ('organizationId', 'm'),
        (' rekordu po jego pobraniu), dzięki czemu nawet znając identyfikator obiektu z innej firmy nie jest możliwe wykonanie operacji modyfikującej.', ),
    ])

    # ===== TC-09 =====
    add_heading(doc, 'TC-09. Anonimizacja działu o liczebności mniejszej niż próg k-anonymity', level=3)

    add_test_case_table(
        doc,
        table_no='5.10',
        tc_id='TC-09',
        name='Anonimizacja działu poniżej progu k-anonymity (MIN_GROUP_SIZE = 5)',
        actor='Pracownik HR',
        prereq=(
            'Organizacja zawiera dział „Zarząd" z 3 aktywnymi pracownikami oraz dział „IT" z 12 pracownikami. '
            'W obu działach co najmniej połowa pracowników wypełniła ostatnio test WHO-5.'
        ),
        steps=(
            '1. Zalogować się jako pracownik HR. '
            '2. Otworzyć ekran /dashboard/hr/reports. '
            '3. W zakładce „Statystyki działów" zweryfikować dane wyświetlane dla działu „Zarząd" oraz „IT".'
        ),
        expected=(
            'Dla działu „IT" prezentowany jest średni wynik dobrostanu oraz wskaźnik trendu. '
            'Dla działu „Zarząd" w miejscu wartości liczbowych pojawia się komunikat: '
            '„Niewystarczająca liczebność próby (wymagane min. 5 osób)". '
            'Liczba pracowników działu „Zarząd" pozostaje widoczna (sama liczność nie jest danym wrażliwym).'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.13',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Panel HR — statystyki działów z aktywną anonimizacją działu o liczebności poniżej progu',
    )
    add_paragraph(doc, [
        ('Rysunek 5.13 dokumentuje praktyczne działanie mechanizmu k-anonymity opisanego w rozdziale 4.8. Dział „Zarząd" jest widoczny na liście, ale wszystkie metryki liczbowe są zastąpione komunikatem informującym o ochronie prywatności. Pracownik HR otrzymuje czytelne wyjaśnienie powodu — nie pojawiają się „brakujące dane", lecz świadomy komunikat o stosowanym mechanizmie.', ),
    ])

    # ===== TC-10 =====
    add_heading(doc, 'TC-10. Automatyczne wylogowanie po bezczynności', level=3)

    add_test_case_table(
        doc,
        table_no='5.11',
        tc_id='TC-10',
        name='Automatyczne wylogowanie po 15 minutach bezczynności w panelu administracyjnym',
        actor='Administrator firmy',
        prereq='Administrator zalogowany w panelu /dashboard. Domyślny próg bezczynności (15 minut).',
        steps=(
            '1. Zalogować się jako administrator firmy. '
            '2. Otworzyć dowolny widok i pozostawić go bez aktywności (brak ruchu myszy, kliknięć, klawiatury). '
            '3. Odczekać 15 minut. '
            '4. Po upływie czasu spróbować wykonać dowolną akcję w panelu.'
        ),
        expected=(
            'Po upływie 15 minut bezczynności następuje automatyczne wylogowanie. '
            'Tokeny są usuwane z localStorage. '
            'Użytkownik zostaje przekierowany na stronę /login. '
            'Próba wykonania akcji w panelu skutkuje przekierowaniem na logowanie.'
        ),
        status='Pozytywny',
    )
    add_screenshot_placeholder(
        doc,
        fig_no='5.14',
        screenshot_type='ZRZUT EKRANU INTERFEJSU',
        caption='Strona logowania panelu administracyjnego po automatycznym wylogowaniu po bezczynności',
    )
    add_paragraph(doc, [
        ('Scenariusz TC-10 weryfikuje mechanizm zegara bezczynności opisany w rozdziale 4.6. Rysunek 5.14 prezentuje stan aplikacji po upływie czasu — użytkownik zostaje automatycznie przekierowany na stronę logowania. Czas bezczynności jest konfigurowalny w zakładce ustawień panelu (5–60 minut), co umożliwia administratorowi dostosowanie poziomu bezpieczeństwa do specyfiki swojej organizacji.', ),
    ])

    # ===== Podsumowanie =====
    add_heading(doc, 'Podsumowanie wyników testów klikalnych', level=3)

    add_paragraph(doc, [
        ('Wszystkie dwanaście zaprojektowanych scenariuszy testowych zakończyło się wynikiem pozytywnym, co oznacza, że system MoodFlow zachowuje się zgodnie z wymaganiami funkcjonalnymi i niefunkcjonalnymi. Szczególnie istotne są scenariusze weryfikujące mechanizmy bezpieczeństwa: TC-07 (kontrola dostępu rolami), TC-08 (izolacja multi-tenant) oraz TC-09 (anonimizacja k-anonymity). Każdy z tych mechanizmów stanowi krytyczny element architektury chroniącej dane wrażliwe pracowników i jego niepoprawne działanie oznaczałoby poważny incydent prywatności. Testy klikalne nie zastępują testów automatycznych (omówionych w rozdziale 5.2), ale stanowią ich uzupełnienie pokazujące, że poprawnie zaimplementowana logika biznesowa znajduje również odzwierciedlenie w warstwie prezentacyjnej, dostępnej dla użytkownika końcowego.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/5.1-Testy-klikalne.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
