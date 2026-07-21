#!/usr/bin/env python3
"""
Generuje edytowalny rejestr ryzyk projektowych z planem mitygacji
w postaci natywnej tabeli Word (DOCX).

Wyjście: Ryzyka-Mitygacja-Tabela.docx (A4 poziomy)
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
# Paleta kolorów — wg poziomu ryzyka
# =========================================================
LEVEL_COLORS = {
    "KRYT": "B8125A",   # krytyczne — karminowy (jak Won't w MoSCoW)
    "WYS":  "D97706",   # wysokie — pomarańcz
    "SRE":  "EAB308",   # średnie — żółty
    "NIS":  "16A34A",   # niskie — zielony
}
LEVEL_LABEL = {
    "KRYT": "Krytyczny",
    "WYS":  "Wysoki",
    "SRE":  "Średni",
    "NIS":  "Niski",
}
SCALE_LABEL = {"N": "Niskie", "Ś": "Średnie", "W": "Wysokie", "Kr": "Krytyczny"}

NAVY     = "1D3E44"
HEADER_BG = "1D3E44"
ALT_BG   = "F4F1E8"


# =========================================================
# Rejestr ryzyk
# Każdy rekord: (id, kategoria, ryzyko, P, W, poziom, mitygacja, plan_B, właściciel, sygnał_ostrzegawczy)
# =========================================================
RISKS = [
    ("R1",
     "Harmonogram",
     "Brak czasu na implementację wszystkich modułów MVP.",
     "W", "W", "KRYT",
     "Twarda priorytetyzacja MoSCoW; pierwsze wdrożenie wyłącznie funkcji Must Have. Funkcje Could Have realizowane wyłącznie po zamknięciu MVP. Cotygodniowy przegląd zakresu z promotorem.",
     "Obcięcie zakresu Could Have. Wycofanie powiadomień e-mail (Should Have → Could Have). Skupienie się na 3 testach zamiast 5.",
     "Zespół",
     "Zaległość > 10 zadań w kolumnie In progress lub przesunięcie kamienia milowego o > 1 tydzień."),

    ("R2",
     "Bezpieczeństwo",
     "Wyciek danych wrażliwych dotyczących zdrowia psychicznego pracowników.",
     "N", "Kr", "KRYT",
     "Multi-tenant izolacja w warstwie ORM (tenant_id w każdym zapytaniu), audytowane logi dostępu, k-anonymity w raportach HR, minimalizacja danych, hashowanie haseł (bcrypt), HTTPS, ograniczenie uprawnień ról.",
     "Natychmiastowa zmiana haseł i tokenów, zgłoszenie do PUODO w 72 h (RODO), powiadomienie użytkowników, audyt poincydentowy, łatka bezpieczeństwa.",
     "Backend developer",
     "Niewyjaśniony wpis w audit_logs z akcją cross-tenant_read lub anomalia w logach Nginx/Railway."),

    ("R3",
     "Prywatność",
     "Identyfikacja pojedynczego pracownika w raporcie HR mimo agregacji.",
     "Ś", "W", "WYS",
     "K-anonymity (k ≥ 5) wymuszone po stronie API. Komunikat „niewystarczająca liczba uczestników” zamiast danych. Brak ujawniania surowych komentarzy z identyfikatorami. Logi dostępu.",
     "Wstrzymanie publikacji raportu, podniesienie progu k do 10, ręczna weryfikacja agregacji przez administratora platformy.",
     "Backend developer",
     "Próba pobrania raportu dla grupy < 5 osób (HTTP 403 z naszego API) lub skarga pracownika."),

    ("R4",
     "Wydajność",
     "Niewystarczająca wydajność panelu HR przy dużej liczbie wyników.",
     "Ś", "Ś", "SRE",
     "Indeksy w bazie na polach tenant_id, department_id, created_at. Paginacja list. Lazy-loading komponentów wykresów. Plan buforowania agregatów (Could Have).",
     "Włączenie cache w Redis na endpointach HR, optymalizacja zapytań N+1, dodanie materialized views w PostgreSQL.",
     "Backend developer",
     "P95 czasu odpowiedzi > 2 s w widoku raportu lub timeouty w Lighthouse."),

    ("R5",
     "Prawne",
     "Niezgodność z RODO w warstwie procesowej (klauzule informacyjne, retencja danych).",
     "Ś", "W", "WYS",
     "Klauzule informacyjne w trakcie rejestracji. Polityka prywatności podlinkowana z każdej strony. Mechanizm „prawa do bycia zapomnianym” (soft-delete + retencja 30 dni). Konsultacja z opiekunem ds. prywatności.",
     "Tymczasowe wyłączenie nowych rejestracji, korekta klauzul, retroaktywna informacja do użytkowników, dokumentacja zmian w decisions.md.",
     "Promotor + autor",
     "Skarga pracownika lub HR. Audyt RODO przed obroną."),

    ("R6",
     "Bezpieczeństwo / Etyka",
     "Sygnał ryzyka samobójczego pominięty przez system (krytyczny wynik PHQ-9).",
     "N", "Kr", "KRYT",
     "Zawsze włączony tryb safety-net dla PHQ-9 pyt. 9 > 0. Dedykowany komunikat z telefonami zaufania (116 123, 800 70 22 22, 116 111). Test integracyjny scenariusza co iteracji.",
     "Natychmiastowy hotfix, ponowne przesłanie komunikatu do użytkowników z najwyższym wynikiem PHQ-9 w ostatnich 7 dniach, audyt logiki scoringu.",
     "Backend developer",
     "Wynik testu z odpowiedzią > 0 w pytaniu 9, ale brak rekordu w wyświetlonych komunikatach safety-net."),

    ("R7",
     "Infrastruktura",
     "Awaria środowiska produkcyjnego (Railway) podczas obrony.",
     "Ś", "Ś", "SRE",
     "Konfiguracja zdublowana w docker-compose.prod.yml, możliwa lokalna prezentacja w razie awarii chmury. Kopie zapasowe bazy przed obroną. Dokumentacja kroków odtworzenia.",
     "Uruchomienie aplikacji lokalnie (laptop prelegenta) z pre-seedowaną bazą. Backup screenshotów kluczowych ekranów.",
     "Autor",
     "Status incident.io / statuspage Railway lub błędy 5xx z monitoringu Uptime Robot."),

    ("R8",
     "Techniczne",
     "Konflikt wersji zależności (NestJS 11, React 19, Next 16).",
     "N", "Ś", "NIS",
     "Zamrożone wersje w package-lock.json. Sprawdzanie kompatybilności przy każdej aktualizacji. Pin major-versions w package.json.",
     "Rollback ostatniej aktualizacji, użycie node 20 LTS, ręczne rozwiązanie konfliktu przez yarn resolutions / npm overrides.",
     "Frontend developer",
     "Błąd npm install w CI lub niedziałający build lokalny po pull."),

    ("R9",
     "Operacyjne",
     "Utrata danych w trakcie developmentu (przypadkowe truncate, błąd migracji).",
     "Ś", "Ś", "SRE",
     "Migracje TypeORM przed każdą zmianą schematu (forward + revert). Regularne commity gałęzi feature. Wolumeny Docker na dysku. Backup bazy raz w tygodniu.",
     "Odtworzenie ze snapshot Docker, replay migracji z gałęzi, w ostateczności re-seed bazy z fixtures.",
     "Zespół",
     "Błąd migracji TypeORM lub brak danych w aplikacji po deployu."),

    ("R10",
     "Organizacyjne",
     "Niedostępność członka zespołu (choroba, sesja egzaminacyjna).",
     "Ś", "W", "WYS",
     "Praca w parze. Dokumentacja decyzji w README i decisions.md. Każdy moduł posiada drugiego „opiekuna”. Conventional Commits ułatwiają nadrobienie kontekstu.",
     "Przejęcie obszaru przez drugiego członka. Wydłużenie sprintu o 1 tydzień. Eskalacja do promotora przy dłuższej niedostępności.",
     "Zespół",
     "Brak commitów / wiadomości > 5 dni roboczych."),

    ("R11",
     "Projektowe",
     "Zmiana wymagań ze strony promotora w trakcie semestru.",
     "Ś", "Ś", "SRE",
     "Cotygodniowe konsultacje z promotorem. Dokumentacja decyzji w pliku decisions.md. Elastyczna architektura modularna ułatwiająca lokalne zmiany.",
     "Renegocjacja zakresu — wydzielenie nowych wymagań do osobnego sprintu, ewentualna reklasyfikacja do Could Have.",
     "Autor + promotor",
     "Komentarz promotora żądający zmiany lub odmienne uzasadnienie w dokumentacji."),

    ("R12",
     "Merytoryczne",
     "Brak walidowanych skal psychologicznych w domenie publicznej.",
     "N", "W", "NIS",
     "Dobór skal z domeny publicznej (PHQ-9, GAD-7, PSS-10, WHO-5). Źródła zacytowane w pracy z numerami DOI. Konsultacja z literaturą psychologiczną.",
     "Zastąpienie skali przez dostępną alternatywę (np. CES-D zamiast PHQ-9). Skontaktowanie się z opiekunem psychologicznym.",
     "Autor",
     "Powiadomienie o naruszeniu praw autorskich lub komunikat od wydawcy skali."),

    ("R13",
     "Użyteczność",
     "Słaba użyteczność interfejsu pracownika (porzucanie ankiet).",
     "Ś", "Ś", "SRE",
     "Testy klikalne z 8–10 osobami zewnętrznymi. Kwestionariusz SUS po sesji. Iteracja UI przed wdrożeniem. Maksymalnie 3 kliki do rozpoczęcia ankiety.",
     "Uproszczenie ankiety (mniej pytań na ekran), wprowadzenie wskaźnika postępu, A/B test nagłówków.",
     "Frontend developer",
     "Wskaźnik porzucenia ankiety > 30% lub SUS < 60."),

    ("R14",
     "Spójność produktu",
     "Niespójność designu między aplikacjami pracownika i HR.",
     "Ś", "N", "NIS",
     "Wspólny token system Tailwind. Biblioteka komponentów wzorowana na Figmie. Audyt UI raz na sprint. Wspólny styl auth screens.",
     "Refaktor komponentów do wspólnej biblioteki ui/. Synchronizacja tokenów kolorów.",
     "Frontend developer",
     "Różne kolory akcentowe lub fonty w obu aplikacjach w trakcie code review."),

    ("R15",
     "Onboarding",
     "Brak akceptacji konta firmy z powodu niejasnego procesu lub opóźnienia.",
     "N", "Ś", "NIS",
     "Komunikaty statusu w panelu (pending / approved / rejected). E-mail powiadamiający o akceptacji. Instrukcja onboardingu w README. SLA 24 h na akceptację konta.",
     "Manualna akceptacja przez administratora platformy, kontakt telefoniczny ze zgłaszającym, wydłużenie SLA do 48 h z komunikatem.",
     "Administrator platformy",
     "Konto > 48 h w statusie pending lub negatywny feedback przy demo."),
]


# =========================================================
# OOXML helpers
# =========================================================
def set_run(run, *, bold=False, italic=False, size=10, color=None, font="Verdana"):
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


def shade_cell(cell, color_hex, *, pattern="clear", stripe="auto"):
    tc_pr = cell._tc.get_or_add_tcPr()
    for s in tc_pr.findall(qn("w:shd")):
        tc_pr.remove(s)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), pattern)
    shd.set(qn("w:color"), stripe)
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


def set_table_total_width(table, total_cm):
    tbl_pr = table._element.find(qn("w:tblPr"))
    for w in tbl_pr.findall(qn("w:tblW")):
        tbl_pr.remove(w)
    tblW = OxmlElement("w:tblW")
    tblW.set(qn("w:type"), "dxa")
    tblW.set(qn("w:w"), str(int(total_cm * 567)))
    tbl_pr.append(tblW)


def write_cell(cell, text, *, bold=False, italic=False, color=None, size=9,
               bg=None, align="left", anchor="center"):
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
        "left":  WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right":  WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }[align]
    set_cell_border(cell)
    if bg:
        shade_cell(cell, bg)
    if text:
        # tekst może mieć wiele linii — \n
        lines = text.split("\n") if isinstance(text, str) else [text]
        for i, line in enumerate(lines):
            if i > 0:
                p = cell.add_paragraph()
                pf = p.paragraph_format
                pf.line_spacing = 1.15
                pf.space_before = Pt(0); pf.space_after = Pt(0)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(line)
            set_run(r, bold=bold, italic=italic, size=size, color=color)


# =========================================================
# Budowa dokumentu
# =========================================================
def main():
    doc = Document()

    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width  = Cm(29.7)
    section.page_height = Cm(21.0)
    section.top_margin    = Cm(1.2)
    section.bottom_margin = Cm(1.2)
    section.left_margin   = Cm(1.2)
    section.right_margin  = Cm(1.2)

    style = doc.styles["Normal"]
    style.font.name = "Verdana"
    style.font.size = Pt(10)

    # ---------- Tytuł ----------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Rejestr ryzyk projektowych MoodFlow wraz z planem mitygacji")
    set_run(r, bold=True, size=14, color=NAVY)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("(źródło: opracowanie własne)")
    set_run(r, italic=True, size=9, color="666666")

    # ---------- Wprowadzenie ----------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Cm(0.6)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(
        "Rejestr ryzyk projektu MoodFlow powstał w fazie analizy i jest okresowo aktualizowany. "
        "Każde ryzyko zostało ocenione w dwóch wymiarach: prawdopodobieństwa wystąpienia (P) "
        "oraz wpływu na powodzenie projektu (W). Na podstawie tych ocen przypisano jeden "
        "z czterech poziomów ryzyka (krytyczny / wysoki / średni / niski) wraz z kolorem "
        "ostrzegawczym w kolumnie „Poziom”. Dla każdego ryzyka zdefiniowano działania "
        "zapobiegawcze (kolumna „Plan mitygacji”) oraz działania korekcyjne podejmowane "
        "w razie materializacji ryzyka (kolumna „Plan B”). Sygnał ostrzegawczy ułatwia "
        "wczesne wykrycie problemu."
    )
    set_run(r, size=10)

    # ---------- Macierz ryzyk (heatmap 3×4) ----------
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("1.  Macierz ryzyk (heatmapa)")
    set_run(r, bold=True, size=12, color=NAVY)

    # P×W = 3×4
    # rzędy:    P=Wysokie (góra), P=Średnie, P=Niskie
    # kolumny:  W=Niski, W=Średni, W=Wysoki, W=Krytyczny
    matrix_levels = [
        # P, W → poziom (kolor tła komórki)
        # Domyślne wartości matrycy (można edytować ręcznie w Wordzie)
        ("NIS", "NIS", "WYS", "KRYT"),     # P=Wysokie
        ("NIS", "SRE", "WYS", "KRYT"),     # P=Średnie
        ("NIS", "NIS", "SRE", "KRYT"),     # P=Niskie
    ]
    # Liczymy ID-y ryzyk w każdej komórce
    p_idx = {"W": 0, "Ś": 1, "N": 2}
    w_idx = {"N": 0, "Ś": 1, "W": 2, "Kr": 3}
    matrix_cells = [["" for _ in range(4)] for _ in range(3)]
    for r_id, kat, opis, P, W, lvl, *_ in RISKS:
        pi = p_idx[P]; wi = w_idx[W]
        if matrix_cells[pi][wi]:
            matrix_cells[pi][wi] += ", " + r_id
        else:
            matrix_cells[pi][wi] = r_id

    matrix = doc.add_table(rows=4, cols=5)
    matrix.alignment = WD_TABLE_ALIGNMENT.LEFT
    matrix.autofit = False
    set_table_grid(matrix, [2.4, 4.6, 4.6, 4.6, 4.6])
    set_table_total_width(matrix, 2.4 + 4.6*4)

    # Header
    write_cell(matrix.cell(0, 0), "", bg="FFFFFF")
    headers_w = ["W = Niski", "W = Średni", "W = Wysoki", "W = Krytyczny"]
    for i, h in enumerate(headers_w):
        write_cell(matrix.cell(0, 1 + i), h, bold=True, bg=HEADER_BG,
                   color="FFFFFF", size=10, align="center")
    row_labels_p = ["P = Wysokie", "P = Średnie", "P = Niskie"]
    for r_i in range(3):
        write_cell(matrix.cell(1 + r_i, 0), row_labels_p[r_i],
                   bold=True, bg=HEADER_BG, color="FFFFFF",
                   size=10, align="center")
        for c_i in range(4):
            lvl = matrix_levels[r_i][c_i]
            cell_text = matrix_cells[r_i][c_i] or "—"
            write_cell(
                matrix.cell(1 + r_i, 1 + c_i),
                cell_text,
                bg=LEVEL_COLORS[lvl],
                color="FFFFFF" if lvl in ("KRYT", "WYS") else "1a1a1a",
                bold=True,
                size=11,
                align="center",
            )

    # Legenda pod macierzą
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Skala oceny: ")
    set_run(r, bold=True, size=9)
    r = p.add_run("P — Prawdopodobieństwo (Niskie / Średnie / Wysokie). "
                  "W — Wpływ na powodzenie projektu (Niski / Średni / Wysoki / Krytyczny). "
                  "Poziom ryzyka:  ")
    set_run(r, size=9, italic=True)
    # mini-swatches w legendzie
    for key in ["KRYT", "WYS", "SRE", "NIS"]:
        r = p.add_run("  ■  ")
        set_run(r, bold=True, color=LEVEL_COLORS[key], size=11)
        r = p.add_run(LEVEL_LABEL[key])
        set_run(r, size=9)

    # ---------- Szczegółowy rejestr ryzyk ----------
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("2.  Szczegółowy rejestr ryzyk z planem mitygacji")
    set_run(r, bold=True, size=12, color=NAVY)

    # 9 kolumn — szerokości dopasowane tak, by nazwy nie zawijały się litera-po-literze
    col_widths = [0.9, 5.4, 0.7, 0.7, 2.3, 6.5, 4.6, 2.1, 3.3]
    header_row = ["#", "Opis ryzyka", "P", "W", "Poziom",
                  "Plan mitygacji (działania zapobiegawcze)",
                  "Plan B (działania korekcyjne)",
                  "Właściciel",
                  "Sygnał ostrzegawczy"]

    n_rows = 1 + len(RISKS)
    table = doc.add_table(rows=n_rows, cols=len(col_widths))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_grid(table, col_widths)
    set_table_total_width(table, sum(col_widths))

    # Layout fixed
    tbl_pr = table._element.find(qn("w:tblPr"))
    tbl_layout = OxmlElement("w:tblLayout")
    tbl_layout.set(qn("w:type"), "fixed")
    tbl_pr.append(tbl_layout)

    # Header row
    for i, h in enumerate(header_row):
        write_cell(table.cell(0, i), h, bold=True, bg=HEADER_BG,
                   color="FFFFFF", size=9, align="center")
        set_cell_width(table.cell(0, i), col_widths[i])

    # Data rows
    for r_idx, (rid, kat, opis, P, W, lvl, mit, plan_b, owner, signal) in enumerate(RISKS):
        row = 1 + r_idx
        row_bg = ALT_BG if r_idx % 2 == 0 else "FFFFFF"

        # # tylko ID, bez kategorii (kategoria jako mała kursywa w opisie ryzyka)
        write_cell(table.cell(row, 0), rid, bold=True, size=10,
                   align="center", bg=row_bg, anchor="center")
        # Opis ryzyka + kategoria (kursywa) w osobnym akapicie
        cell_desc = table.cell(row, 1)
        cell_desc.text = ""
        cell_desc.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p1 = cell_desc.paragraphs[0]
        p1.paragraph_format.line_spacing = 1.15
        p1.paragraph_format.space_before = Pt(1)
        p1.paragraph_format.space_after = Pt(2)
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_cat = p1.add_run(f"[{kat}]")
        set_run(r_cat, italic=True, size=8, color="666666")
        p2 = cell_desc.add_paragraph()
        p2.paragraph_format.line_spacing = 1.15
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(1)
        p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_opis = p2.add_run(opis)
        set_run(r_opis, size=9)
        set_cell_border(cell_desc)
        shade_cell(cell_desc, row_bg)
        # P
        write_cell(table.cell(row, 2), P, bold=True, size=10,
                   align="center", bg=row_bg)
        # W
        write_cell(table.cell(row, 3), W, bold=True, size=10,
                   align="center", bg=row_bg)
        # Poziom (kolor)
        write_cell(table.cell(row, 4), LEVEL_LABEL[lvl], bold=True, size=9,
                   color="FFFFFF" if lvl in ("KRYT", "WYS") else "1a1a1a",
                   align="center", bg=LEVEL_COLORS[lvl])
        # Mitygacja
        write_cell(table.cell(row, 5), mit, size=9, align="left",
                   bg=row_bg, anchor="top")
        # Plan B
        write_cell(table.cell(row, 6), plan_b, size=9, align="left",
                   bg=row_bg, anchor="top")
        # Właściciel
        write_cell(table.cell(row, 7), owner, size=9, align="center",
                   bg=row_bg)
        # Sygnał
        write_cell(table.cell(row, 8), signal, size=9, italic=True,
                   align="left", bg=row_bg, anchor="top")

        # ustaw szerokości
        for i, w_cm in enumerate(col_widths):
            set_cell_width(table.cell(row, i), w_cm)

    # Wysokość wierszy
    for i, row in enumerate(table.rows):
        h = Cm(0.55) if i == 0 else Cm(2.6)
        row.height = h
        row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST

    # ---------- Notatka edycyjna ----------
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    r = p.add_run(
        "Notatka edycyjna: aby zmienić poziom ryzyka, kliknij komórkę „Poziom” "
        "i użyj funkcji „Cieniowanie” (kolory: krytyczny — karmin, wysoki — pomarańcz, "
        "średni — żółty, niski — zieleń). Aby dodać nowe ryzyko, kliknij prawym przyciskiem "
        "w istniejący wiersz i wybierz „Wstaw wiersz”. Identyfikator ryzyka (kolumna „#”) "
        "powinien być unikalny — kolejne numery R1, R2, …"
    )
    set_run(r, italic=True, size=9, color="555555")

    out = Path(__file__).parent / "Ryzyka-Mitygacja-Tabela.docx"
    doc.save(out)
    print(f"✓ Zapisano: {out}")


if __name__ == "__main__":
    main()
