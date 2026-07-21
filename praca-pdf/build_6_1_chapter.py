#!/usr/bin/env python3
"""6.1. Instalacja lokalna w Docker Compose — wersja skrócona — DOCX zgodny z formatem CDV."""

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


def add_command_box(doc, command):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(2)
    pf.space_after = Pt(6)
    pf.left_indent = Cm(0.6)
    r = p.add_run(command)
    set_run(r, mono=True, size=9)


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

    add_heading(doc, '6.1. Instalacja lokalna w środowisku Docker Compose', size=12)

    add_paragraph(doc, [
        ('System MoodFlow uruchamia się lokalnie pojedynczym poleceniem ', ),
        ('docker compose up', 'm'),
        ('. Konteneryzacja pełnego stosu (aplikacja pracownika, panel administracyjny, backend NestJS, baza PostgreSQL, narzędzie Adminer do podglądu bazy) eliminuje typowe problemy konfiguracyjne wynikające z różnic między systemami operacyjnymi deweloperów. Procedura uruchomienia jest deterministyczna i powtarzalna na macOS, Linuksie oraz Windowsie z WSL2.', ),
    ])

    add_heading(doc, 'Wymagania wstępne', level=3)

    add_paragraph(doc, [
        ('Niezbędny jest ', ),
        ('Docker Engine 24+', 'b'),
        (' wraz z Docker Compose v2 (zintegrowany z Dockerem od wersji 20.10) oraz klient ', ),
        ('git', 'm'),
        (' do pobrania repozytorium. Wymagane są wolne porty: ', ),
        ('3000', 'm'),
        (' (aplikacja pracownika), ', ),
        ('3001', 'm'),
        (' (panel administracyjny), ', ),
        ('4000', 'm'),
        (' (backend), ', ),
        ('5050', 'm'),
        (' (Adminer), ', ),
        ('5432', 'm'),
        (' (PostgreSQL). Do wygenerowania bezpiecznych sekretów JWT pomocny jest ', ),
        ('Node.js 20+', 'm'),
        (' zainstalowany na hoście.', ),
    ])

    add_heading(doc, 'Procedura uruchomienia', level=3)

    add_paragraph(doc, [
        ('Procedura składa się z czterech kroków. ', ),
        ('Krok pierwszy', 'b'),
        (' — sklonowanie repozytorium projektu i przejście do katalogu głównego:', ),
    ])
    add_command_box(doc, 'git clone <adres-repozytorium-MoodFlow>.git && cd MoodFlow')

    add_paragraph(doc, [
        ('Krok drugi', 'b'),
        (' — utworzenie pliku konfiguracyjnego z dostarczonego szablonu i wygenerowanie silnych sekretów JWT (oba muszą być różne, mieć min. 32 znaki i nie zawierać typowych słów-pułapek — backend ma wbudowaną walidację fail-fast):', ),
    ])
    add_command_box(doc,
        'cp .env.example .env\n'
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n'
        '# Wklej wynik dwukrotnie do .env jako JWT_SECRET i JWT_REFRESH_SECRET'
    )

    add_paragraph(doc, [
        ('Krok trzeci', 'b'),
        (' — uruchomienie wszystkich kontenerów w tle z automatycznym zbudowaniem obrazów. Pierwsze uruchomienie trwa kilka minut (pobieranie obrazów bazowych Docker, kompilacja TypeScript, instalacja zależności):', ),
    ])
    add_command_box(doc, 'docker compose up -d --build')

    add_paragraph(doc, [
        ('Krok czwarty', 'b'),
        (' — weryfikacja poprawnego startu poprzez śledzenie logów backendu (oczekiwany komunikat „Backend API działa na porcie 4000"):', ),
    ])
    add_command_box(doc, 'docker compose logs -f backend-api')

    add_heading(doc, 'Weryfikacja działania i pierwsze logowanie', level=3)

    add_paragraph(doc, [
        ('Po pomyślnym uruchomieniu dostępne są: aplikacja pracownika pod adresem ', ),
        ('http://localhost:3000', 'm'),
        (', panel administracyjny pod ', ),
        ('http://localhost:3001', 'm'),
        (', a endpoint zdrowia backendu — ', ),
        ('http://localhost:4000/health', 'm'),
        (' — zwraca strukturę JSON ze statusem aplikacji i wynikiem testu połączenia z bazą. Backend automatycznie wykonuje seed danych testowych: tworzy konto super-administratora (', ),
        ('owner@moodflow.pl', 'm'),
        (' z hasłem ', ),
        ('SuperAdmin1!', 'm'),
        (', które należy zmienić bezzwłocznie po pierwszym logowaniu) oraz ładuje definicje sześciu kwestionariuszy psychometrycznych (PHQ-9, GAD-7, PSS-10, WHO-5, MOOD10, DAILY_MOOD). Pierwsze logowanie odbywa się w panelu administracyjnym pod adresem ', ),
        ('http://localhost:3001/super-admin/login', 'm'),
        ('. Pełen reset środowiska wraz z usunięciem wolumenów bazy wykonuje polecenie ', ),
        ('docker compose down -v', 'm'),
        ('.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/6.1-Instalacja-lokalna.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
