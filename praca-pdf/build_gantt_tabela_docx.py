#!/usr/bin/env python3
"""
Generuje edytowalną tabelę Gantta MoodFlow w formacie DOCX.

Tabela jest natywną tabelą Word — każda komórka tygodnia jest edytowalna,
kolory można zmieniać w „Cieniowaniu komórek", zadania można dodawać
i usuwać przez normalne operacje na wierszach tabeli.

Wyjście: Gantt-MoSCoW-Tabela.docx (A4 poziomy)
"""
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# =========================================================
# Paleta kolorów
# =========================================================
MOSCOW = {
    "MUST":   "2D4631",
    "SHOULD": "5A5E2C",
    "COULD":  "8D7D1E",
    "WONT":   "B8125A",
}
MOSCOW_LABEL = {
    "MUST":   "Must Have — krytyczne dla obrony MVP",
    "SHOULD": "Should Have — istotne, planowane do MVP",
    "COULD":  "Could Have — jeśli zostanie czas",
    "WONT":   "Won't Have — poza zakresem (wzór ukośny)",
}
PHASE_BG      = "3A3A3A"
PHASE_BG_WONT = "7A0D3D"
HEADER_BG     = "D6D6D6"
HEADER_BG2    = "E8E8E8"
ROW_BG_A      = "FAFAFA"
ROW_BG_B      = "FFFFFF"
GRID_COLOR    = "999999"


# =========================================================
# Konfiguracja
# =========================================================
MONTHS_LONG = [
    "Październik 2025", "Listopad 2025", "Grudzień 2025",
    "Styczeń 2026",     "Luty 2026",     "Marzec 2026",
    "Kwiecień 2026",    "Maj 2026",
]
MONTHS_SHORT = [
    "Paź 25", "Lis 25", "Gru 25",
    "Sty 26", "Lut 26", "Mar 26",
    "Kwi 26", "Maj 26",
]
WEEKS_PER_MONTH = 4
N_MONTHS = len(MONTHS_LONG)
N_WEEKS  = N_MONTHS * WEEKS_PER_MONTH  # 60


