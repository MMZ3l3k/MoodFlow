#!/usr/bin/env python3
"""
Generuje samodzielny dokument:
  „Plan monitorowania jakości wraz z formatką scenariusza testowego”
w formacie DOCX (A4 pionowy, Verdana 10, interlinia 1.15, justify) —
zgodnie z konwencją innych rozdziałów pracy inżynierskiej.

Zawartość:
  1. Cele monitorowania jakości
  2. Typy testów
  3. Środowiska testowe
  4. Metryki jakości i kryteria akceptacji
  5. Proces zarządzania defektami
  6. Formatka scenariusza testowego (edytowalna)
  7. Przykłady wypełnionych scenariuszy (3 przypadki)
  8. Sposób raportowania wyników

Wyjście: Plan-QA-Formatka-Testowa.docx
"""
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# =========================================================
# Paleta
# =========================================================
NAVY      = "1D3E44"
HEADER_BG = "1D3E44"
ALT_BG    = "F4F1E8"
STATUS_PASS    = "16A34A"
STATUS_FAIL    = "B8125A"
STATUS_BLOCKED = "D97706"


# =========================================================
# OOXML helpers (zgodne ze stylem innych dokumentów)
# =========================================================
def set_run(run, *, bold=False, italic=False, size=10, color=None,
            font="Verdana", mono=False):
    name = "Consolas" if mono else font
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:cs"), name)


def add_para(doc, runs, *, indent_first=True, justify=True, space_after=8,
             line_spacing=1.15, align=None, size=10):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = line_spacing
    pf.space_before = Pt(0)
    pf.space_after = Pt(space_after)
    if indent_first:
        pf.first_line_indent = Cm(0.6)
    if align:
        p.alignment = align
    elif justify:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if isinstance(runs, str):
        r = p.add_run(runs); set_run(r, size=size)
    else:
        for item in runs:
            if isinstance(item, str):
                r = p.add_run(item); set_run(r, size=size)
            else:
                text, *style = item
                r = p.add_run(text)
                set_run(r, bold="b" in style, italic="i" in style,
                        mono="m" in style, size=size)
    return p


def add_heading(doc, text, *, level=2, size=None, color=NAVY,
                space_before=14, space_after=8):
    if size is None:
        size = {1: 16, 2: 13, 3: 11}.get(level, 11)
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    r = p.add_run(text)
    set_run(r, bold=True, size=size, color=color)


def add_bullet(doc, content, *, mono_first=False):
    p = doc.add_paragraph(style="List Bullet")
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(0)
    pf.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if p.runs:
        p.runs[0].text = ""
        set_run(p.runs[0])
    if isinstance(content, str):
        r = p.add_run(content); set_run(r)
    else:
        for item in content:
            if isinstance(item, str):
                r = p.add_run(item); set_run(r)
            else:
                text, *style = item
                r = p.add_run(text)
                set_run(r, bold="b" in style, italic="i" in style,
                        mono="m" in style)


# ----- Cell helpers -----
def shade_cell(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    for s in tc_pr.findall(qn("w:shd")):
        tc_pr.remove(s)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex)
    tc_pr.append(shd)


def set_cell_border(cell, color="999999", size=4):
    tc_pr = cell._tc.get_or_add_tcPr()
    for tb in tc_pr.findall(qn("w:tcBorders")):
        tc_pr.remove(tb)
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), str(size))
        b.set(qn("w:color"), color)
        borders.append(b)
    tc_pr.append(borders)


def set_cell_width(cell, width_cm):
    cell.width = Cm(width_cm)
    tc_pr = cell._tc.get_or_add_tcPr()
    for w in tc_pr.findall(qn("w:tcW")):
        tc_pr.remove(w)
    tcW = OxmlElement("w:tcW")
    tcW.set(qn("w:type"), "dxa")
    tcW.set(qn("w:w"), str(int(width_cm * 567)))
    tc_pr.append(tcW)


