#!/usr/bin/env python3
"""5.3. Archiwizacja danych — backup, retencja, RODO — DOCX zgodny z formatem CDV."""

from docx import Document
from docx.shared import Pt, Cm
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
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(2)
    r = p.add_run(text)
    set_run(r, bold=True, italic=True)


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


def shade_cell(cell, hex_color: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tc_pr.append(shd)


def add_data_table(doc, *, table_no, caption, headers, rows, col_widths_cm):
    add_table_caption(doc, f'Tabela {table_no}. {caption} (źródło: opracowanie własne)')
    table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.autofit = False
    for i, w in enumerate(col_widths_cm):
        table.columns[i].width = Cm(w)

    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.width = Cm(col_widths_cm[i])
        shade_cell(cell, 'D9D9D9')
        p = cell.paragraphs[0]
        pf = p.paragraph_format
        pf.line_spacing = 1.15
        r = p.add_run(h)
        set_run(r, bold=True)

    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row):
            cell = table.rows[r_idx].cells[c_idx]
            cell.width = Cm(col_widths_cm[c_idx])
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

    add_heading(doc, '5.3. Archiwizacja danych — przechowywanie, kopie zapasowe i zgodność z RODO', size=12)

    add_paragraph(doc, [
        ('Archiwizacja danych w systemie operującym na informacjach o dobrostanie psychicznym pracowników jest zagadnieniem szczególnie wrażliwym. Przepisy ogólnego rozporządzenia o ochronie danych osobowych (RODO) klasyfikują dane dotyczące zdrowia jako ', ),
        ('dane szczególnej kategorii', 'b'),
        (' (art. 9), wobec których stosuje się zaostrzone wymogi: minimalizacji, ograniczenia celu, ograniczenia przechowywania oraz integralności i poufności. W projekcie inżynierskim MoodFlow zagadnienie archiwizacji obejmuje cztery komplementarne obszary: ', ),
        ('miejsce przechowywania danych', 'b'),
        (' (relacyjna baza PostgreSQL), ', ),
        ('mechanizm tworzenia kopii zapasowych', 'b'),
        (' (snapshoty platformy Railway uzupełnione procedurą ręczną), ', ),
        ('politykę usuwania danych', 'b'),
        (' (twarde usuwanie z propagacją kaskadową) oraz ', ),
        ('realizację praw osób, których dane dotyczą', 'b'),
        (' (w szczególności prawa do bycia zapomnianym z art. 17 RODO).', ),
    ])

    add_heading(doc, 'Klasyfikacja danych w systemie', level=3)

    add_paragraph(doc, [
        ('Dane przechowywane w bazie systemu można podzielić na trzy zasadnicze kategorie pod względem strategii archiwizacji. ', ),
        ('Dane identyfikujące', 'b'),
        (' (tabele ', ),
        ('users', 'm'),
        (', ', ),
        ('organizations', 'm'),
        (', ', ),
        ('departments', 'm'),
        (') zawierają informacje umożliwiające identyfikację osoby fizycznej lub prawnej i są usuwane na żądanie pracownika lub administratora. ', ),
        ('Dane wynikowe', 'b'),
        (' (', ),
        ('assessment_results', 'm'),
        (', ', ),
        ('user_responses', 'm'),
        (', ', ),
        ('mood_checks', 'm'),
        (') powstają z odpowiedzi pracownika na kwestionariusze psychometryczne; są ściśle związane z konkretnym kontem i podlegają usunięciu razem z nim. ', ),
        ('Dane audytowe', 'b'),
        (' (', ),
        ('audit_logs', 'm'),
        (') rejestrują działania administracyjne (zatwierdzenia kont, zmiany ról, usunięcia) i są celowo odporne na usunięcie konta — ich obecność stanowi niezbędny ślad odpowiedzialności prawnej i operacyjnej.', ),
    ])

    add_heading(doc, 'Twarde usuwanie konta z propagacją kaskadową', level=3)

    add_paragraph(doc, [
        ('Pracownik może w dowolnym momencie zażądać usunięcia swojego konta. Operację realizuje metoda ', ),
        ('deleteAccount', 'm'),
        (' w klasie ', ),
        ('UsersService', 'm'),
        ('. Wykonuje ona dwa kroki: ', ),
        ('twarde usunięcie', 'b'),
        (' rekordu z tabeli ', ),
        ('users', 'm'),
        (' (', ),
        ('hard delete', 'i'),
        (', a nie ', ),
        ('soft delete', 'i'),
        (' z flagą deletedAt) oraz zapisanie wpisu w dzienniku audytu o akcji ', ),
        ('ACCOUNT_DELETED', 'm'),
        (' wraz z metadanymi (e-mail i rola usuwanego konta). Wybór twardego usuwania zamiast oznaczania rekordu jako usuniętego wynika bezpośrednio z wymogów RODO — ', ),
        ('prawo do bycia zapomnianym', 'b'),
        (' (art. 17) oczekuje fizycznego wymazania danych, a nie jedynie ich ukrycia z poziomu interfejsu użytkownika.', ),
    ])

    add_listing(
        doc,
        listing_no='5.1',
        title='Metoda deleteAccount realizująca prawo do bycia zapomnianym',
        file_path='backend-api/src/modules/users/users.service.ts',
        lines='196–209',
        comment=(
            'Listing 5.1 prezentuje metodę deleteAccount. Operacja na bazie '
            'jest wykonywana jako fizyczny DELETE — TypeORM nie wykorzystuje '
            'soft delete, ponieważ żadna encja nie posiada pola @DeleteDateColumn. '
            'Po skutecznym usunięciu rekordu serwis audytu zapisuje wpis '
            'ACCOUNT_DELETED z metadanymi pierwotnego konta. Sam zapis audytu '
            'pozostaje w bazie nawet po usunięciu konta, ponieważ tabela '
            'audit_logs nie jest powiązana relacją z kaskadowym usuwaniem.'
        ),
    )

    add_paragraph(doc, [
        ('Wraz z usunięciem rekordu z tabeli ', ),
        ('users', 'm'),
        (' baza danych automatycznie usuwa wszystkie powiązane rekordy z tabel zależnych. Zapewnia to mechanizm ', ),
        ('ON DELETE CASCADE', 'b'),
        (' zdefiniowany w relacjach TypeORM. Encja ', ),
        ('AssessmentResult', 'm'),
        (' deklaruje relację ', ),
        ('@ManyToOne(() => User, { onDelete: \'CASCADE\' })', 'm'),
        (' — w konsekwencji usunięcie pracownika powoduje fizyczne wymazanie wszystkich jego wyników testów. Analogiczna kaskada obowiązuje dla ', ),
        ('user_responses', 'm'),
        (' (przez relację z ', ),
        ('AssessmentResult', 'm'),
        (') oraz ', ),
        ('mood_checks', 'm'),
        ('. Dzięki temu pojedyncza operacja DELETE wykonana na koncie pracownika usuwa kompletny zestaw jego danych psychometrycznych z bazy w jednej transakcji.', ),
    ])

    add_heading(doc, 'Dziennik audytu jako trwały ślad odpowiedzialności', level=3)

    add_paragraph(doc, [
        ('Tabela ', ),
        ('audit_logs', 'm'),
        (' jest projektowo wyłączona z mechanizmu kaskadowego usuwania. Pole ', ),
        ('actorUserId', 'm'),
        (' zostało zadeklarowane jako zwykła kolumna ', ),
        ('int', 'm'),
        (' — nie istnieje relacja ', ),
        ('@ManyToOne', 'm'),
        (' do encji ', ),
        ('User', 'm'),
        (', co oznacza, że usunięcie konta pracownika nie powoduje usunięcia wpisów audytowych dotyczących jego działań. Decyzja ta jest świadoma i zgodna z dobrymi praktykami: dziennik audytu pełni funkcję dowodową i nie powinien zniknąć wraz z osobą, która wykonała daną operację. W razie późniejszej kontroli możliwe jest odtworzenie historii działań administracyjnych nawet po usunięciu odpowiednich kont.', ),
    ])

    add_listing(
        doc,
        listing_no='5.2',
        title='Encja AuditLog z polem actorUserId bez relacji kaskadowej',
        file_path='backend-api/src/modules/audit/entities/audit-log.entity.ts',
        lines='1–52',
        comment=(
            'Listing 5.2 prezentuje encję AuditLog. Pola actorUserId, '
            'organizationId, entityId są kolumnami typu int o opcji nullable. '
            'Brak deklaracji @ManyToOne wobec User i Organization jest '
            'celowy — chroni dziennik audytu przed zniknięciem w wyniku '
            'kaskadowego usunięcia. Indeksy na (actorUserId, createdAt), '
            '(organizationId, createdAt) i (entityType, entityId) optymalizują '
            'najczęstsze zapytania filtrujące dziennik po kryteriach '
            'śledczych.'
        ),
    )

    add_heading(doc, 'Kopie zapasowe bazy danych — Railway i procedura ręczna', level=3)

    add_paragraph(doc, [
        ('System produkcyjny korzysta z bazy PostgreSQL hostowanej na platformie ', ),
        ('Railway', 'b'),
        (', która domyślnie wykonuje ', ),
        ('automatyczne dzienne snapshoty', 'b'),
        (' całej bazy. Snapshoty są przechowywane przez okres ustawiony w panelu Railway (domyślnie 7 dni) i można z nich odtworzyć stan bazy do dowolnego momentu w obrębie okna retencji. Decyzja o powierzeniu kopii zapasowych platformie chmurowej — zamiast budowania własnego systemu kopii — wynika ze skali projektu inżynierskiego: własna infrastruktura backupu (np. ', ),
        ('pgBackRest', 'm'),
        (', skrypty cron z rotacją do S3) wymagałaby istotnego nakładu konfiguracyjnego nieprzystającego do zakresu pracy. Dla wdrożeń lokalnych (Docker Compose) udokumentowano procedurę ręcznego wykonania kopii za pomocą narzędzia ', ),
        ('pg_dump', 'm'),
        (' z poziomu kontenera, z możliwością harmonogramowania przez ', ),
        ('cron', 'm'),
        ('.', ),
    ])

    add_listing(
        doc,
        listing_no='5.3',
        title='Procedura ręcznej kopii zapasowej w wdrożeniu kontenerowym',
        file_path='docs/deployment.md',
        lines='106–115',
        comment=(
            'Listing 5.3 prezentuje fragment dokumentacji wdrożeniowej. '
            'Polecenie pg_dump jest wykonywane z poziomu kontenera bazy '
            'danych z parametrami pobranymi ze zmiennych środowiskowych. '
            'Format nazwy pliku zawiera datę w postaci YYYYMMDD, co ułatwia '
            'wersjonowanie i automatyczne czyszczenie starszych kopii. '
            'Plik wynikowy ma format SQL — można go przywrócić poleceniem '
            'psql lub pg_restore w razie potrzeby.'
        ),
    )

    add_heading(doc, 'Wersjonowanie schematu bazy — migracje TypeORM', level=3)

    add_paragraph(doc, [
        ('Schemat bazy danych jest wersjonowany za pomocą mechanizmu migracji TypeORM. Każda zmiana struktury (utworzenie tabeli, dodanie kolumny, modyfikacja indeksu) jest zapisywana jako pojedynczy plik migracyjny w katalogu ', ),
        ('backend-api/src/migrations/', 'm'),
        (' i wykonywana sekwencyjnie. Konfiguracja udostępnia pięć skryptów npm: ', ),
        ('migration:generate', 'm'),
        (' (automatyczne wygenerowanie migracji na podstawie różnic między encjami a stanem bazy), ', ),
        ('migration:create', 'm'),
        (' (utworzenie pustego pliku do ręcznej edycji), ', ),
        ('migration:run', 'm'),
        (' (zastosowanie nieaktywowanych migracji), ', ),
        ('migration:revert', 'm'),
        (' (cofnięcie ostatniej migracji) oraz ', ),
        ('migration:show', 'm'),
        (' (lista migracji z ich statusem). Mechanizm ten zapewnia powtarzalność wdrożeń i możliwość odtworzenia struktury bazy w dowolnym środowisku.', ),
    ])

    add_heading(doc, 'Realizacja praw osób, których dane dotyczą — RODO', level=3)

    add_paragraph(doc, [
        ('System adresuje cztery kluczowe prawa wynikające z RODO, w stopniu adekwatnym do skali pracy inżynierskiej. Zestawienie obecnego stanu implementacji oraz planowanych rozszerzeń przedstawia tabela 5.12.', ),
    ])

    add_data_table(
        doc,
        table_no='5.12',
        caption='Realizacja praw osób, których dane dotyczą, w systemie MoodFlow',
        headers=['Prawo (RODO)', 'Stan obecny', 'Mechanizm w systemie'],
        col_widths_cm=[5.5, 3.0, 7.5],
        rows=[
            ('Art. 15 — prawo dostępu do danych', 'Częściowo', 'Profil użytkownika /users/me, historia wyników /results, mood checks /mood-checks/me/history. Dane dostępne w odrębnych endpointach.'),
            ('Art. 17 — prawo do bycia zapomnianym', 'Tak', 'Endpoint DELETE konta wywołuje deleteAccount; CASCADE usuwa odpowiedzi, wyniki, mood checks. Dziennik audytu zachowuje sam fakt usunięcia.'),
            ('Art. 20 — prawo do przenoszenia danych', 'Planowane', 'Brak dedykowanego endpointu eksportu — w przyszłości GET /users/me/export zwracający komplet danych w formacie JSON.'),
            ('Art. 30 — rejestr czynności przetwarzania', 'Tak', 'Tabela audit_logs zawiera wpisy o wszystkich operacjach administracyjnych (zatwierdzenia, zmiany ról, usunięcia kont).'),
        ],
    )

    add_paragraph(doc, [
        ('Najpełniej zaimplementowane jest prawo do bycia zapomnianym — pojedynczy endpoint usuwa konto wraz z całą zawartością psychometryczną w jednej transakcji bazodanowej, a fakt usunięcia pozostaje w dzienniku audytu jako jednowierszowy ślad bez identyfikatora osoby (sam ', ),
        ('actorUserId', 'm'),
        (' wskazujący usunięty rekord nie jest już rozwiązywalny do tożsamości). Prawo dostępu do danych z art. 15 jest realizowane częściowo — użytkownik może obejrzeć swoje dane przez interfejs aplikacji, ale brakuje skonsolidowanego eksportu w jednym pakiecie. Prawo do przenoszenia danych z art. 20 nie jest obecnie obsługiwane i znajduje się w sekcji „dalszego rozwoju systemu" jako endpoint ', ),
        ('GET /users/me/export', 'm'),
        (' generujący archiwum JSON.', ),
    ])

    add_heading(doc, 'Świadome ograniczenia i kierunki dalszego rozwoju', level=3)

    add_paragraph(doc, [
        ('Architektura archiwizacji w obecnym kształcie ma trzy świadomie zaakceptowane ograniczenia. ', ),
        ('Brak retencji dziennika audytu', 'b'),
        (' — tabela ', ),
        ('audit_logs', 'm'),
        (' rośnie liniowo wraz z liczbą operacji administracyjnych i nie posiada zaplanowanego zadania czyszczącego. Dla skali projektu inżynierskiego (pojedyncze firmy testowe, nieliczne operacje) jest to akceptowalne, ale w środowisku produkcyjnym z wieloma organizacjami i wysoką częstotliwością operacji konieczne byłoby wprowadzenie polityki retencji (np. anonimizacja wpisów starszych niż 365 dni). ', ),
        ('Brak soft delete', 'b'),
        (' — konsekwentnie stosowane twarde usuwanie eliminuje możliwość przywrócenia konta po pomyłkowym żądaniu usunięcia; w środowisku produkcyjnym warto rozważyć krótki okres karencji (np. 30 dni) z możliwością cofnięcia decyzji przez użytkownika. ', ),
        ('Brak dedykowanego endpointu eksportu', 'b'),
        (' — realizacja prawa do przenoszenia danych (art. 20 RODO) wymaga obecnie korzystania z wielu endpointów, podczas gdy dobrą praktyką jest udostępnienie pojedynczego pliku archiwum (najczęściej JSON lub ZIP zawierający JSON i CSV). Wszystkie te ograniczenia są opisane w sekcji „dalszego rozwoju systemu" jako naturalne kierunki rozszerzenia.', ),
    ])

    add_heading(doc, 'Podsumowanie warstwy archiwizacji', level=3)

    add_paragraph(doc, [
        ('Archiwizacja danych w MoodFlow opiera się na czterech filarach: relacyjnej bazie PostgreSQL z wersjonowanym schematem (migracje TypeORM), automatycznych snapshotach platformy Railway uzupełnionych procedurą ręcznego ', ),
        ('pg_dump', 'm'),
        (', twardym usuwaniu konta z propagacją kaskadową realizującym prawo do bycia zapomnianym oraz dzienniku audytu odpornym na kaskadowe usuwanie zapewniającym ślad odpowiedzialności prawnej. Mechanizm ten spełnia minimalne wymogi zgodności z RODO dla systemu inżynierskiego operującego na danych szczególnej kategorii. Trzy świadomie zaakceptowane ograniczenia — brak retencji audytu, brak soft delete oraz brak skonsolidowanego eksportu — zostały opisane jako kierunki dalszego rozwoju i nie wpływają na funkcjonalność systemu w obecnym zakresie pracy inżynierskiej.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/5.3-Archiwizacja-danych.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