# =========================================================
# Zadania (start/end = (month_idx, week_in_month_idx))
# =========================================================
TASKS = [
    ("PHASE", "FAZA 1 — ANALIZA I PLANOWANIE PROJEKTU", None, None, None),
    ("TASK",  "Wybór tematu i analiza rynku",                          (0, 0), (0, 2), "MUST"),
    ("TASK",  "Analiza SWOT, persony użytkowników",                     (0, 1), (0, 3), "MUST"),
    ("TASK",  "Wymagania funkcjonalne (klasyfikacja MoSCoW)",           (0, 2), (1, 1), "MUST"),
    ("TASK",  "Wymagania niefunkcjonalne (BPMN)",                       (0, 2), (1, 1), "MUST"),
    ("TASK",  "Diagramy UML, dobór technologii",                        (0, 3), (1, 2), "MUST"),
    ("TASK",  "Karta pracy dyplomowej, akceptacja promotora",           (1, 1), (1, 3), "MUST"),
    ("MILESTONE", "Kamień milowy: zatwierdzona koncepcja i temat pracy", (1, 3), (1, 3), "MUST"),

    ("PHASE", "FAZA 2 — INFRASTRUKTURA I FUNDAMENTY TECHNICZNE", None, None, None),
    ("TASK",  "Repozytorium Git, struktura monorepo",                   (1, 2), (2, 0), "MUST"),
    ("TASK",  "Docker Compose, środowisko developerskie",               (1, 3), (2, 1), "MUST"),
    ("TASK",  "Schemat bazy danych (TypeORM, migracje)",                (2, 0), (2, 3), "MUST"),
    ("TASK",  "Szkielet frontendów (React + Vite, Next.js)",            (2, 1), (3, 0), "MUST"),
    ("MILESTONE", "Kamień milowy: środowisko gotowe do implementacji",  (3, 0), (3, 0), "MUST"),

    ("PHASE", "FAZA 3 — AUTORYZACJA, UŻYTKOWNICY, MULTI-TENANT", None, None, None),
    ("TASK",  "Moduł auth (JWT, bcrypt, Passport)",                     (3, 0), (3, 3), "MUST"),
    ("TASK",  "Moduł users, rejestracja, role",                          (3, 1), (4, 1), "MUST"),
    ("TASK",  "Multi-tenant izolacja danych (tenant_id)",               (3, 2), (4, 2), "MUST"),
    ("TASK",  "UI logowania i rejestracji, walidacja",                  (3, 3), (4, 2), "MUST"),
    ("TASK",  "Bezpieczeństwo (CORS, helmet, throttler)",               (4, 0), (4, 3), "MUST"),
    ("MILESTONE", "Kamień milowy: logowanie i izolacja end-to-end",     (4, 3), (4, 3), "MUST"),

    ("PHASE", "FAZA 4 — TESTY PSYCHOLOGICZNE, SCORING, WYNIKI", None, None, None),
    ("TASK",  "Szablony ankiet (PHQ-9, GAD-7, PSS-10, WHO-5)",          (4, 1), (5, 0), "MUST"),
    ("TASK",  "Zapis odpowiedzi (DTO, walidacja)",                       (4, 2), (5, 1), "MUST"),
    ("TASK",  "Scoring i klasyfikacja wyników",                          (4, 3), (5, 2), "MUST"),
    ("TASK",  "Tryb safety-net (PHQ-9 pyt. 9, telefony zaufania)",      (5, 0), (5, 2), "MUST"),
    ("TASK",  "UI testów psychologicznych",                              (5, 0), (5, 3), "MUST"),
    ("TASK",  "UI wyników, historia, statusy",                           (5, 2), (6, 0), "MUST"),
    ("MILESTONE", "Kamień milowy: pracownik wypełnia test i widzi wynik", (6, 0), (6, 0), "MUST"),

    ("PHASE", "FAZA 5 — DASHBOARDY, ANALITYKA HR, PANEL ADMINISTRATORA", None, None, None),
    ("TASK",  "Anonimizacja k-anonymity (k ≥ 5)",                       (5, 3), (6, 2), "MUST"),
    ("TASK",  "Dashboard pracownika (trendy własne)",                   (6, 0), (6, 2), "MUST"),
    ("TASK",  "Panel HR (analityka zbiorcza, wykresy)",                 (6, 1), (7, 1), "MUST"),
    ("TASK",  "Panel administratora platformy",                          (6, 2), (7, 1), "MUST"),
    ("MILESTONE", "Kamień milowy: wszystkie kluczowe widoki gotowe",    (7, 1), (7, 1), "MUST"),

    ("PHASE", "FAZA 6 — POWIADOMIENIA, AUDIT, PWA, TESTY", None, None, None),
    ("TASK",  "Codzienny Mood Check (front + API)",                     (6, 0), (6, 2), "SHOULD"),
    ("TASK",  "PWA, Service Worker, instalowalność",                    (6, 2), (7, 1), "SHOULD"),
    ("TASK",  "Powiadomienia (e-mail, in-app)",                          (7, 0), (7, 2), "SHOULD"),
    ("TASK",  "Eksport raportów PDF / CSV",                              (7, 1), (7, 3), "SHOULD"),
    ("TASK",  "Audit log dostępu administracyjnego",                    (7, 1), (7, 3), "SHOULD"),
    ("TASK",  "Testy klikalne, bezpieczeństwa i użyteczności",          (7, 1), (8, 2), "MUST"),

    ("PHASE", "FAZA 7 — WDROŻENIE, DOKUMENTACJA, FINALIZACJA PRACY", None, None, None),
    ("TASK",  "Diagramy UML / BPMN do pracy",                            (5, 0), (7, 3), "MUST"),
    ("TASK",  "Wdrożenie demonstracyjne (Railway)",                      (7, 0), (7, 3), "MUST"),
    ("TASK",  "Pisanie rozdziałów pracy inżynierskiej",                 (5, 2), (7, 3), "MUST"),

    ("PHASE", "ROZSZERZENIA — REALIZACJA, GDY ZOSTANIE CZAS (COULD HAVE)", None, None, None),
    ("TASK",  "Analiza sentymentu NLP komentarzy",                      (6, 2), (7, 2), "COULD"),
    ("TASK",  "Buforowanie raportów HR (cache)",                         (7, 0), (7, 3), "COULD"),
    ("TASK",  "Rozszerzony audit log (raporty admin)",                  (7, 0), (7, 2), "COULD"),
    ("TASK",  "Automatyczne podpowiedzi w ankietach",                   (6, 3), (7, 1), "COULD"),

    ("PHASE-WONT", "POZA ZAKRESEM PRACY INŻYNIERSKIEJ (WON'T HAVE)", None, None, None),
    ("TASK",  "Integracja z systemami HR (SAP / Workday)",              (5, 0), (7, 3), "WONT"),
    ("TASK",  "Certyfikacja systemu według ISO 27001",                  (0, 0), (7, 3), "WONT"),
    ("TASK",  "Mobilna aplikacja natywna (iOS / Android)",              (3, 0), (7, 3), "WONT"),
    ("TASK",  "Integracje SSO (Okta, Azure AD)",                         (4, 0), (6, 1), "WONT"),
    ("TASK",  "Moduł telemedyczny (rezerwacja sesji)",                  (5, 2), (7, 3), "WONT"),
]