def set_table_grid(table, col_widths_cm):
    tbl = table._element
    tbl_pr = tbl.find(qn("w:tblPr"))
    tblGrid = tbl.find(qn("w:tblGrid"))
    if tblGrid is not None:
        tbl.remove(tblGrid)
    tblGrid = OxmlElement("w:tblGrid")
    for w_cm in col_widths_cm:
        gc = OxmlElement("w:gridCol")
        gc.set(qn("w:w"), str(int(w_cm * 567)))
        tblGrid.append(gc)
    tbl_pr.addnext(tblGrid)


def write_cell(cell, text, *, bold=False, italic=False, color=None, size=10,
               bg=None, align="left", anchor="center", mono=False):
    cell.text = ""
    cell.vertical_alignment = {
        "top": WD_ALIGN_VERTICAL.TOP,
        "center": WD_ALIGN_VERTICAL.CENTER,
        "bottom": WD_ALIGN_VERTICAL.BOTTOM,
    }[anchor]
    p = cell.paragraphs[0]
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(1); pf.space_after = Pt(1)
    p.alignment = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }[align]
    set_cell_border(cell)
    if bg:
        shade_cell(cell, bg)
    if text:
        lines = text.split("\n") if isinstance(text, str) else [text]
        for i, line in enumerate(lines):
            if i > 0:
                p = cell.add_paragraph()
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(line)
            set_run(r, bold=bold, italic=italic, color=color, size=size, mono=mono)


