#!/usr/bin/env python3
"""
Buduje pojedynczy dokument projektowy DOCX dla pracy MoodFlow.

Zawartość:
  1. Metodologia pracy
  2. Stack technologiczny
  3. Wykorzystywane narzędzia
  4. Harmonogram pracy (Gantt + MoSCoW)
  5. Ryzyka projektowe i plan mitygacji
  6. Plan monitorowania jakości + formatka scenariusza testowego

Zgodnie z konwencją CDV: Verdana 10, interlinia 1.15, justify, akapit z wcięciem.

Wynik:
  praca-pdf/Dokument-Projektowy-MoodFlow.docx
  praca-pdf/Gantt-MoSCoW.png  (osadzony w DOCX)
"""
from pathlib import Path
from datetime import datetime, date, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = Path(__file__).parent
GANTT_PNG = ROOT / "Gantt-MoSCoW.png"
OUT_DOCX = ROOT / "Dokument-Projektowy-MoodFlow.docx"
TODAY = date(2026, 5, 11)


# =========================================================
# 1. WYKRES GANTTA z kolorowaniem MoSCoW
# =========================================================

MOSCOW_COLORS = {
    "MUST":   "#2D4631",  # ciemna zieleń
    "SHOULD": "#5A5E2C",  # oliwka
    "COULD":  "#8D7D1E",  # musztarda
    "WONT":   "#B8125A",  # karminowa czerwień
}
MOSCOW_LABELS = {
    "MUST":   "Must Have — krytyczne dla obrony MVP",
    "SHOULD": "Should Have — istotne, planowane do MVP",
    "COULD":  "Could Have — jeśli zostanie czas",
    "WONT":   "Won't Have — poza zakresem pracy inżynierskiej",
}

# (etykieta, start, koniec, kategoria)
TASKS = [
    # ===== Must Have =====
    ("Analiza wymagań i PRD",                  "2026-01-05", "2026-01-25", "MUST"),
    ("Architektura systemu (ARCHITECTURE.md)", "2026-01-15", "2026-02-10", "MUST"),
    ("Setup repozytorium + Docker Compose",    "2026-02-01", "2026-02-15", "MUST"),
    ("Backend: auth, role, JWT",               "2026-02-10", "2026-03-05", "MUST"),
    ("Multi-tenant — izolacja danych",         "2026-02-25", "2026-03-20", "MUST"),
    ("Frontend pracownika — szkielet",         "2026-02-15", "2026-03-15", "MUST"),
    ("Moduły testów psychologicznych",         "2026-03-10", "2026-04-15", "MUST"),
    ("Anonimizacja k-anonymity (k≥5)",         "2026-04-01", "2026-04-25", "MUST"),
    ("Panel HR — raporty zbiorcze",            "2026-04-10", "2026-05-05", "MUST"),
    ("Panel administratora platformy",         "2026-04-15", "2026-05-08", "MUST"),
    ("Bezpieczeństwo i zgodność z RODO",       "2026-02-15", "2026-05-15", "MUST"),
    ("Testy klikalne + dokumentacja techn.",   "2026-04-20", "2026-06-05", "MUST"),
    ("Wdrożenie demonstracyjne (Railway)",     "2026-05-01", "2026-05-20", "MUST"),
    ("Pisanie pracy inżynierskiej",            "2026-03-15", "2026-06-10", "MUST"),
    ("Obrona pracy inżynierskiej",             "2026-06-15", "2026-06-25", "MUST"),

    # ===== Should Have =====
    ("Codzienny Mood Check",                   "2026-04-05", "2026-04-25", "SHOULD"),
    ("Powiadomienia (e-mail + in-app)",        "2026-04-20", "2026-05-10", "SHOULD"),
    ("Eksport raportów PDF / CSV",             "2026-05-01", "2026-05-15", "SHOULD"),
    ("Analiza trendów — wykresy w panelu HR",  "2026-04-25", "2026-05-20", "SHOULD"),
    ("PWA — instalowalność i offline",         "2026-04-15", "2026-05-05", "SHOULD"),

    # ===== Could Have =====
    ("Analiza sentymentu NLP komentarzy",      "2026-05-15", "2026-06-05", "COULD"),
    ("Buforowanie raportów HR",                "2026-05-25", "2026-06-05", "COULD"),
    ("Rozszerzony audit log",                  "2026-05-20", "2026-06-01", "COULD"),

    # ===== Won't Have (post-thesis / roadmap) =====
    ("Integracja z SAP / Workday",             "2026-07-01", "2026-09-30", "WONT"),
    ("Certyfikacja ISO 27001",                 "2026-07-01", "2026-12-31", "WONT"),
    ("Mobilna aplikacja natywna (iOS/Android)","2026-08-01", "2026-11-30", "WONT"),
    ("Integracje SSO (Okta / Azure AD)",       "2026-07-15", "2026-10-15", "WONT"),
    ("Moduł telemedyczny",                     "2026-09-01", "2026-12-31", "WONT"),
]