# Dziś = 2026-05-11 → miesiąc 7 (Maj 26), tydzień 1 (T2)
TODAY_GLOBAL_WEEK = 7 * WEEKS_PER_MONTH + 1


# =========================================================
# Pomocniki OOXML
# =========================================================
def set_run(run, *, bold=False, italic=False, size=8, color=None, font="Verdana"):
    run.font.name = font
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
    rFonts.set(qn("w:ascii"), font)
    rFonts.set(qn("w:hAnsi"), font)
    rFonts.set(qn("w:cs"), font)


def shade_cell(cell, color_hex, *, pattern="clear", stripe_color="auto"):
    tc_pr = cell._tc.get_or_add_tcPr()
    for s in tc_pr.findall(qn("w:shd")):
        tc_pr.remove(s)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), pattern)
    shd.set(qn("w:color"), stripe_color)
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


def set_cell_no_wrap(cell):
    tc_pr = cell._tc.get_or_add_tcPr()
    noWrap = OxmlElement("w:noWrap")
    tc_pr.append(noWrap)


def set_table_grid(table, col_widths_cm):
    """Wymusza szerokości kolumn na poziomie tabeli (w:tblGrid)."""
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
    # tblGrid musi być umieszczony zaraz po tblPr
    tbl_pr.addnext(tblGrid)


def set_table_total_width(table, total_cm):
    tbl_pr = table._element.find(qn("w:tblPr"))
    for w in tbl_pr.findall(qn("w:tblW")):
        tbl_pr.remove(w)
    tblW = OxmlElement("w:tblW")
    tblW.set(qn("w:type"), "dxa")
    tblW.set(qn("w:w"), str(int(total_cm * 567)))
    tbl_pr.append(tblW)


def write_cell(cell, text, *, bold=False, italic=False, color=None, size=8,
               bg=None, pattern=None, align="center", anchor="center"):
    # wyczyść default
    cell.text = ""
    cell.vertical_alignment = {
        "top": WD_ALIGN_VERTICAL.TOP,
        "center": WD_ALIGN_VERTICAL.CENTER,
        "bottom": WD_ALIGN_VERTICAL.BOTTOM,
    }[anchor]
    p = cell.paragraphs[0]
    pf = p.paragraph_format
    pf.line_spacing = 1.0
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    p.alignment = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
    }[align]
    set_cell_border(cell)
    if bg:
        if pattern == "diag":
            # diagStripe = ukośne paski; FFFFFF = kolor pasków, bg = tło
            shade_cell(cell, bg, pattern="diagStripe", stripe_color="FFFFFF")
        else:
            shade_cell(cell, bg)
    if text:
        r = p.add_run(text)
        set_run(r, bold=bold, italic=italic, size=size, color=color)