def add_table(doc, rows, col_widths, *, header_bg=HEADER_BG, header_color="FFFFFF",
              alt_bg=ALT_BG, sizes=None):
    n_cols = len(col_widths)
    table = doc.add_table(rows=len(rows), cols=n_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_grid(table, col_widths)

    for r_idx, row in enumerate(rows):
        is_header = (r_idx == 0)
        row_bg = header_bg if is_header else (alt_bg if r_idx % 2 == 0 else "FFFFFF")
        for c_idx, val in enumerate(row):
            size = (sizes[c_idx] if sizes else 9) if not is_header else 10
            write_cell(
                table.cell(r_idx, c_idx), str(val),
                bold=is_header,
                size=size,
                color=header_color if is_header else None,
                align="center" if is_header else "left",
                bg=row_bg if is_header else row_bg,
            )
            set_cell_width(table.cell(r_idx, c_idx), col_widths[c_idx])
    return table


def add_formatka_table(doc, fields, *, col_widths=(3.8, 12.5),
                       value_bg=None, label_bg="E8E8E8"):
    """Tworzy tabelę-formatkę 2-kolumnową: pole | wartość.
    `fields` = list of tuples (label, value).  Wartość pusta = pole do wypełnienia.
    """
    rows = max(len(fields), 1)
    table = doc.add_table(rows=rows, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_grid(table, list(col_widths))
    for i, (label, value) in enumerate(fields):
        write_cell(table.cell(i, 0), label,
                   bold=True, size=10, bg=label_bg, align="left", anchor="top")
        write_cell(table.cell(i, 1), value or "",
                   size=10, bg=value_bg or "FFFFFF", align="left", anchor="top")
        set_cell_width(table.cell(i, 0), col_widths[0])
        set_cell_width(table.cell(i, 1), col_widths[1])
    return table


# =========================================================
# Treść dokumentu
# =========================================================
def main():
    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Verdana"
    style.font.size = Pt(10)

    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width  = Cm(21.0)
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin   = Cm(2.2)
    section.right_margin  = Cm(1.8)

    # ---------- Strona tytułowa ----------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(40)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title_p.add_run("Plan monitorowania jakości MoodFlow")
    set_run(r, bold=True, size=20, color=NAVY)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_after = Pt(8)
    r = sub.add_run("Strategia testów, metryki jakości oraz formatka scenariusza testowego")
    set_run(r, italic=True, size=12, color="5A5E2C")

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.paragraph_format.space_after = Pt(30)
    r = meta.add_run("Mateusz Matczuk    ·    Praca inżynierska CDV    ·    2026")
    set_run(r, size=11)

    add_para(doc, [
        "Niniejszy dokument opisuje zasady monitorowania jakości aplikacji MoodFlow w trakcie ",
        "całego cyklu wytwórczego — od testów jednostkowych w warstwie scoringu, przez testy ",
        "integracyjne i bezpieczeństwa, aż po testy użyteczności prowadzone z udziałem ",
        "rzeczywistych użytkowników. Drugą częścią dokumentu jest ",
        ("formatka scenariusza testowego", "b"),
        " — szablon używany do dokumentowania pojedynczego testu klikalnego, wraz z trzema ",
        "przykładowymi, wypełnionymi scenariuszami z różnych obszarów systemu (autentykacja, ",
        "wynik testu psychologicznego z trybem safety-net, izolacja multi-tenant).",
    ])

    doc.add_page_break()

    # ---------- 1. Cele monitorowania jakości ----------
    add_heading(doc, "1.  Cele monitorowania jakości", level=1, size=15, space_before=0)
    add_para(doc, [
        "Celem planu jakości jest zapewnienie, że dostarczane funkcjonalności są ",
        ("poprawne", "b"), " (zgodne ze specyfikacją z rozdziału 2.4), ",
        ("bezpieczne", "b"), " (chronią dane wrażliwe dotyczące zdrowia psychicznego), ",
        ("użyteczne", "b"), " (umożliwiają pracownikowi szybkie wypełnienie ankiety) oraz ",
        ("wydajne", "b"), " (czas odpowiedzi API w rozsądnym przedziale). Monitorowanie ",
        "jakości prowadzone jest w sposób ",
        ("ciągły", "b"),
        " — równolegle z developmentem — a nie jako wydzielony etap końcowy.",
    ])
    add_para(doc, "Wynik każdej iteracji sprintu obejmuje raport z wykonanych scenariuszy "
                  "testowych, ze szczegółowym statusem (PASS / FAIL / BLOCKED / SKIPPED). "
                  "Status FAIL na ścieżce krytycznej blokuje merge do gałęzi master "
                  "do czasu naprawy i ponownego wykonania scenariusza.")

    # ---------- 2. Typy testów ----------
    add_heading(doc, "2.  Typy testów", level=1, size=15)
    add_para(doc, "W projekcie MoodFlow stosujemy sześć kategorii testów, każda o własnym "
                  "celu, zakresie i częstotliwości uruchamiania:")
    test_types = [
        ["Kategoria",          "Cel",                                  "Narzędzie",                       "Częstotliwość"],
        ["Jednostkowe",        "Logika domenowa w izolacji od I/O (scoring, anonimizacja)", "Jest, Vitest",        "przy każdym PR"],
        ["Integracyjne",       "Kontrolery + serwisy + ORM (multi-tenant, walidacja DTO)", "Jest + supertest, kontener PostgreSQL", "przy każdym PR"],
        ["E2E manualne",       "Pełne ścieżki użytkownika (rozdział 5.1)", "scenariusze klikalne, browser",   "przed merge na master"],
        ["Bezpieczeństwa",     "Próby obejścia auth, cross-tenant, brute-force", "Postman, manual SQLi probes",   "przed każdym wdrożeniem"],
        ["Wydajnościowe",      "Czas odpowiedzi API i auditu Lighthouse", "ApacheBench, Lighthouse",         "przed obroną"],
        ["Użyteczności",       "Obserwacja zachowań użytkownika, kwestionariusz SUS", "sesje 1-na-1, formularz",  "raz przed obroną"],
    ]
    add_table(doc, test_types, col_widths=[3.6, 6.0, 4.0, 3.4])

    # ---------- 3. Środowiska ----------
    add_heading(doc, "3.  Środowiska testowe", level=1, size=15)
    add_para(doc, "Testy uruchamiane są w trzech środowiskach o różnych konfiguracjach bazy "
                  "danych oraz dostępu zewnętrznego:")
    envs = [
        ["Środowisko",     "Cel",                              "Baza danych",                              "Adres / dostęp"],
        ["Lokalne (dev)",  "codzienna praca developerska",    "PostgreSQL w Dockerze (port 5432)",        "localhost:3000 / :3001 / :4000"],
        ["Stage (Railway)","demo dla promotora, obrona",      "PostgreSQL managed (Railway)",             "domena Railway HTTPS"],
        ["Testy klikalne", "scenariusze E2E manualne",         "kopia stage z zsynchronizowanymi seedami","domena Railway / dev"],
    ]
    add_table(doc, envs, col_widths=[3.6, 4.8, 4.8, 3.8])

    doc.add_page_break()

    # ---------- 4. Metryki jakości ----------
    add_heading(doc, "4.  Metryki jakości i kryteria akceptacji", level=1, size=15, space_before=0)
    add_para(doc, "Dla każdej iteracji oraz przed obroną zbierane są poniższe metryki. Wartości "
                  "progowe (kolumna „Cel”) stanowią kryterium akceptacji iteracji jako gotowej "
                  "do merge na master.")
    metrics = [
        ["Metryka",                                   "Cel",                                   "Sposób pomiaru"],
        ["Czas odpowiedzi API (P50)",                  "≤ 300 ms dla zapytań standardowych",   "Logi NestJS + ApacheBench"],
        ["Czas odpowiedzi API (P95)",                  "≤ 1 s",                                "ApacheBench (1000 req)"],
        ["Lighthouse Performance (front, mobile)",     "≥ 90",                                 "Lighthouse w Chrome DevTools"],
        ["Lighthouse Accessibility",                   "≥ 95",                                 "Lighthouse w Chrome DevTools"],
        ["Pokrycie testami logiki scoringu",           "≥ 80%",                                "Jest --coverage"],
        ["Liczba błędów 5xx w trakcie testów E2E",     "0",                                    "Logi backendu + scenariusze E2E"],
        ["Skuteczność blokady multi-tenant",           "100%",                                 "Scenariusz bezpieczeństwa TC-SEC-003"],
        ["Skuteczność trybu safety-net (PHQ-9 pyt. 9)","100%",                                 "Scenariusz TC-PHQ-008"],
        ["SUS — System Usability Scale",               "≥ 70 (akceptowalne)",                  "Kwestionariusz po sesji UX"],
        ["Wskaźnik porzucenia ankiety w trakcie testów UX", "< 30%",                            "Obserwacja + logi sesji"],
    ]
    add_table(doc, metrics, col_widths=[6.8, 4.4, 5.8])

    # ---------- 5. Proces zarządzania defektami ----------
    add_heading(doc, "5.  Proces zarządzania defektami", level=1, size=15)
    add_para(doc, [
        "Każdy scenariusz, który zakończy się statusem ",
        ("FAIL", "b"), " lub ", ("BLOCKED", "b"),
        ", uruchamia formalny proces obsługi defektu:",
    ])
    for step in [
        ("Rejestracja", " — zgłoszenie defektu w GitHub Issues z etykietą type:bug. Tytuł zawiera ID scenariusza (np. „TC-AUTH-001: błąd 500 przy logowaniu z pustym hasłem”)."),
        ("Klasyfikacja", " — przypisanie priorytetu zgodnego z MoSCoW funkcji, której dotyczy. Defekty w funkcjach Must Have blokują merge."),
        ("Diagnoza i naprawa", " — odpowiedzialny członek zespołu (przypisany w polu „Właściciel” zgłoszenia) lokalizuje przyczynę, tworzy gałąź fix/<numer-issue> i przygotowuje poprawkę."),
        ("Weryfikacja", " — ponowne wykonanie scenariusza testowego po naprawie. Status PASS → zamknięcie issue."),
        ("Regresja", " — scenariusz dodawany do listy testów regresyjnych uruchamianych przed każdym kolejnym wdrożeniem demonstracyjnym."),
    ]:
        name, desc = step
        add_bullet(doc, [(name, "b"), desc])

    doc.add_page_break()

    # ---------- 6. Formatka scenariusza testowego ----------
    add_heading(doc, "6.  Formatka scenariusza testowego (szablon edytowalny)",
                level=1, size=15, space_before=0)
    add_para(doc, "Każdy scenariusz testu klikalnego dokumentowany jest według poniższej "
                  "formatki. Formatka jest spójna ze strukturą rozdziału 5.1. pracy "
                  "inżynierskiej i pozwala jednoznacznie odtworzyć test, zweryfikować rezultat "
                  "oraz przypisać go do wymagania funkcjonalnego.")

    formatka_fields = [
        ("ID scenariusza",       "TC-<MOD>-<NNN>  (np. TC-AUTH-001, TC-HR-014, TC-SEC-003)"),
        ("Tytuł",                "Krótki opis testowanej ścieżki użytkownika"),
        ("Typ testu",            "jednostkowy / integracyjny / E2E manualny / bezpieczeństwa / wydajnościowy / użyteczności"),
        ("Powiązane wymaganie",  "Numer wymagania z rozdziału 2.4 (np. WF-12, WN-SEC-04)"),
        ("Priorytet MoSCoW",     "Must Have / Should Have / Could Have / Won't Have"),
        ("Aktor",                "Pracownik / HR / Administrator firmy / Administrator platformy"),
        ("Środowisko",           "dev / stage / lokalne"),
        ("Warunki wstępne",      "Stan systemu przed testem (konto zatwierdzone, kod firmy znany, ...)"),
        ("Dane testowe",         "Wartości używane podczas testu (loginy, hasła, kod firmy, odpowiedzi w ankiecie)"),
        ("Kroki",                "1. ...\n2. ...\n3. ..."),
        ("Oczekiwany wynik",     "Co system powinien wyświetlić / zapisać / wywołać"),
        ("Kryterium akceptacji", "Warunek konieczny do uznania scenariusza za zaliczony (np. HTTP 200 + pole X = Y + brak błędów 5xx w logach)"),
        ("Wynik faktyczny",      "Co zaobserwowano podczas wykonania testu"),
        ("Status",               "PASS / FAIL / BLOCKED / SKIPPED"),
        ("Uwagi / błędy",        "Numer zgłoszenia w GitHub Issues, screenshoty, dodatkowe obserwacje"),
        ("Załączniki",           "Linki do screenshotów, eksportu logów, nagrań sesji"),
        ("Data wykonania",       "RRRR-MM-DD"),
        ("Czas wykonania",       "np. 4 min 30 s (opcjonalnie — istotne przy testach wydajnościowych)"),
        ("Wykonujący",           "Imię i nazwisko testera"),
    ]
    add_formatka_table(doc, formatka_fields)

    doc.add_page_break()

    # ---------- 7. Przykłady ----------
    add_heading(doc, "7.  Przykłady wypełnionych scenariuszy",
                level=1, size=15, space_before=0)
    add_para(doc, "Poniżej trzy przykładowe scenariusze obrazujące różne typy testów — "
                  "funkcjonalny, krytyczny dla bezpieczeństwa psychologicznego użytkownika "
                  "oraz krytyczny dla izolacji multi-tenant.")

    # === Przykład 1 — logowanie pracownika ===
    add_heading(doc, "7.1.  TC-AUTH-001 — Logowanie zatwierdzonego pracownika", level=3)
    p1 = [
        ("ID scenariusza",       "TC-AUTH-001"),
        ("Tytuł",                "Logowanie zatwierdzonego pracownika z poprawnymi danymi"),
        ("Typ testu",            "E2E manualny"),
        ("Powiązane wymaganie",  "WF-02 (autentykacja pracownika)"),
        ("Priorytet MoSCoW",     "Must Have"),
        ("Aktor",                "Pracownik (status ACTIVE w bazie)"),
        ("Środowisko",           "stage (Railway)"),
        ("Warunki wstępne",      "W bazie istnieje aktywne konto pracownika z e-mailem jan.kowalski@firma.test "
                                 "oraz hasłem zgodnym z polityką (min. 8 znaków)."),
        ("Dane testowe",         "Login: jan.kowalski@firma.test\nHasło: TestPass123!"),
        ("Kroki",
         "1. Otwórz stronę logowania w aplikacji pracownika (https://...).\n"
         "2. Wpisz w pole „E-mail” wartość jan.kowalski@firma.test.\n"
         "3. Wpisz w pole „Hasło” wartość TestPass123!.\n"
         "4. Kliknij przycisk „Zaloguj się”.\n"
         "5. Zaobserwuj zachowanie aplikacji oraz wpisy w localStorage."),
        ("Oczekiwany wynik",     "Aplikacja przekierowuje na ekran /dashboard. W localStorage zapisany jest "
                                 "access_token (krótkożyciowy) oraz refresh_token. Widoczne imię „Jan” "
                                 "w prawym górnym rogu nagłówka."),
        ("Kryterium akceptacji", "HTTP 200 z /api/v1/auth/login + zapisane tokeny + przekierowanie do /dashboard "
                                 "+ brak błędów 5xx w logach backendu."),
        ("Wynik faktyczny",      "Przekierowanie do /dashboard nastąpiło po 240 ms. Tokeny zapisane poprawnie. "
                                 "Imię „Jan” widoczne w nagłówku."),
        ("Status",               "PASS"),
        ("Uwagi / błędy",        "—"),
        ("Załączniki",           "screenshots/auth-001.png"),
        ("Data wykonania",       "2026-05-09"),
        ("Czas wykonania",       "≈ 1 min"),
        ("Wykonujący",           "Mateusz Matczuk"),
    ]
    add_formatka_table(doc, p1, value_bg="F5FBF6")
    # status PASS — zielony pasek wizualnie podkreślający
    add_para(doc, [("Status: PASS — scenariusz krytyczny zaliczony.", "b")],
             indent_first=False, justify=False,
             align=WD_ALIGN_PARAGRAPH.LEFT, space_after=10)

    doc.add_page_break()

    # === Przykład 2 — safety-net PHQ-9 ===
    add_heading(doc, "7.2.  TC-PHQ-008 — Wyświetlenie trybu safety-net dla PHQ-9 (pyt. 9)",
                level=3, space_before=0)
    p2 = [
        ("ID scenariusza",       "TC-PHQ-008"),
        ("Tytuł",                "Po wypełnieniu PHQ-9 z odpowiedzią > 0 w pytaniu 9 system wyświetla komunikat ze wsparciem"),
        ("Typ testu",            "E2E manualny + integracyjny"),
        ("Powiązane wymaganie",  "WF-21 (tryb safety-net dla wyników krytycznych)"),
        ("Priorytet MoSCoW",     "Must Have (krytyczne dla bezpieczeństwa użytkownika)"),
        ("Aktor",                "Pracownik (status ACTIVE)"),
        ("Środowisko",           "stage (Railway)"),
        ("Warunki wstępne",      "Pracownik zalogowany. Test PHQ-9 dostępny do wypełnienia w widoku „Moje testy”."),
        ("Dane testowe",
         "Odpowiedzi PHQ-9: 3, 3, 3, 2, 3, 3, 3, 3, 2  (pyt. 9 = 2 — wartość > 0)\n"
         "Łączny wynik: 25  (przedział „ciężki”)"),
        ("Kroki",
         "1. Wejdź w widok „Moje testy”, kliknij „Rozpocznij” przy PHQ-9.\n"
         "2. Odpowiedz na 9 pytań zgodnie z danymi testowymi.\n"
         "3. Kliknij „Zakończ test”.\n"
         "4. Zaobserwuj ekran wyniku oraz dodatkowe komunikaty."),
        ("Oczekiwany wynik",
         "Ekran wyniku zawiera:  (a) wynik liczbowy 25 z etykietą „Ciężki”,  "
         "(b) rozbudowany komunikat „Skontaktuj się ze specjalistą”, "
         "(c) trzy telefony zaufania: 116 123, 800 70 22 22, 116 111, "
         "(d) brak wskazania konkretnego psychologa zewnętrznego."),
        ("Kryterium akceptacji", "Komunikat safety-net widoczny. Telefony zaufania widoczne. Wpis w audit_logs "
                                 "z akcją „safety_net_triggered” zawierający result_id (bez user_id w treści raportu HR)."),
        ("Wynik faktyczny",      "Wynik 25 wyświetlony. Komunikat „Skontaktuj się ze specjalistą” widoczny. "
                                 "Trzy telefony zaufania pokazane w bloku z czerwoną ramką."),
        ("Status",               "PASS"),
        ("Uwagi / błędy",        "—"),
        ("Załączniki",           "screenshots/phq9-safety-net.png"),
        ("Data wykonania",       "2026-05-09"),
        ("Czas wykonania",       "≈ 3 min"),
        ("Wykonujący",           "Mateusz Matczuk"),
    ]
    add_formatka_table(doc, p2, value_bg="F5FBF6")
    add_para(doc, [("Status: PASS — scenariusz krytyczny dla bezpieczeństwa zaliczony.", "b")],
             indent_first=False, justify=False,
             align=WD_ALIGN_PARAGRAPH.LEFT, space_after=10)

    doc.add_page_break()

    # === Przykład 3 — multi-tenant izolacja (cross-tenant) ===
    add_heading(doc, "7.3.  TC-SEC-003 — Brak dostępu HR firmy A do wyników firmy B (multi-tenant)",
                level=3, space_before=0)
    p3 = [
        ("ID scenariusza",       "TC-SEC-003"),
        ("Tytuł",                "Konto HR firmy A nie ma dostępu do wyników firmy B (multi-tenant)"),
        ("Typ testu",            "Bezpieczeństwa (cross-tenant)"),
        ("Powiązane wymaganie",  "WN-SEC-04 (izolacja danych pomiędzy tenantami)"),
        ("Priorytet MoSCoW",     "Must Have"),
        ("Aktor",                "HR firmy A (token JWT z tenant_id = A)"),
        ("Środowisko",           "stage (Railway)"),
        ("Warunki wstępne",      "W systemie istnieją dwie firmy A i B z różnymi tenant_id. Każda posiada minimum "
                                 "5 zatwierdzonych pracowników z wynikami PHQ-9."),
        ("Dane testowe",
         "Konto HR firmy A: hr@firmaA.test / hasło testowe.\n"
         "URL endpointu raportu firmy B: /api/v1/analytics/wellbeing-index?tenantId=B"),
        ("Kroki",
         "1. Zaloguj się jako HR firmy A.\n"
         "2. Skopiuj token JWT z DevTools (Application → Local Storage).\n"
         "3. Wywołaj endpoint /api/v1/analytics/wellbeing-index?tenantId=B w Postmanie "
         "z nagłówkiem Authorization: Bearer <token-firmy-A>.\n"
         "4. Zaobserwuj odpowiedź API oraz wpisy w audit_logs."),
        ("Oczekiwany wynik",     "API zwraca odpowiedź 403 Forbidden z komunikatem „Insufficient permissions” "
                                 "oraz nie zwraca jakichkolwiek danych firmy B w treści odpowiedzi."),
        ("Kryterium akceptacji", "HTTP 403 + pusty body danych firmy B + wpis w audit_logs z akcją "
                                 "„forbidden_cross_tenant_read”."),
        ("Wynik faktyczny",      "API zwróciło 403 Forbidden, body nie zawiera danych firmy B, w audit_logs "
                                 "pojawił się wpis o próbie dostępu."),
        ("Status",               "PASS"),
        ("Uwagi / błędy",        "—"),
        ("Załączniki",           "screenshots/sec-003-postman.png, logs/audit_2026-05-09.txt"),
        ("Data wykonania",       "2026-05-09"),
        ("Czas wykonania",       "≈ 5 min"),
        ("Wykonujący",           "Mateusz Matczuk"),
    ]
    add_formatka_table(doc, p3, value_bg="F5FBF6")
    add_para(doc, [("Status: PASS — kluczowy scenariusz bezpieczeństwa zaliczony.", "b")],
             indent_first=False, justify=False,
             align=WD_ALIGN_PARAGRAPH.LEFT, space_after=10)

    doc.add_page_break()

    # ---------- 8. Raportowanie ----------
    add_heading(doc, "8.  Sposób raportowania wyników", level=1, size=15, space_before=0)
    add_para(doc, "Wyniki wszystkich scenariuszy zbierane są w jednym arkuszu zbiorczym, "
                  "zawierającym kolumny: ID scenariusza, status (PASS/FAIL/BLOCKED/SKIPPED), "
                  "datę wykonania, wykonującego oraz odniesienie do ewentualnego zgłoszenia. "
                  "Po każdej iteracji sprintu generowany jest raport pokrycia testowego, "
                  "który stanowi podstawę decyzji o gotowości iteracji do scalenia do "
                  "gałęzi głównej i, w konsekwencji, do wdrożenia demonstracyjnego.")
    add_para(doc, [
        "Scenariusze, które uzyskały status ",
        ("FAIL", "b"),
        ", są opisywane jako zgłoszenia w GitHub Issues z etykietą ",
        ("type:bug", "m"),
        " i priorytetem zgodnym z klasyfikacją MoSCoW funkcji, której dotyczą. Naprawa zgłoszenia "
        "skutkuje ponownym wykonaniem scenariusza i aktualizacją statusu w arkuszu zbiorczym.",
    ])

    add_heading(doc, "Schemat arkusza zbiorczego (przykład)", level=3)
    summary = [
        ["ID scenariusza", "Tytuł",                                         "Typ",                "Priorytet",  "Status", "Data wykon.",  "Wykonujący"],
        ["TC-AUTH-001",    "Logowanie pracownika",                          "E2E",                "Must",       "PASS",   "2026-05-09",  "M. Matczuk"],
        ["TC-AUTH-002",    "Logowanie nieaktywne konto",                    "E2E",                "Must",       "PASS",   "2026-05-09",  "M. Matczuk"],
        ["TC-PHQ-007",     "PHQ-9 — scoring łagodny",                       "Integracyjny",       "Must",       "PASS",   "2026-05-10",  "M. Matczuk"],
        ["TC-PHQ-008",     "PHQ-9 — tryb safety-net",                       "E2E + integracyjny", "Must",       "PASS",   "2026-05-09",  "M. Matczuk"],
        ["TC-SEC-003",     "Multi-tenant cross-tenant block",               "Bezpieczeństwa",     "Must",       "PASS",   "2026-05-09",  "M. Matczuk"],
        ["TC-HR-014",      "K-anonymity dla grupy < 5",                     "Integracyjny",       "Must",       "PASS",   "2026-05-10",  "M. Matczuk"],
        ["TC-PERF-001",    "Dashboard HR — czas ładowania",                 "Wydajnościowy",      "Should",     "FAIL",   "2026-05-10",  "M. Matczuk"],
        ["TC-UX-002",      "Onboarding firmy — porzucenie",                 "Użyteczności",       "Should",     "BLOCKED","—",            "—"],
    ]
    add_table(doc, summary, col_widths=[2.6, 4.2, 3.0, 1.8, 1.4, 2.0, 2.0])

    add_para(doc, "")  # spacer
    add_para(doc, [
        "Legenda statusów: ",
        ("PASS", "b"), " — scenariusz zaliczony; ",
        ("FAIL", "b"), " — scenariusz nie zaliczony (issue otwarty); ",
        ("BLOCKED", "b"), " — niemożliwy do wykonania (zależność od innego defektu lub niedostępne środowisko); ",
        ("SKIPPED", "b"), " — świadomie pominięty (np. cecha wyłączona z MVP).",
    ], indent_first=False)

    # ---------- Notatka ----------
    add_heading(doc, "Notatka edycyjna", level=3)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(
        "Aby wprowadzić nowy scenariusz, skopiuj sekcję 7.x razem z formatką, "
        "zaktualizuj nagłówek (np. „7.4. TC-HR-014 — K-anonymity dla grupy < 5 osób”) "
        "i wypełnij wszystkie pola. Status zmienia się przez nadpisanie tekstu w polu "
        "„Status” (PASS / FAIL / BLOCKED / SKIPPED). Załączniki najlepiej trzymać w folderze "
        "obok dokumentu (np. praca-pdf/screenshots/) i odwoływać się do nich relatywną ścieżką."
    )
    set_run(r, italic=True, size=9, color="555555")

    out = Path(__file__).parent / "Plan-QA-Formatka-Testowa.docx"
    doc.save(out)
    print(f"✓ Zapisano: {out}")


if __name__ == "__main__":
    main()