def build_gantt(path):
    """Renderuje wykres Gantta z kolorowaniem MoSCoW."""
    rows = []
    for label, s, e, cat in TASKS:
        rows.append((
            label,
            datetime.strptime(s, "%Y-%m-%d"),
            datetime.strptime(e, "%Y-%m-%d"),
            cat,
        ))
    # Odwracamy, by pierwsza pozycja była na górze
    rows = list(reversed(rows))

    fig, ax = plt.subplots(figsize=(15.5, 11), dpi=160)
    fig.patch.set_facecolor("white")

    y_positions = list(range(len(rows)))
    for y, (label, s, e, cat) in zip(y_positions, rows):
        width = (e - s).days
        ax.barh(
            y,
            width,
            left=s,
            height=0.62,
            color=MOSCOW_COLORS[cat],
            edgecolor="white",
            linewidth=0.6,
            alpha=0.95 if cat != "WONT" else 0.78,
            hatch="///" if cat == "WONT" else None,
        )

    ax.set_yticks(y_positions)
    ax.set_yticklabels(
        [r[0] for r in rows],
        fontsize=9.5,
        fontfamily="DejaVu Sans",
    )
    for tick in ax.get_yticklabels():
        # rozpoznaj kategorię po pozycji w tasks
        pass

    # Oś X — czas
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_minor_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
    plt.setp(ax.get_xticklabels(), rotation=0, ha="center", fontsize=9)

    ax.set_xlim(
        datetime(2025, 12, 28),
        datetime(2027, 1, 5),
    )

    # Pionowe linie miesięczne
    ax.grid(True, axis="x", which="major", color="#cccccc", linewidth=0.6, alpha=0.7)
    ax.grid(True, axis="x", which="minor", color="#eeeeee", linewidth=0.4, alpha=0.5)
    ax.set_axisbelow(True)

    # Pionowa linia „dzisiaj"
    today_dt = datetime(TODAY.year, TODAY.month, TODAY.day)
    ax.axvline(today_dt, color="#C62828", linewidth=1.8, linestyle="--", alpha=0.9)
    ax.text(
        today_dt,
        len(rows) + 0.15,
        f"  dziś ({TODAY.strftime('%Y-%m-%d')})",
        color="#C62828",
        fontsize=10,
        fontweight="bold",
        ha="left",
        va="bottom",
    )

    # Pionowa linia „koniec semestru / obrona"
    end_thesis = datetime(2026, 6, 30)
    ax.axvline(end_thesis, color="#1D3E44", linewidth=1.2, linestyle=":", alpha=0.6)
    ax.text(
        end_thesis,
        -0.8,
        "koniec semestru\n(obrona)",
        color="#1D3E44",
        fontsize=9,
        ha="center",
        va="top",
    )

    # Tytuł
    ax.set_title(
        "Harmonogram pracy MoodFlow z klasyfikacją MoSCoW",
        fontsize=15,
        fontweight="bold",
        color="#1D3E44",
        pad=18,
    )

    # Legenda
    legend_handles = [
        Patch(facecolor=MOSCOW_COLORS["MUST"],   label=MOSCOW_LABELS["MUST"]),
        Patch(facecolor=MOSCOW_COLORS["SHOULD"], label=MOSCOW_LABELS["SHOULD"]),
        Patch(facecolor=MOSCOW_COLORS["COULD"],  label=MOSCOW_LABELS["COULD"]),
        Patch(facecolor=MOSCOW_COLORS["WONT"],   hatch="///",
              label=MOSCOW_LABELS["WONT"]),
    ]
    ax.legend(
        handles=legend_handles,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.06),
        ncol=2,
        frameon=False,
        fontsize=10,
    )

    # Spinaczy między grupami MoSCoW
    cats_in_order = [r[3] for r in rows]
    for i in range(1, len(cats_in_order)):
        if cats_in_order[i] != cats_in_order[i - 1]:
            ax.axhline(i - 0.5, color="#888888", linewidth=0.7, alpha=0.5)

    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#bbbbbb")
    ax.spines["bottom"].set_color("#bbbbbb")

    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"✓ Gantt zapisany: {path}")


# =========================================================
# 2. POMOCNIKI DOCX (Verdana 10, 1.15, justify)
# =========================================================

def set_run(run, *, bold=False, italic=False, size=10, font="Verdana", color=None):
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


def add_para(doc, runs, *, indent_first=True, justify=True, space_after=6,
             line_spacing=1.15, align=None, size_default=10):
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
        r = p.add_run(runs); set_run(r, size=size_default)
    else:
        for item in runs:
            if isinstance(item, str):
                r = p.add_run(item); set_run(r, size=size_default)
            else:
                text, *style = item
                r = p.add_run(text)
                set_run(
                    r,
                    bold="b" in style,
                    italic="i" in style,
                    size=size_default,
                )
    return p


def add_heading(doc, text, *, level=2, size=None, color="1D3E44", space_before=14, space_after=8):
    if size is None:
        size = {1: 16, 2: 13, 3: 11}.get(level, 11)
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    r = p.add_run(text)
    set_run(r, bold=True, size=size, color=color)


def add_bullet(doc, content, *, indent=False):
    """content może być str lub listą tupli (tekst, styl)."""
    p = doc.add_paragraph(style="List Bullet")
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(0)
    pf.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    # czyść default-run
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
                set_run(r, bold="b" in style, italic="i" in style)
    return p


def shade_cell(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex)
    tc_pr.append(shd)