# =========================================================
# Tworzenie dokumentu
# =========================================================
def main():
    doc = Document()

    # A4 poziomy z minimalnymi marginesami
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Cm(29.7)
    section.page_height = Cm(21.0)
    section.top_margin = Cm(1.0)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(1.0)
    section.right_margin = Cm(1.0)

    style = doc.styles["Normal"]
    style.font.name = "Verdana"
    style.font.size = Pt(9)

    # Tytuł
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Harmonogram pracy MoodFlow z pełną klasyfikacją MoSCoW (X 2025 — V 2026)")
    set_run(r, bold=True, size=13, color="1D3E44")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("(źródło: opracowanie własne)")
    set_run(r, italic=True, size=9, color="666666")

    # Rozmiary kolumn
    task_col_w = 5.3        # cm na kolumnę z nazwą zadania
    usable_w  = 27.7        # 29.7 - 2*1.0 margin
    week_col_w = round((usable_w - task_col_w) / N_WEEKS, 3)  # ≈ 0.373

    n_cols = 1 + N_WEEKS
    n_rows = 2 + len(TASKS)
    table = doc.add_table(rows=n_rows, cols=n_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    # zablokuj autofit
    tbl_pr = table._element.find(qn("w:tblPr"))
    tbl_layout = tbl_pr.find(qn("w:tblLayout"))
    if tbl_layout is None:
        tbl_layout = OxmlElement("w:tblLayout")
        tbl_pr.append(tbl_layout)
    tbl_layout.set(qn("w:type"), "fixed")

    # wymuś szerokości kolumn na poziomie tabeli
    col_widths = [task_col_w] + [week_col_w] * N_WEEKS
    set_table_grid(table, col_widths)
    set_table_total_width(table, task_col_w + week_col_w * N_WEEKS)

    # ===== Header row 0+1 =====
    # kol 0 — „Zadanie" (merge 2 rzędy)
    cell_z = table.cell(0, 0).merge(table.cell(1, 0))
    write_cell(cell_z, "Zadanie", bold=True, bg=HEADER_BG, size=10, align="left")
    set_cell_width(cell_z, task_col_w)

    # row 0 — miesiące (merge co 4 kolumny)
    for m_idx, m_long in enumerate(MONTHS_LONG):
        first = 1 + m_idx * WEEKS_PER_MONTH
        last  = first + WEEKS_PER_MONTH - 1
        merged = table.cell(0, first)
        for c in range(first + 1, last + 1):
            merged = merged.merge(table.cell(0, c))
        # tekst — pełna nazwa, ale font 8pt
        write_cell(merged, m_long, bold=True, bg=HEADER_BG, size=8.5)

    # row 1 — tygodnie T1..T4
    for w in range(N_WEEKS):
        cell = table.cell(1, 1 + w)
        bg = HEADER_BG2 if (w // WEEKS_PER_MONTH) % 2 == 0 else "F4F4F4"
        write_cell(cell, f"T{w % WEEKS_PER_MONTH + 1}", size=7, bg=bg)
        set_cell_width(cell, week_col_w)

    # ===== Wiersze zadań =====
    visible_idx = 0
    for r_idx, (typ, name, start, end, cat) in enumerate(TASKS):
        row = 2 + r_idx

        if typ.startswith("PHASE"):
            bg = PHASE_BG_WONT if typ == "PHASE-WONT" else PHASE_BG
            merged = table.cell(row, 0)
            for c in range(1, n_cols):
                merged = merged.merge(table.cell(row, c))
            write_cell(merged, name, bold=True, bg=bg, color="FFFFFF",
                       size=9, align="left")
            continue

        row_bg = ROW_BG_A if visible_idx % 2 == 0 else ROW_BG_B
        visible_idx += 1

        # Nazwa zadania
        display = name
        if typ == "MILESTONE":
            display = "◆  " + name
        write_cell(table.cell(row, 0), display, size=8, align="left",
                   bg=row_bg, anchor="center")
        set_cell_width(table.cell(row, 0), task_col_w)

        # Komórki tygodni
        s_w = e_w = None
        if start and end:
            s_w = start[0] * WEEKS_PER_MONTH + start[1]
            e_w = end[0]   * WEEKS_PER_MONTH + end[1]

        for w in range(N_WEEKS):
            cell = table.cell(row, 1 + w)
            set_cell_width(cell, week_col_w)
            if s_w is not None and s_w <= w <= e_w and cat:
                if typ == "MILESTONE":
                    if w == s_w:
                        write_cell(cell, "◆", bold=True, size=11,
                                   color=MOSCOW[cat], bg=row_bg)
                    else:
                        write_cell(cell, "", bg=row_bg)
                elif cat == "WONT":
                    write_cell(cell, "", bg=MOSCOW[cat], pattern="diag")
                else:
                    write_cell(cell, "", bg=MOSCOW[cat])
            else:
                # Pusta komórka tygodnia: lekkie tło wiersza
                write_cell(cell, "", bg=row_bg)

    # Wysokość wierszy
    for i, row in enumerate(table.rows):
        # header trochę wyższe
        h = Cm(0.6) if i < 2 else Cm(0.42)
        row.height = h
        row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST

    # ===== Legenda =====
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    legend_title = doc.add_paragraph()
    legend_title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    legend_title.paragraph_format.space_after = Pt(4)
    r = legend_title.add_run("Legenda:")
    set_run(r, bold=True, size=10, color="1D3E44")

    # 2 wiersze x 3 kolumny: swatch + opis
    legend_data = [
        ("MUST",      "Must Have — krytyczne dla obrony MVP"),
        ("SHOULD",    "Should Have — istotne, planowane do MVP"),
        ("COULD",     "Could Have — jeśli zostanie czas"),
        ("WONT",      "Won't Have — poza zakresem (wzór ukośny)"),
        ("MILESTONE", "◆ — kamień milowy projektu"),
    ]
    lt = doc.add_table(rows=len(legend_data), cols=2)
    lt.autofit = False
    for i, (key, label) in enumerate(legend_data):
        c0 = lt.cell(i, 0)
        c1 = lt.cell(i, 1)
        set_cell_width(c0, 1.0)
        set_cell_width(c1, 12.0)
        if key == "MILESTONE":
            write_cell(c0, "◆", bold=True, size=14, color="2D4631", bg="FFFFFF")
        elif key == "WONT":
            write_cell(c0, "", bg=MOSCOW[key], pattern="diag")
        else:
            write_cell(c0, "", bg=MOSCOW[key])
        write_cell(c1, label, size=9, align="left", bg="FFFFFF")
        # usuń ramki z drugiej kolumny
        tc_pr = c1._tc.get_or_add_tcPr()
        for tb in tc_pr.findall(qn("w:tcBorders")):
            tc_pr.remove(tb)
        borders = OxmlElement("w:tcBorders")
        for edge in ("top", "left", "bottom", "right"):
            b = OxmlElement(f"w:{edge}")
            b.set(qn("w:val"), "nil")
            borders.append(b)
        tc_pr.append(borders)

    # Notatka u dołu
    note = doc.add_paragraph()
    note.paragraph_format.space_before = Pt(10)
    r = note.add_run(
        "Notatka edycyjna: aby zmienić kolor lub przedział czasowy zadania, kliknij wybraną "
        "komórkę tygodnia i użyj funkcji „Cieniowanie” w karcie „Układ tabeli” / „Tabela”. "
        "Aby dodać nowy wiersz zadania — kliknij prawym przyciskiem w istniejący wiersz i "
        "wybierz „Wstaw wiersz”. Klasyfikacja MoSCoW jest niesiona przez kolor wypełnienia "
        "komórek."
    )
    set_run(r, italic=True, size=9, color="555555")

    out = Path(__file__).parent / "Gantt-MoSCoW-Tabela.docx"
    doc.save(out)
    print(f"✓ Zapisano: {out}")


if __name__ == "__main__":
    main()
