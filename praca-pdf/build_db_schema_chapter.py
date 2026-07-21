#!/usr/bin/env python3
"""Generuje podrozdział 'Schemat bazy danych' w pliku DOCX zgodnie ze wzorcem CDV."""

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def set_run(run, *, bold=False, italic=False, size=10, font='Verdana'):
    run.font.name = font
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), font)
    rFonts.set(qn('w:hAnsi'), font)
    rFonts.set(qn('w:cs'), font)


def add_paragraph(doc, runs, *, indent_first=True, justify=True, space_after=8,
                  line_spacing=1.15):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = line_spacing
    pf.space_before = Pt(0)
    pf.space_after = Pt(space_after)
    if indent_first:
        pf.first_line_indent = Cm(0.6)
    if justify:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    for text, *style in runs:
        bold = 'b' in style
        italic = 'i' in style
        r = p.add_run(text)
        set_run(r, bold=bold, italic=italic)
    return p


def add_heading(doc, text, *, size=11):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(6)
    pf.space_after = Pt(8)
    r = p.add_run(text)
    set_run(r, bold=True, size=size)


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(2)
    pf.space_after = Pt(10)
    r = p.add_run(text)
    set_run(r, italic=True)


def add_figure_placeholder(doc, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(4)
    r = p.add_run('[ TUTAJ WKLEJ DIAGRAM ERD — plik praca-pdf/Diagram-ERD.png ]')
    set_run(r, italic=True, bold=True)
    add_caption(doc, caption)


def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(0)
    pf.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p.runs[0] if p.runs else p.add_run('')
    r.text = text
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

    add_heading(doc, '3.2. Schemat bazy danych')

    add_paragraph(doc, [
        ('Warstwę trwałego przechowywania danych aplikacji MoodFlow stanowi relacyjna baza danych ', ),
        ('PostgreSQL 16', 'b'),
        ('. Wybór modelu relacyjnego wynika z charakteru przetwarzanych informacji — silnie ustrukturyzowanych, powiązanych ze sobą zależnościami referencyjnymi (klucze obce) i wymagających transakcyjności typu ACID. Dane dotyczące dobrostanu pracowników, wyników testów psychologicznych oraz konfiguracji wielu organizacji w architekturze ', ),
        ('multi-tenant', 'i'),
        (' wymagają jednoznacznych powiązań, walidowanej spójności oraz izolacji na poziomie wierszy. Z uwagi na te wymagania zrezygnowano z baz dokumentowych typu NoSQL, których model danych byłby niewystarczająco rygorystyczny dla warstwy domenowej tego systemu.', ),
    ])

    add_paragraph(doc, [
        ('Komunikacja warstwy serwerowej z bazą danych odbywa się za pośrednictwem biblioteki ', ),
        ('TypeORM', 'b'),
        (' — mapera obiektowo-relacyjnego (ORM) zintegrowanego z frameworkiem ', ),
        ('NestJS', 'b'),
        ('. Każda tabela jest reprezentowana w kodzie jako encja TypeScript opatrzona dekoratorami opisującymi kolumny, klucze i relacje. Relacje 1:N oraz N:1 zostały zadeklarowane bezpośrednio w encjach przy użyciu dekoratorów ', ),
        ('@OneToMany', 'i'),
        (' i ', ),
        ('@ManyToOne', 'i'),
        (', co umożliwia czytelne nawigowanie po grafie obiektów oraz automatyczne dołączanie powiązanych rekordów (', ),
        ('eager / lazy loading', 'i'),
        (').', ),
    ])

    add_paragraph(doc, [
        ('Struktura schematu została zaprojektowana zgodnie z trzecią postacią normalną (3NF) — każda nieklucząca kolumna zależy wyłącznie od klucza głównego, eliminowane są redundancje, a powiązania pomiędzy bytami biznesowymi modelowane są przez tabele słownikowe i klucze obce. Dane półstrukturalne, dla których pełna normalizacja byłaby nieefektywna (np. metadane wpisów audytu, snapshoty odpowiedzi), są przechowywane w kolumnach typu ', ),
        ('jsonb', 'i'),
        (', co zachowuje elastyczność modelu przy jednoczesnym wsparciu indeksowania i zapytań po polach JSON oferowanym przez PostgreSQL.', ),
    ])

    add_paragraph(doc, [
        ('Diagram związków encji (ERD) przedstawiony na Rysunku 3.2 prezentuje pełną strukturę bazy danych aplikacji MoodFlow wraz z relacjami pomiędzy tabelami. Notacja diagramu opiera się na tzw. ', ),
        ('kurzych nóżkach', 'i'),
        (' (', ),
        ('crow’s foot notation', 'i'),
        ('), gdzie symbol jednej kreski oznacza krotność „jeden”, a rozwidlenie — krotność „wiele”. Klucze główne (PK) zostały oznaczone w lewej kolumnie tabeli oraz wyróżnione przez podkreślenie nazwy pola, a klucze obce (FK) — przez etykietę FK i odwołanie do tabeli źródłowej.', ),
    ])

    add_figure_placeholder(
        doc,
        'Rysunek 3.2 Diagram ERD bazy danych aplikacji MoodFlow (źródło: opracowanie własne)'
    )

    add_paragraph(doc, [
        ('Schemat zawiera jedenaście podstawowych tabel, które można pogrupować w cztery logiczne obszary domenowe odpowiadające głównym modułom aplikacji.', ),
    ])

    add_heading(doc, 'Obszar I — wielodostępność i tożsamość użytkowników', size=10)

    add_paragraph(doc, [
        ('Tabele ', ),
        ('organizations', 'b'),
        (', ', ),
        ('departments', 'b'),
        (' oraz ', ),
        ('users', 'b'),
        (' realizują architekturę ', ),
        ('multi-tenant', 'i'),
        (' z izolacją na poziomie wierszy. Każdy rekord użytkownika oraz każdy obiekt operacyjny powiązany jest kluczem obcym ', ),
        ('organizationId', 'i'),
        (' z konkretną organizacją, co gwarantuje, że dane jednej firmy są fizycznie i logicznie odseparowane od danych innych klientów platformy. Tabela ', ),
        ('organizations', 'b'),
        (' przechowuje metadane firmy (nazwa, NIP, kod zaproszenia, status cyklu życia: ', ),
        ('pending', 'i'),
        (', ', ),
        ('active', 'i'),
        (', ', ),
        ('blocked', 'i'),
        (' lub ', ),
        ('rejected', 'i'),
        ('), a tabela ', ),
        ('users', 'b'),
        (' — konta indywidualne, role w systemie (', ),
        ('employee', 'i'),
        (', ', ),
        ('hr', 'i'),
        (', ', ),
        ('admin', 'i'),
        (', ', ),
        ('super_admin', 'i'),
        (') oraz status konta. Hasła nigdy nie są przechowywane w postaci jawnej; pole ', ),
        ('passwordHash', 'i'),
        (' zawiera skrót algorytmu ', ),
        ('bcrypt', 'b'),
        (' z kosztem 12 rund.', ),
    ])

    add_heading(doc, 'Obszar II — definicje testów psychologicznych', size=10)

    add_paragraph(doc, [
        ('Tabele ', ),
        ('assessments', 'b'),
        (', ', ),
        ('questions', 'b'),
        (' oraz ', ),
        ('answer_options', 'b'),
        (' przechowują definicje pięciu walidowanych testów psychologicznych zaimplementowanych w aplikacji: PHQ-9, GAD-7, PSS-10, WHO-5 oraz autorskiego testu nastroju MOOD10. Tabela ', ),
        ('assessments', 'b'),
        (' zawiera metadane testu (kod, nazwa, opis, liczba pytań, wersja, flagi aktywności i anonimizacji dla HR), a tabele ', ),
        ('questions', 'b'),
        (' i ', ),
        ('answer_options', 'b'),
        (' — odpowiednio treść poszczególnych pytań i opcje odpowiedzi w skali Likerta. Powiązanie 1:N z testem oraz pole ', ),
        ('order', 'i'),
        (' utrzymują kolejność prezentacji w interfejsie pracownika.', ),
    ])

    add_heading(doc, 'Obszar III — przypisania, wyniki i odpowiedzi', size=10)

    add_paragraph(doc, [
        ('Trzy najbardziej obciążone tabele systemu — ', ),
        ('assessment_assignments', 'b'),
        (', ', ),
        ('assessment_results', 'b'),
        (' i ', ),
        ('user_responses', 'b'),
        (' — opisują pełen cykl życia testu wypełnianego przez pracownika. Rekord w tabeli przypisań (', ),
        ('assessment_assignments', 'i'),
        (') określa, którzy pracownicy mają wykonać dany test (typ celu: ', ),
        ('ALL', 'i'),
        (', ', ),
        ('USER', 'i'),
        (' lub ', ),
        ('DEPARTMENT', 'i'),
        ('), w jakim oknie czasowym oraz przez kogo zostali przypisani. Po wypełnieniu testu w tabeli ', ),
        ('assessment_results', 'b'),
        (' powstaje rekord wyniku zawierający wynik surowy (', ),
        ('rawScore', 'i'),
        ('), wynik znormalizowany w skali 0–100 (', ),
        ('normalizedScore', 'i'),
        ('), interpretację poziomu nasilenia (', ),
        ('severity', 'i'),
        (') oraz flagi ryzyka (', ),
        ('riskFlags', 'i'),
        ('). Pojedyncze odpowiedzi pracownika na każde pytanie są zapisywane w tabeli ', ),
        ('user_responses', 'b'),
        (', co umożliwia ponowną analizę i ewentualną rekalkulację wyników.', ),
    ])

    add_paragraph(doc, [
        ('Logika obliczania wyniku znajduje się wyłącznie po stronie backendu w klasach serwisowych modułu ', ),
        ('assessments', 'i'),
        (', co eliminuje ryzyko manipulacji punktacją z poziomu klienta i pozwala na centralne wprowadzanie zmian w algorytmach scoringu psychologicznego.', ),
    ])

    add_heading(doc, 'Obszar IV — bezpieczeństwo, audyt i komunikacja', size=10)

    add_paragraph(doc, [
        ('Tabele ', ),
        ('audit_logs', 'b'),
        (' oraz ', ),
        ('notifications', 'b'),
        (' wspierają wymagania bezpieczeństwa i komunikacji w systemie. Dziennik audytu rejestruje krytyczne zdarzenia (logowania, zmiany ról, zatwierdzanie kont, eksporty danych, blokady firm) wraz z identyfikatorem użytkownika wykonującego operację, znacznikiem czasu, adresem IP oraz strukturą metadanych w polu ', ),
        ('jsonb', 'i'),
        ('. Wpisy są niemodyfikowalne (append-only), co spełnia wymóg integralności śladu audytowego oraz wspiera zgodność z RODO w zakresie rozliczalności (art. 5 ust. 2). Tabela ', ),
        ('notifications', 'b'),
        (' przechowuje powiadomienia w aplikacji przeznaczone dla pracowników (np. informacja o przypisanym teście) z polem statusu odczytania oraz głębokim linkiem do odpowiedniego widoku w aplikacji.', ),
    ])

    add_heading(doc, 'Indeksowanie i wydajność zapytań', size=10)

    add_paragraph(doc, [
        ('W bazie zostały zdefiniowane indeksy na kluczach obcych oraz na polach często używanych w klauzulach ', ),
        ('WHERE', 'i'),
        (' (m.in. ', ),
        ('users.email', 'i'),
        (', ', ),
        ('assessment_results.userId', 'i'),
        (', ', ),
        ('assessment_results.organizationId', 'i'),
        (', ', ),
        ('audit_logs.organizationId', 'i'),
        ('). Indeks ', ),
        ('UNIQUE', 'i'),
        (' na polach ', ),
        ('users.email', 'i'),
        (' oraz ', ),
        ('organizations.nip', 'i'),
        (' wymusza globalną unikalność identyfikatorów logowania i numerów identyfikacyjnych firm. Pola typu ', ),
        ('jsonb', 'i'),
        (' (np. ', ),
        ('audit_logs.metadata', 'i'),
        (') mogą być w przyszłości wyposażone w indeksy GIN dla zapytań po atrybutach metadanych, co stanowi przewagę PostgreSQL nad innymi systemami relacyjnymi.', ),
    ])

    add_heading(doc, 'Migracje i zarządzanie schematem', size=10)

    add_paragraph(doc, [
        ('Schemat bazy danych jest wersjonowany razem z kodem aplikacji w katalogu ', ),
        ('backend-api/src/database/migrations/', 'i'),
        ('. Każda istotna zmiana modelu danych (dodanie kolumny, modyfikacja typu, utworzenie nowej tabeli) jest zapisywana jako odrębny skrypt migracyjny TypeORM. W środowisku rozwojowym wykorzystywany jest tryb synchronizacji schematu z encjami TypeScript, natomiast w środowisku produkcyjnym schemat jest tworzony i aktualizowany wyłącznie przez kontrolowane uruchomienie migracji, co zapobiega niezamierzonym zmianom struktury bazy.', ),
    ])

    add_heading(doc, 'Anonimizacja na poziomie zapytań analitycznych', size=10)

    add_paragraph(doc, [
        ('Choć baza danych przechowuje pełne dane wyników testów wraz z identyfikatorem pracownika, warstwa serwerowa udostępnia widokom HR wyłącznie zapytania zagregowane (np. średnia wartość ', ),
        ('normalizedScore', 'i'),
        (' w obrębie działu) z dodatkowym warunkiem ', ),
        ('HAVING COUNT(*) ≥ 5', 'i'),
        (', co realizuje politykę ', ),
        ('k-anonimowości', 'b'),
        (' z parametrem k=5. Dzięki temu raporty zawsze obejmują grupę co najmniej pięciu pracowników, co uniemożliwia identyfikację konkretnego respondenta nawet osobie posiadającej dostęp do panelu HR.', ),
    ])

    add_paragraph(doc, [
        ('Zaprojektowany schemat bazy danych jest spójny z ideą produktu — łączy ścisłą strukturalizację wymaganą dla danych osobowych pracowników z elastycznością niezbędną dla rozszerzania modułu testów oraz audytu. Stanowi solidny fundament zarówno dla obecnych funkcjonalności aplikacji, jak i jej dalszej rozbudowy w ramach pracy poza zakresem inżynierskim.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/3.2-Schemat-bazy-danych.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