def set_cell_border(cell, color_hex="666666", size_pt=4):
    """Cienka ramka wokół komórki."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), str(size_pt))
        b.set(qn("w:color"), color_hex)
        tcBorders.append(b)
    tc_pr.append(tcBorders)


def fill_cell(cell, text, *, bold=False, size=9, color=None, align=None, bg=None, font="Verdana"):
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    if bg:
        shade_cell(cell, bg)
    set_cell_border(cell)
    cell.text = ""
    p = cell.paragraphs[0]
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(1); pf.space_after = Pt(1)
    if align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "right":
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    set_run(r, bold=bold, size=size, font=font, color=color)


def add_table(doc, rows, col_widths=None, *, header_bg="1D3E44", header_color="FFFFFF",
              alt_bg="F4F1E8"):
    """rows = lista list (pierwsza = header)."""
    n_cols = len(rows[0])
    table = doc.add_table(rows=len(rows), cols=n_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = w
    for r_idx, row in enumerate(rows):
        is_header = (r_idx == 0)
        for c_idx, cell_val in enumerate(row):
            cell = table.rows[r_idx].cells[c_idx]
            bg = header_bg if is_header else (alt_bg if r_idx % 2 == 0 else None)
            color = header_color if is_header else None
            fill_cell(
                cell, str(cell_val),
                bold=is_header,
                size=8.5 if not is_header else 9,
                color=color,
                align="center" if is_header else None,
                bg=bg,
            )
    return table


# =========================================================
# 3. BUDOWA DOKUMENTU
# =========================================================

def build_doc():
    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Verdana"
    style.font.size = Pt(10)

    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(1.8)

    # --------- Strona tytułowa ---------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(60)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title_p.add_run("Dokument projektowy")
    set_run(r, bold=True, size=22, color="1D3E44")

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_after = Pt(8)
    r = sub.add_run("MoodFlow — platforma monitorowania zdrowia psychicznego pracowników")
    set_run(r, italic=True, size=12, color="5A5E2C")

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.paragraph_format.space_after = Pt(40)
    r = meta.add_run("Mateusz Matczuk    ·    Praca inżynierska CDV    ·    2026")
    set_run(r, size=11)

    desc = doc.add_paragraph()
    desc.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    desc.paragraph_format.first_line_indent = Cm(0.6)
    desc.paragraph_format.space_after = Pt(6)
    r = desc.add_run(
        "Niniejszy dokument zawiera komplet informacji projektowych dotyczących "
        "platformy MoodFlow. Obejmuje: przyjętą metodologię pracy, stack technologiczny "
        "rozwiązania, listę wykorzystywanych narzędzi developerskich i kolaboracyjnych, "
        "harmonogram pracy w postaci wykresu Gantta z klasyfikacją MoSCoW (wyraźnie "
        "wskazującą zakres MVP, funkcje rozszerzające oraz elementy nieobjęte zakresem "
        "pracy inżynierskiej), rejestr ryzyk projektowych wraz z planem mitygacji oraz "
        "plan monitorowania jakości obejmujący formatkę scenariusza testowego."
    )
    set_run(r)

    # spis treści (manualny — szybciej niż TOC field)
    add_heading(doc, "Spis treści", level=2, space_before=18, space_after=8)
    toc = [
        "1.  Metodologia pracy",
        "2.  Stack technologiczny rozwiązania",
        "3.  Wykorzystywane narzędzia",
        "4.  Harmonogram pracy (wykres Gantta z MoSCoW)",
        "5.  Ryzyka projektowe i plan mitygacji",
        "6.  Plan monitorowania jakości i formatka scenariusza testowego",
    ]
    for entry in toc:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.line_spacing = 1.15
        pf.space_after = Pt(2)
        r = p.add_run(entry); set_run(r, size=10.5)

    doc.add_page_break()

    # =========================================================
    # 1. METODOLOGIA PRACY
    # =========================================================
    add_heading(doc, "1.  Metodologia pracy", level=1, size=15, space_before=0)

    add_para(doc, [
        "W projekcie MoodFlow zastosowano ",
        ("metodykę zwinną opartą o hybrydę Scrum-lite oraz Kanban", "b"),
        ", dostosowaną do realiów dwuosobowego zespołu studenckiego pracującego nad pracą inżynierską. "
        "Wybór metodyki został podyktowany koniecznością łączenia pracy projektowej z innymi obowiązkami "
        "akademickimi i zawodowymi, a także potrzebą zachowania elastyczności w reagowaniu na zmiany "
        "wymagań formułowanych w trakcie konsultacji z promotorem."
    ])

    add_heading(doc, "1.1. Iteracje i rytm pracy", level=3)
    add_para(doc, [
        "Pracę zorganizowano w ",
        ("dwutygodniowych iteracjach", "b"),
        " (sprintach), w ramach których realizowano zamknięty zakres funkcjonalności. Każda iteracja "
        "rozpoczyna się od krótkiego planowania (lista zadań na sprint w kolumnie ",
        ("To do", "i"),
        " w tablicy Kanban) i kończy się retrospektywą oraz przeglądem wykonanych zmian. Komunikacja "
        "w trakcie sprintu odbywa się asynchronicznie — codzienne aktualizacje statusu w postaci "
        "krótkich notatek tekstowych zastępują formalne stand-upy."
    ])

    add_heading(doc, "1.2. Tablica zadań i przepływ pracy", level=3)
    add_para(doc, "Zadania są reprezentowane w postaci kart na tablicy Kanban z czterema kolumnami:",
             indent_first=False)
    for item in [
        ("Backlog", " — pomysły i zadania bez przypisanej iteracji;"),
        ("To do", " — zadania zaplanowane na bieżący sprint;"),
        ("In progress", " — zadania w trakcie realizacji (limit WIP = 2 na osobę);"),
        ("Done", " — zadania zakończone, zatwierdzone do scalenia."),
    ]:
        name, desc = item
        add_bullet(doc, [(name, "b"), desc])

    add_heading(doc, "1.3. Priorytetyzacja MoSCoW", level=3)
    add_para(doc, [
        "Zakres funkcjonalności zarządzany jest przy użyciu klasyfikacji ",
        ("MoSCoW (Must, Should, Could, Won't Have)", "b"),
        ". Każda funkcjonalność z PRD otrzymała jeden z czterech priorytetów. Klasyfikacja ta "
        "jest źródłem prawdy zarówno dla harmonogramu (kolory na wykresie Gantta w rozdziale 4.), "
        "jak i dla decyzji o zakresie MVP. Funkcje oznaczone jako ",
        ("Won't Have", "b"),
        " są jawnie wykluczone z bieżącej iteracji projektu i opisane jako kierunki rozwoju po obronie."
    ])

    add_heading(doc, "1.4. Definition of Done", level=3)
    add_para(doc, "Zadanie uznaje się za zakończone, gdy spełnione są łącznie wszystkie poniższe warunki:",
             indent_first=False)
    for txt in [
        "kod został przeglądnięty przez drugiego członka zespołu (Pull Request review);",
        "linting (ESLint) i typecheck (TypeScript) nie zgłaszają błędów;",
        "endpointy backendowe pokryte są testem klikalnym lub jednostkowym;",
        "frontend jest manualnie przetestowany w obu aplikacjach (pracownik + admin);",
        "zmiana została udokumentowana — w README, w komentarzu PR lub w rozdziale pracy.",
    ]:
        add_bullet(doc, txt)

    add_heading(doc, "1.5. Code review i kontrola wersji", level=3)
    add_para(doc, [
        "Repozytorium prowadzone jest jako ",
        ("monorepozytorium Git", "b"),
        (" z trzema strefami: backend-api, client-frontend, admin-frontend. Każda zmiana "
         "wprowadzana jest poprzez gałąź funkcjonalną ("),
        ("feature branch", "i"),
        ") i scalanie do gałęzi głównej odbywa się wyłącznie przez Pull Request. Stosujemy konwencję ",
        ("Conventional Commits", "b"),
        " w języku polskim (np. ",
        ("fix(client-frontend): wymuś jasne tokeny tekstu na ekranach auth", "i"),
        "), co ułatwia zarówno przeglądanie historii, jak i późniejsze opisanie zmian w pracy.",
    ])

    doc.add_page_break()

    # =========================================================
    # 2. STACK TECHNOLOGICZNY
    # =========================================================
    add_heading(doc, "2.  Stack technologiczny rozwiązania", level=1, size=15, space_before=0)

    add_para(doc, [
        "Rozwiązanie zostało zaimplementowane jako ",
        ("trójwarstwowa aplikacja webowa", "b"),
        " z osobnymi aplikacjami frontendowymi dla pracownika oraz dla działu HR/administratora "
        "i centralnym API obsługującym logikę biznesową. Dobór technologii był uzasadniony przede "
        "wszystkim potrzebą bezpieczeństwa danych wrażliwych, czytelnej modularnej architektury oraz "
        "możliwością opisania decyzji projektowych w pracy inżynierskiej."
    ])

    add_heading(doc, "2.1. Warstwa serwerowa (backend-api)", level=3)
    rows = [
        ["Komponent", "Technologia", "Uzasadnienie"],
        ["Framework",        "NestJS 11",                 "modularna architektura, podział na kontrolery / serwisy / moduły, wbudowane DI"],
        ["Język",            "TypeScript 5.9",            "statyczne typowanie redukuje błędy w warstwie modeli i DTO"],
        ["ORM",              "TypeORM 0.3",                "dojrzała integracja z NestJS, repozytoria + migracje"],
        ["Baza danych",      "PostgreSQL 16",              "relacyjna baza odpowiednia do wielotabelowego modelu RBAC + ankiety + wyniki"],
        ["Autentykacja",     "JWT + Passport",             "tokeny krótkożyciowe + refresh, oddzielenie ról pracownika/HR/admina"],
        ["Hashowanie haseł", "bcrypt",                     "standard branżowy, odporność na ataki słownikowe"],
        ["Walidacja DTO",    "class-validator + class-transformer", "deklaratywne reguły walidacji na poziomie kontrolerów"],
        ["Rate limiting",    "@nestjs/throttler",          "ochrona endpointu logowania przed atakami brute-force"],
        ["Nagłówki HTTP",    "helmet",                     "podstawowa ochrona przed atakami typu XSS / clickjacking"],
        ["E-mail",           "Nodemailer + nestjs-mailer", "powiadomienia o nowych testach i statusie zatwierdzenia konta"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(3.5), Cm(9.5)])

    add_heading(doc, "2.2. Frontend pracownika (client-frontend)", level=3)
    rows = [
        ["Komponent", "Technologia", "Uzasadnienie"],
        ["Framework UI",  "React 19",            "komponentowy model UI, ekosystem PWA"],
        ["Build tool",    "Vite 8",              "szybki HMR i krótkie czasy buildu produkcyjnego"],
        ["Język",         "TypeScript 5.9",      "spójność z backendem, typowanie DTO API"],
        ["Style",         "Tailwind CSS 3",      "utility-first, łatwo egzekwowalny design system"],
        ["State",         "Redux Toolkit 2",     "przewidywalny store na sesję i meta-dane użytkownika"],
        ["Routing",       "React Router 7",      "deklaratywne ścieżki, ochrona widoków przez strażników"],
        ["Animacje",      "Framer Motion 12",    "subtelne przejścia, większa płynność UX"],
        ["Ikony",         "Lucide React",        "spójna paleta ikon w stylu line-art"],
        ["PWA",           "vite-plugin-pwa",     "instalowalność, działanie offline po pierwszym wejściu"],
        ["Powiadomienia", "sonner",              "lekki toast manager"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(3.5), Cm(9.5)])

    add_heading(doc, "2.3. Frontend administracyjny / HR (admin-frontend)", level=3)
    rows = [
        ["Komponent", "Technologia", "Uzasadnienie"],
        ["Framework UI",  "Next.js 16 (App Router)", "uporządkowana struktura panelu, SSR dla widoków raportowych"],
        ["Język",         "TypeScript 5",            "spójność z backendem i client-frontend"],
        ["Style",         "Tailwind CSS 4",          "ten sam system tokenów co frontend pracownika"],
        ["Wykresy",       "Recharts 3",              "responsywne wykresy linowe i słupkowe do trendów HR"],
        ["Eksport",       "jsPDF + html2canvas",     "eksport raportu HR do PDF po stronie klienta"],
        ["Ciasteczka",    "js-cookie",               "zarządzanie sesją HTTP w panelu"],
        ["Theming",       "next-themes",             "obsługa trybu jasnego/ciemnego"],
        ["PWA",           "@ducanh2912/next-pwa",    "instalowalność panelu HR"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(3.5), Cm(9.5)])

    add_heading(doc, "2.4. Infrastruktura i wdrożenie", level=3)
    rows = [
        ["Komponent", "Technologia", "Uzasadnienie"],
        ["Konteneryzacja", "Docker + Docker Compose", "powtarzalne środowisko lokalne i produkcyjne"],
        ["Środowisko prod", "Railway",                "prosta orkiestracja kontenerów + zarządzana PostgreSQL"],
        ["System kontroli wersji", "Git + GitHub",    "monorepozytorium, ochrona gałęzi, code review"],
        ["CI (planowane)", "GitHub Actions",          "lint + typecheck + testy klikalne przy każdym PR"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(3.5), Cm(9.5)])

    doc.add_page_break()

    # =========================================================
    # 3. NARZĘDZIA
    # =========================================================
    add_heading(doc, "3.  Wykorzystywane narzędzia", level=1, size=15, space_before=0)

    add_para(doc, "Zestaw narzędzi został dobrany tak, by zminimalizować tarcia pomiędzy pracą "
                  "developerską a pracą dokumentacyjną. Większość narzędzi jest darmowa w wariancie "
                  "studenckim lub posiada licencje open-source.",
             indent_first=True)

    # 3.1 Development
    add_heading(doc, "3.1. Narzędzia developerskie", level=3)
    rows = [
        ["Kategoria", "Narzędzie", "Zastosowanie"],
        ["IDE",                   "Visual Studio Code, Cursor",      "edycja kodu, integracja z AI"],
        ["Kontener developerski", "Docker Desktop",                  "uruchomienie bazy i usług lokalnie"],
        ["Klient bazy danych",    "TablePlus / pgAdmin",             "przeglądanie schematu, ad-hoc query"],
        ["Klient HTTP",           "Postman, REST Client (VS Code)",  "testowanie endpointów API"],
        ["Linter / formatter",    "ESLint, Prettier",                "wymuszanie konwencji kodu"],
        ["Typecheck",             "TypeScript Compiler",             "weryfikacja typów w obu warstwach"],
        ["Migracje DB",           "TypeORM CLI",                     "kontrola wersji schematu bazy"],
        ["Build",                 "Vite, Next.js build, nest build", "produkcyjne paczki aplikacji"],
        ["Testy",                 "Jest (backend), Vitest (front)",  "testy jednostkowe i integracyjne"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(4.5), Cm(8.5)])

    # 3.2 Współpraca
    add_heading(doc, "3.2. Narzędzia współpracy i dokumentacji", level=3)
    rows = [
        ["Kategoria", "Narzędzie", "Zastosowanie"],
        ["Kontrola wersji",    "GitHub",                        "PR-y, code review, ochrona gałęzi master"],
        ["Tablica zadań",      "GitHub Projects (Kanban)",      "śledzenie sprintów i statusu zadań"],
        ["Komunikacja",        "Discord, Slack",                "krótkie ustalenia i wymiana plików"],
        ["Spotkania",          "Google Meet, MS Teams",         "konsultacje z promotorem, sync zespołu"],
        ["Diagramy",           "draw.io, Mermaid, PlantUML",    "diagramy ERD, przypadków użycia, sekwencji"],
        ["Design UI",          "Figma, Pencil",                 "makiety i prototypy, biblioteka komponentów"],
        ["Pisanie pracy",      "Microsoft Word, python-docx",   "rozdziały pracy, generowanie tabel i listingów"],
        ["Notatki / wiedza",   "Notion, Obsidian",              "notatki badawcze, decyzje architektoniczne"],
        ["Wsparcie AI",        "Claude Code, ChatGPT",          "review kodu, generowanie fragmentów dokumentacji"],
        ["Zarządzanie hasłami","1Password",                     "bezpieczne przechowywanie sekretów rozwojowych"],
    ]
    add_table(doc, rows, col_widths=[Cm(3.5), Cm(4.5), Cm(8.5)])

    doc.add_page_break()

    # =========================================================
    # 4. HARMONOGRAM PRACY (GANTT + MoSCoW)
    # =========================================================
    add_heading(doc, "4.  Harmonogram pracy (wykres Gantta z MoSCoW)", level=1, size=15, space_before=0)

    add_para(doc, [
        "Poniżej przedstawiono harmonogram pracy w postaci wykresu Gantta z naniesioną klasyfikacją ",
        ("MoSCoW", "b"),
        ". Każde zadanie ma kolor odpowiadający przypisanemu priorytetowi: ",
        ("zielony", "b"), " — Must Have, ",
        ("oliwkowy", "b"), " — Should Have, ",
        ("musztardowy", "b"), " — Could Have, ",
        ("karminowy z ukośnym wzorem", "b"),
        " — Won't Have. Czerwona, przerywana linia pionowa oznacza datę dzisiejszą "
        f"({TODAY.strftime('%Y-%m-%d')}). Kropkowana, granatowa linia oznacza umowny koniec semestru "
        "(czerwiec 2026) — okres obrony pracy inżynierskiej."
    ])

    # Wstaw obraz Gantta
    img_para = doc.add_paragraph()
    img_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img_para.paragraph_format.space_before = Pt(6)
    img_para.paragraph_format.space_after = Pt(6)
    run = img_para.add_run()
    run.add_picture(str(GANTT_PNG), width=Cm(17.0))

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(10)
    r = cap.add_run("Rys. 1. Harmonogram pracy MoodFlow z klasyfikacją MoSCoW.")
    set_run(r, italic=True, size=9)

    add_heading(doc, "4.1. Funkcjonalności Won't Have — uzasadnienie wykluczenia", level=3)
    add_para(doc, "Cztery elementy z dolnej części wykresu (kolor karminowy z ukośnym wzorem) zostały "
                  "świadomie wykluczone z zakresu pracy inżynierskiej. Ich realizacja wykraczałaby poza "
                  "ramy czasowe semestru oraz poza zakres uzasadniony charakterem pracy akademickiej. "
                  "Funkcje te zostały opisane jako rozszerzenia w sekcji „Kierunki dalszego rozwoju” "
                  "pracy inżynierskiej:")
    wont_items = [
        ("Integracja z systemami HR (SAP, Workday)",
         "wymaga zakupu licencji i dostępu do środowisk produkcyjnych klientów; brak wartości naukowej."),
        ("Certyfikacja systemu według ISO 27001",
         "proces wielomiesięczny, wymaga audytu zewnętrznego; zakres pracy ogranicza się do zgodności z dobrymi praktykami."),
        ("Mobilna aplikacja natywna (iOS/Android)",
         "PWA zapewnia większość korzyści mobilnych; aplikacje natywne wymagałyby drugiej linii kodu."),
        ("Integracje SSO (Okta, Azure AD)",
         "wymaga dostępu do tenantów korporacyjnych; w MVP wystarczy autentykacja własna."),
        ("Moduł telemedyczny (rezerwacja sesji terapeutycznych)",
         "wymaga partnerstw z platformami telemedycznymi i regulacji prawnych specyficznych dla medycyny."),
    ]
    for name, reason in wont_items:
        add_bullet(doc, [(name, "b"), " — ", reason])

    doc.add_page_break()

    # =========================================================
    # 5. RYZYKA + MITYGACJA
    # =========================================================
    add_heading(doc, "5.  Ryzyka projektowe i plan mitygacji", level=1, size=15, space_before=0)

    add_para(doc, "Rejestr ryzyk powstał w fazie analizy projektu i jest okresowo aktualizowany. "
                  "Każde ryzyko zostało ocenione w skali trzystopniowej (Niskie / Średnie / Wysokie) "
                  "w wymiarach prawdopodobieństwa wystąpienia oraz wpływu na powodzenie projektu. "
                  "Dla każdego ryzyka określono działania mitygujące oraz osobę odpowiedzialną.")

    risks = [
        ["#", "Ryzyko", "P", "W", "Mitygacja"],
        ["R1",
         "Brak czasu na implementację wszystkich modułów MVP",
         "W", "W",
         "Twarda priorytetyzacja MoSCoW; skupienie na Must Have. Funkcje Could Have realizowane wyłącznie po zamknięciu MVP."],
        ["R2",
         "Wyciek danych wrażliwych dotyczących zdrowia psychicznego",
         "N", "Kr",
         "Multi-tenant izolacja w warstwie ORM (tenant_id), audyt logów dostępu, k-anonymity, minimalizacja danych."],
        ["R3",
         "Identyfikacja pojedynczego pracownika w raporcie HR",
         "Ś", "W",
         "K-anonymity (k ≥ 5) wymuszone po stronie API; agregacja, brak ujawniania komentarzy w postaci wrażliwej."],
        ["R4",
         "Niewystarczająca wydajność panelu HR przy dużej liczbie wyników",
         "Ś", "Ś",
         "Indeksy w bazie, paginacja, lazy-loading komponentów wykresów, buforowanie agregatów (Could Have)."],
        ["R5",
         "Niezgodność z RODO w warstwie procesowej (klauzule, retencja)",
         "Ś", "W",
         "Konsultacja z opiekunem ds. prywatności w organizacji pilotażowej; checklisty zgodne z UODO."],
        ["R6",
         "Sygnał ryzyka samobójczego pominięty przez system",
         "N", "Kr",
         "Zawsze włączony tryb safety-net dla PHQ-9 pytanie 9 > 0; dedykowany komunikat + telefony zaufania."],
        ["R7",
         "Awaria środowiska produkcyjnego (Railway)",
         "Ś", "Ś",
         "Konfiguracja zdublowana w docker-compose, prowadzenie kopii zapasowych bazy, dokumentacja kroków odtworzenia."],
        ["R8",
         "Konflikt wersji zależności (NestJS 11, React 19, Next 16)",
         "N", "Ś",
         "Zamrożone wersje w package-lock.json, sprawdzanie kompatybilności przy każdej aktualizacji."],
        ["R9",
         "Utrata danych w trakcie developmentu",
         "Ś", "Ś",
         "Migracje TypeORM przed każdą zmianą schematu, regularne commity, wolumeny Docker na dysku."],
        ["R10",
         "Niedostępność członka zespołu (choroba, sesja egzaminacyjna)",
         "Ś", "W",
         "Praca w parze, dokumentacja decyzji w README, każdy moduł posiada drugiego „opiekuna”."],
        ["R11",
         "Zmiana wymagań ze strony promotora w trakcie semestru",
         "Ś", "Ś",
         "Cotygodniowe konsultacje, dokumentacja decyzji w pliku decisions.md, elastyczna architektura modularna."],
        ["R12",
         "Brak walidowanych skal psychologicznych w domenie publicznej",
         "N", "W",
         "Dobór skal z domeny publicznej (PHQ-9, GAD-7, PSS-10, WHO-5), źródła zacytowane w pracy."],
        ["R13",
         "Słaba użyteczność interfejsu pracownika (porzucanie ankiet)",
         "Ś", "Ś",
         "Testy klikalne z 8–10 osobami, kwestionariusz SUS, iteracja UI przed wdrożeniem."],
        ["R14",
         "Niespójność designu między aplikacjami pracownika i HR",
         "Ś", "N",
         "Wspólny token system Tailwind, biblioteka komponentów wzorowana na Figmie, audyt UI raz na sprint."],
        ["R15",
         "Brak akceptacji konta firmy z powodu niejasnego procesu",
         "N", "Ś",
         "Komunikaty statusu w panelu, e-mail powiadamiający o akceptacji, instrukcja w README."],
    ]
    add_table(doc, risks, col_widths=[Cm(1.0), Cm(5.5), Cm(0.9), Cm(0.9), Cm(9.0)])

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    r = p.add_run("Legenda: ")
    set_run(r, bold=True, size=9)
    r = p.add_run("P = prawdopodobieństwo wystąpienia (N — niskie, Ś — średnie, W — wysokie).  "
                  "W = wpływ na powodzenie projektu (N — niski, Ś — średni, W — wysoki, Kr — krytyczny).")
    set_run(r, size=9, italic=True)

    doc.add_page_break()

    # =========================================================
    # 6. PLAN QA + FORMATKA TESTOWA
    # =========================================================
    add_heading(doc, "6.  Plan monitorowania jakości i formatka scenariusza testowego",
                level=1, size=15, space_before=0)

    add_heading(doc, "6.1. Cele monitorowania jakości", level=3)
    add_para(doc, "Celem planu jakości w projekcie MoodFlow jest zapewnienie, że dostarczane "
                  "funkcjonalności są: poprawne (zgodne ze specyfikacją), bezpieczne (chronią dane "
                  "wrażliwe), użyteczne (umożliwiają pracownikowi szybkie wypełnienie ankiety) i "
                  "wydajne (czas odpowiedzi API w rozsądnym przedziale). Monitorowanie jakości "
                  "prowadzone jest w sposób ciągły — równolegle z developmentem — a nie jako "
                  "wydzielony etap końcowy.")

    add_heading(doc, "6.2. Typy testów", level=3)
    test_types = [
        ("Testy jednostkowe (unit)",
         "Pokrywają logikę domenową w izolacji od I/O. Realizowane głównie dla scoringu testów "
         "psychologicznych oraz funkcji anonimizacji. Framework: Jest (backend) i Vitest (front)."),
        ("Testy integracyjne",
         "Pokrywają warstwę kontrolerów + serwisów + ORM. Uruchamiane na lokalnej instancji "
         "PostgreSQL w kontenerze. Sprawdzają poprawność scenariuszy multi-tenant, autoryzacji "
         "i walidacji DTO."),
        ("Testy klikalne (E2E manualne)",
         "Pełne ścieżki użytkownika przechodzone ręcznie według scenariuszy opisanych w "
         "dokumencie 5.1 (Testy klikalne). Każdy scenariusz zawiera prerequisites, kroki, "
         "oczekiwany wynik i kryterium akceptacji."),
        ("Testy bezpieczeństwa",
         "Próby obejścia autoryzacji (token innej roli, manipulacja tenant_id), próby "
         "SQL-injection (zachowanie po stronie ORM), test rate-limitingu na endpoint logowania."),
        ("Testy wydajnościowe",
         "Pomiar czasu odpowiedzi krytycznych endpointów (logowanie, zapis odpowiedzi, "
         "agregaty HR) narzędziem ApacheBench oraz audyt Lighthouse dla widoków frontowych."),
        ("Testy użyteczności",
         "Sesje z 8–10 użytkownikami zewnętrznymi (znajomi, rodzina), obserwacja porzuceń, "
         "kwestionariusz SUS po sesji. Wyniki zostaną opisane w rozdziale „Testy i wyniki”."),
    ]
    for name, body in test_types:
        add_bullet(doc, [(name, "b"), " — ", body])

    add_heading(doc, "6.3. Środowiska testowe", level=3)
    envs = [
        ["Środowisko", "Cel", "Baza danych", "Adres / dostęp"],
        ["Lokalne (dev)",      "codzienna praca developerska", "PostgreSQL w Dockerze (port 5432)", "localhost:3000 / :3001 / :4000"],
        ["Stage (Railway)",    "demo dla promotora i obrona",  "PostgreSQL managed (Railway)",      "domena Railway HTTPS"],
        ["Testy klikalne",     "scenariusze E2E manualne",     "kopia stage z zsynchronizowanymi seedami", "domena Railway / dev"],
    ]
    add_table(doc, envs, col_widths=[Cm(3.5), Cm(5.0), Cm(4.5), Cm(4.0)])

    add_heading(doc, "6.4. Kryteria akceptacji i metryki jakości", level=3)
    metrics = [
        ["Metryka", "Cel", "Sposób pomiaru"],
        ["Czas odpowiedzi API (P50)",     "≤ 300 ms dla zapytań standardowych", "Logi NestJS + ApacheBench"],
        ["Czas odpowiedzi API (P95)",     "≤ 1 s",                             "ApacheBench (1000 req)"],
        ["Lighthouse Performance (front)","≥ 90 (mobile)",                     "Lighthouse w Chrome DevTools"],
        ["Lighthouse Accessibility",      "≥ 95",                              "Lighthouse w Chrome DevTools"],
        ["Pokrycie scoringu testami",     "≥ 80%",                              "Jest --coverage"],
        ["Liczba błędów 5xx w trakcie testów klikalnych", "0",                  "Logi backendu + scenariusze E2E"],
        ["Skuteczność blokady multi-tenant", "100%",                            "Scenariusz bezpieczeństwa #SEC-01"],
        ["SUS — System Usability Scale",  "≥ 70 (akceptowalne)",                "Kwestionariusz po sesji UX"],
    ]
    add_table(doc, metrics, col_widths=[Cm(6.0), Cm(4.5), Cm(6.5)])

    add_heading(doc, "6.5. Formatka scenariusza testowego", level=3)
    add_para(doc, "Każdy scenariusz testu klikalnego dokumentowany jest według poniższej formatki. "
                  "Formatka ta jest spójna ze strukturą rozdziału 5.1. pracy inżynierskiej i pozwala "
                  "jednoznacznie odtworzyć test, zweryfikować rezultat oraz przypisać go do "
                  "wymagania funkcjonalnego.")
    formatka = [
        ["Pole",                "Opis"],
        ["ID scenariusza",      "Unikalny identyfikator (np. TC-AUTH-001, TC-HR-014)"],
        ["Tytuł",               "Krótki opis testowanej ścieżki użytkownika"],
        ["Powiązane wymaganie", "Numer wymagania z rozdziału 2.4 (np. WF-12)"],
        ["Priorytet MoSCoW",    "Must / Should / Could / Won't"],
        ["Aktor",               "Pracownik / HR / Administrator firmy / Administrator platformy"],
        ["Środowisko",          "dev / stage / lokalne"],
        ["Warunki wstępne",     "Stan systemu przed testem (np. konto zatwierdzone, kod firmy znany)"],
        ["Dane testowe",        "Wartości używane podczas testu (loginy, hasła, kod firmy, odpowiedzi)"],
        ["Kroki",               "Numerowana lista czynności wykonywanych przez testera"],
        ["Oczekiwany wynik",    "Co system powinien wyświetlić / zapisać / wywołać"],
        ["Kryterium akceptacji","Warunek konieczny do uznania scenariusza za zaliczony"],
        ["Wynik faktyczny",     "Co zaobserwowano podczas wykonania testu"],
        ["Status",              "PASS / FAIL / BLOCKED / SKIPPED"],
        ["Uwagi / błędy",       "Numer zgłoszenia, screen, dodatkowe obserwacje"],
        ["Data wykonania",      "RRRR-MM-DD"],
        ["Wykonujący",          "Imię i nazwisko testera"],
    ]
    add_table(doc, formatka, col_widths=[Cm(5.0), Cm(12.0)])

    add_heading(doc, "6.6. Przykład wypełnionej formatki", level=3)
    add_para(doc, "Poniżej przykład wypełnionej formatki dla scenariusza krytycznego z punktu "
                  "widzenia bezpieczeństwa: weryfikacja, że konto HR firmy A nie ma dostępu do "
                  "wyników firmy B.")
    przyklad = [
        ["Pole",                "Wartość"],
        ["ID scenariusza",      "TC-SEC-003"],
        ["Tytuł",               "Brak dostępu HR firmy A do wyników firmy B (multi-tenant)"],
        ["Powiązane wymaganie", "WN-SEC-04 (izolacja danych pomiędzy tenantami)"],
        ["Priorytet MoSCoW",    "Must Have"],
        ["Aktor",               "HR firmy A (token JWT z tenant_id = A)"],
        ["Środowisko",          "stage (Railway)"],
        ["Warunki wstępne",     "W systemie istnieją dwie firmy A i B z różnymi tenant_id. Każda posiada minimum 5 zatwierdzonych pracowników z wynikami PHQ-9."],
        ["Dane testowe",        "Konto HR firmy A: hr@firmaA.test / hasło testowe; URL endpointu raportu firmy B: /api/v1/analytics/wellbeing-index?tenantId=B"],
        ["Kroki",
         "1. Zaloguj się jako HR firmy A.  "
         "2. Skopiuj token JWT z DevTools.  "
         "3. Wywołaj endpoint Postmanem z parametrem tenantId=B (firma obca).  "
         "4. Zaobserwuj odpowiedź API."],
        ["Oczekiwany wynik",
         "API zwraca odpowiedź 403 Forbidden z komunikatem „Insufficient permissions” oraz nie zwraca jakichkolwiek danych firmy B w treści odpowiedzi."],
        ["Kryterium akceptacji","HTTP 403 + pusty body danych firmy B + wpis w audit_logs z akcją „forbidden_cross_tenant_read”."],
        ["Wynik faktyczny",     "API zwróciło 403 Forbidden, body nie zawiera danych firmy B, w audit_logs pojawił się wpis o próbie dostępu."],
        ["Status",              "PASS"],
        ["Uwagi / błędy",       "—"],
        ["Data wykonania",      "2026-05-09"],
        ["Wykonujący",          "Mateusz Matczuk"],
    ]
    add_table(doc, przyklad, col_widths=[Cm(5.0), Cm(12.0)])

    add_heading(doc, "6.7. Sposób raportowania wyników", level=3)
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
        ("type:bug", "i"),
        " i priorytetem zgodnym z klasyfikacją MoSCoW funkcji, której dotyczą. Naprawa zgłoszenia "
        "skutkuje ponownym wykonaniem scenariusza i aktualizacją statusu w arkuszu zbiorczym."
    ])

    doc.save(OUT_DOCX)
    print(f"✓ Dokument zapisany: {OUT_DOCX}")


def main():
    if not GANTT_PNG.exists():
        print("→ Wykres Gantta nie istnieje — generuję wariant tabelaryczny...")
        import subprocess, sys
        subprocess.run([sys.executable, str(ROOT / "build_gantt_moscow.py")], check=True)
    else:
        print(f"→ Wykres Gantta już istnieje: {GANTT_PNG.name}")
    print("→ Buduję dokument DOCX...")
    build_doc()
    print("✓ Gotowe.")


if __name__ == "__main__":
    main()
