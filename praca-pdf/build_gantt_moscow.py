#!/usr/bin/env python3
"""
Generuje wykres Gantta MoodFlow w stylu wzorowanym na Gantt-MoodFlow.png
(tabelaryczna siatka tygodniowa, banner per faza), ale z kolorowaniem
zadań według klasyfikacji MoSCoW (Must / Should / Could / Won't Have).

Wyjście: Gantt-MoSCoW.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from datetime import date


# =========================================================
# Paleta kolorów
# =========================================================
MOSCOW = {
    "MUST":   "#2D4631",
    "SHOULD": "#5A5E2C",
    "COULD":  "#8D7D1E",
    "WONT":   "#B8125A",
}
MOSCOW_LABEL = {
    "MUST":   "Must Have — krytyczne dla obrony MVP",
    "SHOULD": "Should Have — istotne, planowane do MVP",
    "COULD":  "Could Have — jeśli zostanie czas",
    "WONT":   "Won't Have — poza zakresem pracy inżynierskiej",
}

# kolor banneru fazy (ciemnoszary jak w oryginale)
PHASE_BG     = "#3A3A3A"
PHASE_BG_WONT = "#7A0D3D"
GRID         = "#E0E0E0"
GRID_STRONG  = "#9B9B9B"
ROW_BG_A     = "#FAFAFA"
ROW_BG_B     = "#FFFFFF"
HEADER_BG    = "#D6D6D6"
HEADER_BG2   = "#E8E8E8"
TODAY_LINE   = "#C62828"
DEFENSE_LINE = "#1D3E44"
MILESTONE    = "#000000"


# =========================================================
# Konfiguracja siatki
# =========================================================
MONTHS = [
    "Październik 2025",
    "Listopad 2025",
    "Grudzień 2025",
    "Styczeń 2026",
    "Luty 2026",
    "Marzec 2026",
    "Kwiecień 2026",
    "Maj 2026",
    "Czerwiec 2026",
    "Lipiec 2026",
    "Sierpień 2026",
    "Wrzesień 2026",
    "Październik 2026",
    "Listopad 2026",
    "Grudzień 2026",
]
WEEKS_PER_MONTH = 4
N_MONTHS = len(MONTHS)
N_WEEKS  = N_MONTHS * WEEKS_PER_MONTH

CELL_W = 26
CELL_H = 22
ROW_H  = CELL_H

PANEL_W = 360
LEFT_M  = 24
RIGHT_M = 24
TOP_M   = 64
BOT_M   = 110

HEAD_H_MONTH = 26
HEAD_H_WEEK  = 22
HEAD_H = HEAD_H_MONTH + HEAD_H_WEEK


# =========================================================
# Zadania
# format: (typ, nazwa, start, end, kategoria_moscow)
#   start, end  : (month_idx, week_in_month_idx)  -- oba zerowe
#   typ:
#     'PHASE'    -> nagłówek fazy (banner)
#     'TASK'     -> normalne zadanie z paskiem MoSCoW
#     'MILESTONE'-> diament w wskazanej kolumnie
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
    ("TASK",  "Tryb safety-net (PHQ-9 pytanie 9, telefony zaufania)",   (5, 0), (5, 2), "MUST"),
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
    ("TASK",  "Diagramy UML / BPMN do pracy",                            (5, 0), (8, 1), "MUST"),
    ("TASK",  "Wdrożenie demonstracyjne (Railway)",                      (7, 0), (7, 3), "MUST"),
    ("TASK",  "Pisanie rozdziałów pracy inżynierskiej",                 (5, 2), (8, 2), "MUST"),
    ("TASK",  "Rewizja językowa i edycja końcowa",                       (8, 0), (8, 3), "MUST"),
    ("MILESTONE", "Obrona pracy inżynierskiej",                          (8, 3), (8, 3), "MUST"),

    ("PHASE-WONT", "POST-OBRONA — KIERUNKI DALSZEGO ROZWOJU (POZA ZAKRESEM PRACY)", None, None, None),
    ("TASK",  "Analiza sentymentu NLP komentarzy",                      (7, 3), (8, 3), "COULD"),
    ("TASK",  "Buforowanie raportów HR",                                 (8, 0), (8, 2), "COULD"),
    ("TASK",  "Rozszerzony audit log (raporty)",                         (8, 0), (8, 2), "COULD"),
    ("TASK",  "Integracja z SAP / Workday",                              (9, 0), (11, 3), "WONT"),
    ("TASK",  "Certyfikacja systemu według ISO 27001",                   (9, 0), (14, 3), "WONT"),
    ("TASK",  "Mobilna aplikacja natywna (iOS / Android)",               (10, 0), (13, 1), "WONT"),
    ("TASK",  "Integracje SSO (Okta, Azure AD)",                         (9, 2), (12, 1), "WONT"),
    ("TASK",  "Moduł telemedyczny (rezerwacja sesji)",                   (11, 0), (14, 3), "WONT"),
]

# Dzisiejsza data → w którym tygodniu globalnym?
# 11 maja 2026 → Maj 2026 = month idx 7, 11. dzień to ~2. tydzień miesiąca → week 1 (0-indexed)
TODAY_MONTH_IDX = 7
TODAY_WEEK_IN_MONTH = 1   # tj. 8-14 maja
TODAY_GLOBAL_WEEK = TODAY_MONTH_IDX * WEEKS_PER_MONTH + TODAY_WEEK_IN_MONTH

# Koniec semestru (umowny): koniec czerwca = miesiąc 8, tydzień 3
DEFENSE_MONTH_IDX = 8
DEFENSE_WEEK_IN_MONTH = 3
DEFENSE_GLOBAL_WEEK = DEFENSE_MONTH_IDX * WEEKS_PER_MONTH + DEFENSE_WEEK_IN_MONTH


# =========================================================
# Fonty
# =========================================================
def load_font(size, bold=False):
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


# =========================================================
# Rysowanie
# =========================================================
def draw_hatched(draw, box, fill, hatch="#FFFFFF", gap=4, line_w=1):
    """Wypełnia prostokąt + nakłada ukośne kreski (jak hatch="///")."""
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=fill)
    h = y1 - y0
    # ukośne linie od lewego-dolnego do prawego-górnego
    for x in range(int(x0 - h), int(x1), gap):
        draw.line([(x, y1), (x + h, y0)], fill=hatch, width=line_w)


def draw_diamond(draw, cx, cy, size, fill, outline="#000000"):
    pts = [(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)]
    draw.polygon(pts, fill=fill, outline=outline)


def truncate(text, font, max_w):
    """Skróć tekst z ellipsis żeby zmieścił się w max_w pikseli."""
    if font.getlength(text) <= max_w:
        return text
    while text and font.getlength(text + "…") > max_w:
        text = text[:-1]
    return text + "…"


def build():
    # Liczymy wymiary
    grid_w = N_WEEKS * CELL_W
    n_rows = len(TASKS)
    canvas_w = LEFT_M + PANEL_W + grid_w + RIGHT_M
    canvas_h = TOP_M + HEAD_H + n_rows * ROW_H + BOT_M

    img = Image.new("RGB", (canvas_w, canvas_h), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    font_title    = load_font(15, bold=True)
    font_subtitle = load_font(11, bold=False)
    font_month    = load_font(11, bold=True)
    font_week     = load_font(9)
    font_phase    = load_font(11, bold=True)
    font_task     = load_font(10)
    font_legend_t = load_font(11, bold=True)
    font_legend   = load_font(10)
    font_note     = load_font(9)

    # ---------- Tytuł ----------
    draw.text(
        (LEFT_M, 18),
        "Tabela. Harmonogram prac projektowych w ujęciu tygodniowym z klasyfikacją MoSCoW",
        font=font_title, fill="#000000",
    )
    draw.text(
        (LEFT_M, 40),
        "(źródło: opracowanie własne)",
        font=font_subtitle, fill="#444444",
    )

    grid_x0 = LEFT_M + PANEL_W
    grid_y0 = TOP_M
    grid_y1 = grid_y0 + HEAD_H + n_rows * ROW_H

    # ---------- Header miesięczny ----------
    y_m0 = grid_y0
    y_m1 = grid_y0 + HEAD_H_MONTH
    for i, m in enumerate(MONTHS):
        x0 = grid_x0 + i * WEEKS_PER_MONTH * CELL_W
        x1 = x0 + WEEKS_PER_MONTH * CELL_W
        draw.rectangle([x0, y_m0, x1, y_m1], fill=HEADER_BG, outline=GRID_STRONG)
        cx = (x0 + x1) // 2
        cy = (y_m0 + y_m1) // 2
        # skróć etykietę jeśli za długa
        label = m
        if font_month.getlength(label) > (x1 - x0) - 6:
            # np. "Październik 2025" za szerokie → "Paź 2025"
            label = label.replace("Październik", "Paź").replace("Listopad", "Lis") \
                         .replace("Grudzień", "Gru").replace("Styczeń", "Sty") \
                         .replace("Wrzesień", "Wrz").replace("Sierpień", "Sie") \
                         .replace("Kwiecień", "Kwi").replace("Czerwiec", "Cze")
        draw.text((cx, cy), label, font=font_month, anchor="mm", fill="#000")

    # nagłówek lewego panelu
    draw.rectangle([LEFT_M, y_m0, grid_x0, y_m1], fill=HEADER_BG, outline=GRID_STRONG)
    draw.text((LEFT_M + 8, (y_m0 + y_m1) // 2), "Zadanie", font=font_month, anchor="lm", fill="#000")

    # ---------- Header tygodniowy ----------
    y_w0 = y_m1
    y_w1 = y_w0 + HEAD_H_WEEK
    for w in range(N_WEEKS):
        x0 = grid_x0 + w * CELL_W
        x1 = x0 + CELL_W
        # delikatne tło naprzemiennie miesiącami
        bg = HEADER_BG2 if (w // WEEKS_PER_MONTH) % 2 == 0 else "#F4F4F4"
        draw.rectangle([x0, y_w0, x1, y_w1], fill=bg, outline=GRID)
        draw.text(
            ((x0 + x1) // 2, (y_w0 + y_w1) // 2),
            f"T{w % WEEKS_PER_MONTH + 1}",
            font=font_week, anchor="mm", fill="#333"
        )
    # lewa kolumna pod „Zadanie"
    draw.rectangle([LEFT_M, y_w0, grid_x0, y_w1], fill=HEADER_BG2, outline=GRID_STRONG)

    # mocne linie pionowe na granicach miesięcy (nad całym wykresem)
    for i in range(N_MONTHS + 1):
        x = grid_x0 + i * WEEKS_PER_MONTH * CELL_W
        draw.line([(x, y_m0), (x, grid_y1)], fill=GRID_STRONG, width=1)
    # granica lewego panelu
    draw.line([(grid_x0, y_m0), (grid_x0, grid_y1)], fill="#666666", width=2)

    # ---------- Wiersze ----------
    row_y = TOP_M + HEAD_H
    visible_task_idx = 0
    for typ, name, start, end, cat in TASKS:
        y0 = row_y
        y1 = row_y + ROW_H

        if typ.startswith("PHASE"):
            # banner fazy
            bg = PHASE_BG_WONT if typ == "PHASE-WONT" else PHASE_BG
            draw.rectangle([LEFT_M, y0, LEFT_M + PANEL_W + grid_w, y1], fill=bg)
            draw.text((LEFT_M + 10, (y0 + y1) // 2), name,
                      font=font_phase, anchor="lm", fill="#FFFFFF")
        else:
            # tło wiersza naprzemiennie
            bg = ROW_BG_A if visible_task_idx % 2 == 0 else ROW_BG_B
            draw.rectangle([LEFT_M, y0, LEFT_M + PANEL_W + grid_w, y1], fill=bg)
            visible_task_idx += 1

            # nazwa zadania
            display_name = name
            if typ == "MILESTONE":
                # ikona ♦ przed nazwą
                display_name = "◆  " + name
            display_name = truncate(display_name, font_task, PANEL_W - 14)
            txt_color = "#222222" if typ != "MILESTONE" else "#000000"
            draw.text((LEFT_M + 8, (y0 + y1) // 2),
                      display_name, font=font_task, anchor="lm", fill=txt_color)

            # siatka tygodniowa w wierszu
            for w in range(N_WEEKS):
                x = grid_x0 + w * CELL_W
                draw.line([(x, y0), (x, y1)], fill=GRID, width=1)

            # pasek
            if start and end and cat:
                s_w = start[0] * WEEKS_PER_MONTH + start[1]
                e_w = end[0]   * WEEKS_PER_MONTH + end[1]
                bx0 = grid_x0 + s_w * CELL_W + 2
                bx1 = grid_x0 + (e_w + 1) * CELL_W - 2
                by0 = y0 + 4
                by1 = y1 - 4
                color = MOSCOW[cat]
                if typ == "MILESTONE":
                    # tylko diament w jednej komórce
                    cx = grid_x0 + s_w * CELL_W + CELL_W // 2
                    cy = (y0 + y1) // 2
                    draw_diamond(draw, cx, cy, 7, color, outline="#000000")
                elif cat == "WONT":
                    draw_hatched(draw, [bx0, by0, bx1, by1],
                                 fill=color, hatch="#FFFFFF", gap=4, line_w=1)
                else:
                    draw.rectangle([bx0, by0, bx1, by1], fill=color, outline="#1a1a1a")

        # dolna linia wiersza
        draw.line([(LEFT_M, y1), (LEFT_M + PANEL_W + grid_w, y1)],
                  fill=GRID, width=1)
        row_y = y1

    # górna ramka headera
    draw.line([(LEFT_M, y_m0), (LEFT_M + PANEL_W + grid_w, y_m0)],
              fill=GRID_STRONG, width=1)
    # zewnętrzne ramki tabeli
    draw.line([(LEFT_M, grid_y1), (LEFT_M + PANEL_W + grid_w, grid_y1)],
              fill=GRID_STRONG, width=1)
    draw.line([(LEFT_M, y_m0), (LEFT_M, grid_y1)], fill=GRID_STRONG, width=1)
    draw.line([(LEFT_M + PANEL_W + grid_w, y_m0),
               (LEFT_M + PANEL_W + grid_w, grid_y1)], fill=GRID_STRONG, width=1)

    # ---------- Linia DZIŚ ----------
    x_today = grid_x0 + TODAY_GLOBAL_WEEK * CELL_W + CELL_W // 2
    # przerywana linia w kolorze czerwonym
    y = y_m0
    dash = 6
    while y < grid_y1:
        draw.line([(x_today, y), (x_today, min(y + dash, grid_y1))],
                  fill=TODAY_LINE, width=2)
        y += dash * 2
    draw.text((x_today + 6, y_m0 + 4), "dziś (2026-05-11)",
              font=font_note, fill=TODAY_LINE)

    # ---------- Linia OBRONA ----------
    x_def = grid_x0 + DEFENSE_GLOBAL_WEEK * CELL_W + CELL_W
    y = y_m0
    dash = 3
    while y < grid_y1:
        draw.line([(x_def, y), (x_def, min(y + dash, grid_y1))],
                  fill=DEFENSE_LINE, width=1)
        y += dash * 2

    # ---------- LEGENDA ----------
    legend_y = grid_y1 + 18
    draw.text((LEFT_M, legend_y), "Legenda:", font=font_legend_t, fill="#000")
    swatch_y = legend_y + 24
    swatch_h = 16
    x = LEFT_M
    for cat in ["MUST", "SHOULD", "COULD", "WONT"]:
        if cat == "WONT":
            draw_hatched(draw, [x, swatch_y, x + 36, swatch_y + swatch_h],
                         fill=MOSCOW[cat], hatch="#FFFFFF", gap=4, line_w=1)
        else:
            draw.rectangle([x, swatch_y, x + 36, swatch_y + swatch_h],
                           fill=MOSCOW[cat], outline="#1a1a1a")
        text = MOSCOW_LABEL[cat]
        draw.text((x + 44, swatch_y + swatch_h // 2),
                  text, font=font_legend, anchor="lm", fill="#222")
        x += font_legend.getlength(text) + 80

    # druga linia legendy: symbol kamienia milowego + linia dziś + obrona
    x = LEFT_M
    sym_y = swatch_y + swatch_h + 18
    # diament
    draw_diamond(draw, x + 10, sym_y + 8, 7, "#2D4631", "#000")
    draw.text((x + 26, sym_y + 8), "kamień milowy projektu",
              font=font_legend, anchor="lm", fill="#222")
    x += 26 + font_legend.getlength("kamień milowy projektu") + 40

    # linia czerwona przerywana
    seg = x
    for i in range(3):
        draw.line([(seg, sym_y + 8), (seg + 6, sym_y + 8)],
                  fill=TODAY_LINE, width=2)
        seg += 12
    draw.text((seg + 4, sym_y + 8),
              "dziś (czerwona, przerywana)",
              font=font_legend, anchor="lm", fill="#222")
    x = seg + 4 + font_legend.getlength("dziś (czerwona, przerywana)") + 40

    # linia obrony (granat)
    seg = x
    for i in range(6):
        draw.line([(seg, sym_y + 8), (seg + 3, sym_y + 8)],
                  fill=DEFENSE_LINE, width=1)
        seg += 6
    draw.text((seg + 4, sym_y + 8),
              "koniec semestru / obrona (granatowa)",
              font=font_legend, anchor="lm", fill="#222")

    out = Path(__file__).parent / "Gantt-MoSCoW.png"
    img.save(out, "PNG")
    print(f"✓ Zapisano: {out}  ({canvas_w} × {canvas_h} px)")


if __name__ == "__main__":
    build()
