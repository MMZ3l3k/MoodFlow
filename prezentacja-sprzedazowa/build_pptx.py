"""
Generator prezentacji sprzedażowej MoodFlow w formacie PowerPoint.
Wersja v2 — czystszy layout, prawdziwe statystyki, bez cytatów.
"""
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.oxml.ns import qn
from lxml import etree

# ============== Paleta kolorów ==============
NAVY        = RGBColor(0x1D, 0x3E, 0x44)
NAVY_DEEP   = RGBColor(0x16, 0x32, 0x3A)
NAVY_LIGHT  = RGBColor(0x24, 0x4D, 0x55)
GOLD        = RGBColor(0xD4, 0xAD, 0x48)
GOLD_SOFT   = RGBColor(0xE7, 0xC4, 0x6A)
CREAM       = RGBColor(0xF4, 0xE6, 0xC2)
TEAL        = RGBColor(0x2D, 0x8C, 0x7A)
OLIVE       = RGBColor(0x5A, 0x5E, 0x2C)
GREEN_DARK  = RGBColor(0x2D, 0x46, 0x31)
MUSTARD     = RGBColor(0x8D, 0x7D, 0x1E)
CRIMSON     = RGBColor(0xB8, 0x12, 0x5A)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
DIM         = RGBColor(0xB8, 0xA9, 0x82)

FONT = "Garamond"

SLIDE_W_INCH = 13.333
SLIDE_H_INCH = 7.5
MARGIN       = 0.7
SLIDE_W = Inches(SLIDE_W_INCH)
SLIDE_H = Inches(SLIDE_H_INCH)
CONTENT_W = SLIDE_W_INCH - 2 * MARGIN

ROOT = Path(__file__).parent
SCREENS = ROOT / "screens"
OUTPUT = ROOT / "MoodFlow-Prezentacja-Sprzedazowa.pptx"


# ===================== HELPERY =====================
def set_bg(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color


def add_rect(slide, x, y, w, h, fill, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line:
        shp.line.color.rgb = line; shp.line.width = Pt(1.0)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def add_round(slide, x, y, w, h, fill, line=None, line_w=Pt(1.2), radius=0.06):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shp.adjustments[0] = radius
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line:
        shp.line.color.rgb = line; shp.line.width = line_w
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def add_text(slide, x, y, w, h, text, *,
             size=18, bold=False, italic=False, color=CREAM,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font=FONT,
             auto_size=False, line_spacing=None):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.02)
    tf.vertical_anchor = anchor
    if auto_size:
        tf.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE

    lines = text.split("\n") if isinstance(text, str) else list(text)
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line_spacing:
            p.line_spacing = line_spacing
        run = p.add_run()
        run.text = line
        run.font.name = font
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = color
    return tb


def add_bullets(slide, x, y, w, h, items, *, size=16, color=CREAM,
                line_spacing=1.3, bullet_color=GOLD, bullet_char="●",
                bold=False):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.02)
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = line_spacing
        # bullet
        r1 = p.add_run(); r1.text = f"{bullet_char}  "
        r1.font.name = FONT; r1.font.size = Pt(size)
        r1.font.color.rgb = bullet_color
        r1.font.bold = True
        # treść
        r2 = p.add_run(); r2.text = item
        r2.font.name = FONT; r2.font.size = Pt(size)
        r2.font.color.rgb = color
        r2.font.bold = bold
    return tb


def add_tag(slide, x, y, text, *, size=11, fg=GOLD, border=GOLD, w=None):
    """Mała pigułka z tekstem."""
    h = Inches(0.42)
    if w is None:
        # Bold Garamond ≈ 0.13" / znak przy 11pt — z marginesem 0.4"
        char_w = 0.13 * (size / 11.0)
        w = Inches(0.6 + char_w * max(8, len(text)))
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shp.adjustments[0] = 0.5
    shp.fill.background()
    shp.line.color.rgb = border; shp.line.width = Pt(1.2)
    tf = shp.text_frame
    tf.margin_left = tf.margin_right = Inches(0.18)
    tf.margin_top = tf.margin_bottom = Inches(0.04)
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.name = FONT; r.font.size = Pt(size); r.font.bold = True
    r.font.color.rgb = fg
    return shp


def add_picture_fit(slide, image_path, box_x, box_y, box_w, box_h):
    """Wpasowuje obraz w prostokąt zachowując proporcje i centrując go."""
    from PIL import Image as _PIL
    with _PIL.open(str(image_path)) as im:
        iw, ih = im.size
    ratio = iw / ih
    box_ratio = box_w.inches / box_h.inches
    if ratio > box_ratio:
        # obraz szerszy — dopasuj do szerokości
        w = box_w
        h = Inches(box_w.inches / ratio)
    else:
        h = box_h
        w = Inches(box_h.inches * ratio)
    # wycentruj
    x = box_x + (box_w - w) / 2
    y = box_y + (box_h - h) / 2
    return slide.shapes.add_picture(str(image_path), x, y, width=w, height=h)


def add_brand_mark(slide, x, y, size=Inches(0.6), color=GOLD):
    """Prosty znak marki: koło z 3 koncentrycznymi pierścieniami (jak logo z oryginału)."""
    g = slide.shapes.add_group_shape if False else None
    cx = x + size/2; cy = y + size/2
    # zewnętrzny okrąg
    o1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, size, size)
    o1.fill.background(); o1.line.color.rgb = color; o1.line.width = Pt(2.5)
    # wewnętrzny
    pad2 = size * 0.25
    o2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, x+pad2, y+pad2, size-2*pad2, size-2*pad2)
    o2.fill.background(); o2.line.color.rgb = color; o2.line.width = Pt(1.8)
    # kropka centralna
    pad3 = size * 0.42
    o3 = slide.shapes.add_shape(MSO_SHAPE.OVAL, x+pad3, y+pad3, size-2*pad3, size-2*pad3)
    o3.fill.solid(); o3.fill.fore_color.rgb = color; o3.line.fill.background()


def add_footer(slide, page_num, total=21):
    add_text(slide, Inches(MARGIN), Inches(7.0), Inches(2), Inches(0.4),
             f"{page_num:02d} / {total:02d}", size=10, color=GOLD_SOFT, align=PP_ALIGN.LEFT)
    add_text(slide, Inches(SLIDE_W_INCH - MARGIN - 2), Inches(7.0), Inches(2), Inches(0.4),
             "MOODFLOW", size=10, bold=True, color=GOLD, align=PP_ALIGN.RIGHT)


def standard_title(slide, text, size=42, y=0.55, h=1.05):
    return add_text(slide, Inches(MARGIN), Inches(y), Inches(CONTENT_W), Inches(h),
                    text, size=size, bold=True, color=GOLD)


def standard_lead(slide, text, size=18, y=1.65, h=0.7):
    return add_text(slide, Inches(MARGIN), Inches(y), Inches(CONTENT_W), Inches(h),
                    text, size=size, italic=True, color=CREAM)


# ===================== ANIMACJE =====================
NS = ('xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"')


def add_entrance_animations(slide, shapes_in_order, *, effect="fade",
                            per_shape_delay_ms=300, start_delay_ms=200):
    presets = {"fade": ("10", "1"), "fly": ("2", "1"), "zoom": ("23", "1"), "appear": ("1", "1")}
    pid, _ = presets.get(effect, presets["fade"])

    children_xml, next_id = [], 3
    template = """
    <p:par>
      <p:cTn id="{a}" fill="hold">
        <p:stCondLst><p:cond delay="{delay}"/></p:stCondLst>
        <p:childTnLst>
          <p:par>
            <p:cTn id="{b}" fill="hold">
              <p:stCondLst><p:cond delay="0"/></p:stCondLst>
              <p:childTnLst>
                <p:par>
                  <p:cTn id="{c}" presetID="{pid}" presetClass="entr" presetSubtype="0"
                         fill="hold" grpId="0" nodeType="{node}">
                    <p:stCondLst><p:cond delay="0"/></p:stCondLst>
                    <p:childTnLst>
                      <p:set>
                        <p:cBhvr>
                          <p:cTn id="{d}" dur="1" fill="hold">
                            <p:stCondLst><p:cond delay="0"/></p:stCondLst>
                          </p:cTn>
                          <p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>
                          <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
                        </p:cBhvr>
                        <p:to><p:strVal val="visible"/></p:to>
                      </p:set>
                      <p:anim calcmode="lin" valueType="num">
                        <p:cBhvr additive="base">
                          <p:cTn id="{e}" dur="500" fill="hold"/>
                          <p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>
                          <p:attrNameLst><p:attrName>style.opacity</p:attrName></p:attrNameLst>
                        </p:cBhvr>
                        <p:tavLst>
                          <p:tav tm="0"><p:val><p:fltVal val="0"/></p:val></p:tav>
                          <p:tav tm="100000"><p:val><p:fltVal val="1"/></p:val></p:tav>
                        </p:tavLst>
                      </p:anim>
                    </p:childTnLst>
                  </p:cTn>
                </p:par>
              </p:childTnLst>
            </p:cTn>
          </p:par>
        </p:childTnLst>
      </p:cTn>
    </p:par>
    """
    for idx, shp in enumerate(shapes_in_order):
        delay = str(start_delay_ms) if idx == 0 else str(per_shape_delay_ms)
        node = "clickEffect" if idx == 0 else "withEffect"
        children_xml.append(template.format(
            a=next_id, b=next_id+1, c=next_id+2, d=next_id+3, e=next_id+4,
            delay=delay, pid=pid, node=node, spid=shp.shape_id,
        ))
        next_id += 5

    timing_xml = f"""
    <p:timing {NS}>
      <p:tnLst>
        <p:par>
          <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
            <p:childTnLst>
              <p:seq concurrent="1" nextAc="seek">
                <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
                  <p:childTnLst>{''.join(children_xml)}</p:childTnLst>
                </p:cTn>
                <p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>
                <p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>
              </p:seq>
            </p:childTnLst>
          </p:cTn>
        </p:par>
      </p:tnLst>
    </p:timing>
    """
    sld = slide._element
    existing = sld.find(qn("p:timing"))
    if existing is not None: sld.remove(existing)
    sld.append(etree.fromstring(timing_xml))


def add_transition(slide, kind="fade"):
    sld = slide._element
    for t in sld.findall(qn("p:transition")): sld.remove(t)
    body_map = {"fade": '<p:fade thruBlk="0"/>',
                "push": '<p:push dir="l"/>',
                "wipe": '<p:wipe dir="l"/>'}
    body = body_map.get(kind, body_map["fade"])
    sld.append(etree.fromstring(f'<p:transition {NS} spd="med">{body}</p:transition>'))


# ===================== BUDOWANIE PREZENTACJI =====================
prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
BLANK = prs.slide_layouts[6]


def new_slide(bg=NAVY):
    s = prs.slides.add_slide(BLANK)
    set_bg(s, bg)
    return s


TOTAL_PAGES = 21


# ---------- helper: kafelek statystyki ----------
def stat_card(slide, x, y, w, h, big, label, source=None, *,
              big_size=46, label_size=13, source_size=10,
              big_color=GOLD, label_color=CREAM, source_color=DIM,
              border=GOLD, fill=NAVY_LIGHT):
    box = add_round(slide, x, y, w, h, fill, line=border, line_w=Pt(1.0))
    add_text(slide, x + Inches(0.15), y + Inches(0.2), w - Inches(0.3), Inches(1.0),
             big, size=big_size, bold=True, color=big_color, align=PP_ALIGN.CENTER, auto_size=True)
    add_text(slide, x + Inches(0.2), y + Inches(1.25), w - Inches(0.4), Inches(h.inches - 1.6),
             label, size=label_size, color=label_color, align=PP_ALIGN.CENTER)
    if source:
        add_text(slide, x + Inches(0.2), y + h - Inches(0.4), w - Inches(0.4), Inches(0.3),
                 source, size=source_size, italic=True, color=source_color, align=PP_ALIGN.CENTER)
    return box


# ============== SLIDE 1 — COVER ==============
s = new_slide(NAVY)
# prawa kolumna cream
add_rect(s, Inches(8.2), Inches(0), Inches(SLIDE_W_INCH - 8.2), Inches(SLIDE_H_INCH), CREAM)
# dolne paski
add_rect(s, Inches(0), Inches(7.2), Inches(SLIDE_W_INCH/2), Inches(0.3), TEAL)
add_rect(s, Inches(SLIDE_W_INCH/2), Inches(7.2), Inches(SLIDE_W_INCH/2), Inches(0.3), GOLD)

tag = add_tag(s, Inches(MARGIN), Inches(0.7), "PLATFORMA WELLBEINGU PSYCHICZNEGO", size=11)
title = add_text(s, Inches(MARGIN), Inches(1.5), Inches(7.4), Inches(1.7),
                 "MoodFlow", size=92, bold=True, color=GOLD, auto_size=True)
sub = add_text(s, Inches(MARGIN), Inches(3.6), Inches(7.4), Inches(2.0),
               "Mierzymy, rozumiemy i poprawiamy kondycję psychiczną zespołów —\n"
               "regularnie, bezpiecznie i całkowicie anonimowo dla pracownika.",
               size=20, color=WHITE, line_spacing=1.4)

add_brand_mark(s, Inches(MARGIN), Inches(6.05), size=Inches(0.55))
sig = add_text(s, Inches(MARGIN + 0.75), Inches(5.95), Inches(7), Inches(0.45),
               "Mateusz Matczuk  ·  Maksymilian Kwasek", size=15, bold=True, color=GOLD)
sig2 = add_text(s, Inches(MARGIN + 0.75), Inches(6.35), Inches(7), Inches(0.4),
                "Prezentacja produktu · 2026", size=11, color=CREAM, italic=True)

# prawa kolumna — duża liczba (real)
add_text(s, Inches(8.45), Inches(2.1), Inches(4.6), Inches(1.5),
         "1 z 3", size=110, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
add_text(s, Inches(8.45), Inches(3.55), Inches(4.6), Inches(1.7),
         "pracowników na świecie\nraportuje wypalenie zawodowe",
         size=18, color=NAVY, align=PP_ALIGN.CENTER, line_spacing=1.3)
add_text(s, Inches(8.45), Inches(5.5), Inches(4.6), Inches(0.5),
         "McKinsey Health Institute, 2022",
         size=11, italic=True, color=OLIVE, align=PP_ALIGN.CENTER)

add_entrance_animations(s, [tag, title, sub, sig], per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== SLIDE 2 — PROBLEM ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Problem, którego nie da się dłużej ignorować", size=40)
lead = standard_lead(s,
    "Kondycja psychiczna pracowników to dziś jeden z największych\n"
    "ukrytych kosztów organizacji. Liczby — niezależnie od źródła — są jednoznaczne.",
    size=17, h=1.1)

# 4 karty statystyk
y = Inches(3.2); h = Inches(2.7)
gap = 0.18; n = 4
total_gap_w = gap * (n - 1)
w_in = (CONTENT_W - total_gap_w) / n
w = Inches(w_in)
x_left = Inches(MARGIN)

stats = [
    ("44%",         "pracowników na świecie odczuwa stres dzień w dzień",        "Gallup, State of the Global Workplace 2024"),
    ("77%",         "doświadczyło wypalenia zawodowego w obecnej pracy",         "Deloitte Workplace Burnout Survey"),
    ("$1 bln",      "rocznych globalnych strat produktywności wskutek\ndepresji i lęku w pracy",                          "WHO, 2017"),
    ("od 2019",     "wypalenie zawodowe sklasyfikowane oficjalnie\nw ICD-11 jako syndrom",                                "WHO, ICD-11"),
]
animated = [t, lead]
for i, (big, lab, src) in enumerate(stats):
    x = Inches(MARGIN + i*(w_in + gap))
    bs = 56 if i < 2 else 40
    card = stat_card(s, x, y, w, h, big, lab, src, big_size=bs)
    animated.append(card)

add_text(s, Inches(MARGIN), Inches(6.1), Inches(CONTENT_W), Inches(0.6),
         "Nieobecność procesu pomiaru = nieobecność dowodu, że problem istnieje. Dopóki HR go nie widzi, finanse go nie finansują.",
         size=14, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)

add_footer(s, 2)
add_entrance_animations(s, animated, per_shape_delay_ms=250)
add_transition(s, "fade")


# ============== SLIDE 3 — KOSZT BIZNESOWY ==============
s = new_slide(NAVY)
t = standard_title(s, "Co kosztuje brak działania?", size=42)
lead = standard_lead(s, "Trzy obszary, w których kondycja psychiczna zespołu uderza w P&L.", size=18)

y = Inches(2.7); h = Inches(3.6)
gap = 0.3; n = 3
w_in = (CONTENT_W - gap*(n-1)) / n
w = Inches(w_in)

cards = [
    ("ROTACJA",      "50–200%",   "rocznego wynagrodzenia kosztuje zastąpienie pracownika.",                  "SHRM Cost of Turnover"),
    ("ABSENCJA",     "wzrost",    "zwolnień psychiatrycznych w ZUS w ostatnich latach — według danych ZUS i opracowań GUS.", "ZUS / GUS, dane bieżące"),
    ("PRODUKTYWNOŚĆ","≥ 3×",      "niższe zaangażowanie u pracowników z objawami wypalenia w porównaniu do reszty zespołu.", "Gallup Q12 / WBI"),
]
animated = [t, lead]
for i, (kat, big, body, src) in enumerate(cards):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y, w, h, NAVY_LIGHT, line=GOLD, line_w=Pt(1.0))
    # nagłówek kategorii
    add_text(s, x + Inches(0.2), y + Inches(0.3), w - Inches(0.4), Inches(0.5),
             kat, size=14, bold=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.2), y + Inches(0.85), w - Inches(0.4), Inches(1.1),
             big, size=58, bold=True, color=GOLD, align=PP_ALIGN.CENTER, auto_size=True)
    add_text(s, x + Inches(0.3), y + Inches(2.05), w - Inches(0.6), Inches(1.0),
             body, size=14, color=CREAM, align=PP_ALIGN.CENTER, line_spacing=1.3)
    add_text(s, x + Inches(0.3), y + h - Inches(0.55), w - Inches(0.6), Inches(0.4),
             src, size=10, italic=True, color=DIM, align=PP_ALIGN.CENTER)
    animated.append(box)

add_text(s, Inches(MARGIN), Inches(6.55), Inches(CONTENT_W), Inches(0.4),
         "Każdy 1% obniżonej rotacji w 100-osobowej firmie to oszczędność rzędu średniej rocznej pensji.",
         size=13, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)

add_footer(s, 3)
add_entrance_animations(s, animated, per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== SLIDE 4 — ROZWIĄZANIE ==============
s = new_slide(NAVY)
# lewa kolumna cream — brand
add_rect(s, Inches(0), Inches(0), Inches(5.3), Inches(SLIDE_H_INCH), CREAM)
brand = add_text(s, Inches(0.15), Inches(2.7), Inches(5.0), Inches(1.3),
                 "MoodFlow", size=60, bold=True, color=NAVY, align=PP_ALIGN.CENTER, auto_size=True)
brand_sub = add_text(s, Inches(0.3), Inches(4.3), Inches(4.8), Inches(1.6),
                     "Zdrowy zespół.\nMierzalny postęp.\nPełna anonimowość.",
                     size=18, color=OLIVE, align=PP_ALIGN.CENTER, line_spacing=1.4)

t = add_text(s, Inches(5.7), Inches(0.7), Inches(7.2), Inches(1.0),
             "Co dostajesz", size=42, bold=True, color=GOLD)
b = add_bullets(s, Inches(5.7), Inches(2.0), Inches(7.2), Inches(5.0), [
    "Webowa aplikacja multi-tenant — każda firma w izolowanej przestrzeni danych",
    "5 zwalidowanych testów psychologicznych: PHQ-9, GAD-7, PSS-10, WHO-5, Mood Meter",
    "Panel HR z anonimowymi raportami: trendy, alerty, eksport PDF i CSV",
    "Automatyczne wykrywanie sygnałów ryzyka w odpowiedziach pracowników",
    "Pełna zgodność z RODO i k-anonymity (k ≥ 5) we wszystkich raportach HR",
    "PWA — działa na każdym telefonie bez instalacji ze sklepu",
], size=16, line_spacing=1.45)

add_footer(s, 4)
add_entrance_animations(s, [brand, brand_sub, t, b], per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 5 — JAK TO DZIAŁA ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Jak to działa", size=44)
lead = standard_lead(s, "Trzy proste kroki. Wdrożenie w kilka dni — nie miesięcy.", size=18)

y = Inches(2.7); h = Inches(3.7)
n = 3; gap = 0.25
w_in = (CONTENT_W - gap*(n-1)) / n
w = Inches(w_in)

steps = [
    ("1", "Firma rejestruje konto",
     "Administrator firmy otrzymuje unikalny kod (MOOD-XXXXXXXX) i zaprasza pracowników. "
     "Konto firmy podlega akceptacji administratora platformy."),
    ("2", "Pracownik wypełnia testy",
     "PHQ-9, GAD-7, PSS-10, WHO-5 i codzienny Mood Check — każdy zajmuje 1–3 minuty. "
     "Aplikacja PWA, działa na telefonie i komputerze."),
    ("3", "HR widzi anonimowe trendy",
     "Wykresy, alerty i porównania międzydziałowe — bez identyfikacji konkretnych osób. "
     "K-anonymity wymuszone w API."),
]
animated = [t, lead]
for i, (num, title, body) in enumerate(steps):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y, w, h, NAVY, line=GOLD, line_w=Pt(1.4))
    add_text(s, x, y + Inches(0.25), w, Inches(1.5),
             num, size=100, bold=True, color=GOLD, align=PP_ALIGN.CENTER, auto_size=True)
    add_text(s, x + Inches(0.2), y + Inches(1.85), w - Inches(0.4), Inches(0.7),
             title, size=20, bold=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.3), y + Inches(2.55), w - Inches(0.6), Inches(1.1),
             body, size=13, color=CREAM, align=PP_ALIGN.CENTER, line_spacing=1.35)
    animated.append(box)

add_footer(s, 5)
add_entrance_animations(s, animated, per_shape_delay_ms=350)
add_transition(s, "fade")


# ============== SLIDE 6 — ONBOARDING FIRMY ==============
s = new_slide(NAVY)
t = add_text(s, Inches(MARGIN), Inches(0.55), Inches(7.5), Inches(1.0),
             "Onboarding firmy", size=40, bold=True, color=GOLD)
lead = add_text(s, Inches(MARGIN), Inches(1.65), Inches(7.5), Inches(0.7),
                "Konto firmowe powstaje w 60 sekund.", size=18, italic=True, color=CREAM)
b = add_bullets(s, Inches(MARGIN), Inches(2.5), Inches(7.2), Inches(3.5), [
    "Rejestracja przez NIP — automatyczna weryfikacja danych firmy",
    "Konto podlega akceptacji administratora platformy",
    "Po akceptacji administrator firmowy otrzymuje kod organizacji",
    "Kod służy do bezpiecznego dołączania pracowników",
], size=16, line_spacing=1.45)
hl = add_text(s, Inches(MARGIN), Inches(5.85), Inches(7.5), Inches(1.0),
              "→ Zero plików Excel. Zero ręcznego importu kont.",
              size=20, bold=True, color=GOLD)
img = SCREENS / "02-rejestracja-firmy.png"
pic = add_picture_fit(s, img, Inches(8.4), Inches(0.55), Inches(4.6), Inches(6.4))

add_footer(s, 6)
add_entrance_animations(s, [t, lead, b, hl, pic], per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 7 — DOŁĄCZA PRACOWNIK ==============
s = new_slide(NAVY)
img = SCREENS / "03-dolacz-do-firmy.png"
pic = add_picture_fit(s, img, Inches(0.55), Inches(0.55), Inches(5.55), Inches(6.4))

t = add_text(s, Inches(6.4), Inches(0.55), Inches(6.5), Inches(1.2),
             "Pracownik dołącza w 30 sekund", size=36, bold=True, color=GOLD)
b = add_bullets(s, Inches(6.4), Inches(2.0), Inches(6.5), Inches(4.0), [
    "Kod firmowy w formacie MOOD-XXXXXXXX",
    "Walidacja siły hasła już po stronie klienta",
    "Brak udostępniania danych osobowych poza domeną firmy",
    "PWA — działa na telefonie bez instalacji ze sklepu",
], size=16, line_spacing=1.45)
hl = add_text(s, Inches(6.4), Inches(5.7), Inches(6.5), Inches(1.0),
              "Twoje dane są bezpieczne i szyfrowane.",
              size=18, italic=True, color=GOLD)

add_footer(s, 7)
add_entrance_animations(s, [pic, t, b, hl], per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 8 — WYNIK TESTU (umiarkowany) ==============
s = new_slide(NAVY_DEEP)
t = add_text(s, Inches(MARGIN), Inches(0.55), Inches(7.0), Inches(1.0),
             "Pracownik widzi swoje wyniki", size=36, bold=True, color=GOLD)
lead = add_text(s, Inches(MARGIN), Inches(1.7), Inches(7.0), Inches(2.0),
                "Każdy test kończy się czytelną interpretacją.\n"
                "Wynik nie jest diagnozą — to sygnał do refleksji "
                "i ewentualnej rozmowy ze specjalistą.",
                size=16, color=CREAM, line_spacing=1.45)
b = add_bullets(s, Inches(MARGIN), Inches(4.0), Inches(7.0), Inches(2.8), [
    "Skala wyniku przeliczana wyłącznie po stronie backendu",
    "Klasyfikacja: minimalny / łagodny / umiarkowany / ciężki",
    "Historia wszystkich poprzednich wyników w jednym miejscu",
], size=15, line_spacing=1.4)
img = SCREENS / "04-wynik-phq9-umiarkowany.png"
pic = add_picture_fit(s, img, Inches(8.0), Inches(0.55), Inches(4.85), Inches(6.4))

add_footer(s, 8)
add_entrance_animations(s, [t, lead, b, pic], per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== SLIDE 9 — TRYB SAFETY-NET ==============
s = new_slide(NAVY)
t = add_text(s, Inches(MARGIN), Inches(0.55), Inches(8.0), Inches(1.4),
             "Tryb wsparcia: gdy pracownik nie daje rady",
             size=32, bold=True, color=GOLD)
lead = add_text(s, Inches(MARGIN), Inches(2.0), Inches(8.0), Inches(1.2),
                "Gdy odpowiedzi sugerują myśli samobójcze (PHQ-9, pyt. 9 > 0)\n"
                "lub wynik w przedziale ciężkim — system automatycznie:",
                size=15, color=CREAM, line_spacing=1.4)
b = add_bullets(s, Inches(MARGIN), Inches(3.4), Inches(8.0), Inches(3.0), [
    "wyświetla rozbudowany komunikat zamiast suchego scoringu,",
    "pokazuje numery telefonów zaufania (116 123, 800 70 22 22, 116 111),",
    "zachęca do kontaktu ze specjalistą — bez stygmatyzacji,",
    "nigdy nie raportuje pojedynczego przypadku do HR (anonimowość).",
], size=14, line_spacing=1.4)
hl = add_text(s, Inches(MARGIN), Inches(6.2), Inches(8.0), Inches(1.0),
              "To nie funkcja marketingowa. To kwestia odpowiedzialności.",
              size=17, italic=True, color=GOLD)

img = SCREENS / "05-wynik-phq9-ciezki.png"
pic = add_picture_fit(s, img, Inches(8.9), Inches(0.4), Inches(4.0), Inches(6.7))

add_footer(s, 9)
add_entrance_animations(s, [t, lead, b, hl, pic], per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== SLIDE 10 — TESTY PSYCHOLOGICZNE ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Walidowane narzędzia psychologiczne", size=38)
lead = standard_lead(s,
    "Testy z domeny publicznej — używane w psychiatrii klinicznej i medycynie pracy.", size=17)

tests = [
    ("PHQ-9 — Patient Health Questionnaire",   "9 pytań · ocena nasilenia objawów depresyjnych · standard kliniczny"),
    ("GAD-7 — Generalized Anxiety Disorder",   "7 pytań · pomiar lęku uogólnionego · czułość 89%, swoistość 82%"),
    ("PSS-10 — Perceived Stress Scale",        "10 pytań · subiektywne odczuwanie stresu w ostatnim miesiącu"),
    ("WHO-5 Well-Being Index",                 "5 pozycji · ogólny dobrostan · rekomendacja Światowej Organizacji Zdrowia"),
    ("Mood Meter / SAM",                        "Codzienny pomiar nastroju (emoji + ocena) · zasila wykres trendu w panelu HR"),
]
animated = [t, lead]
y0 = Inches(2.45); rh = Inches(0.78)
for i, (title, body) in enumerate(tests):
    y = y0 + i*(rh + Inches(0.08))
    box = add_round(s, Inches(MARGIN), y, Inches(CONTENT_W), rh, NAVY, line=GOLD, line_w=Pt(0.7))
    add_text(s, Inches(MARGIN + 0.25), y + Inches(0.07), Inches(7.0), Inches(0.4),
             title, size=17, bold=True, color=GOLD)
    add_text(s, Inches(MARGIN + 0.25), y + Inches(0.42), Inches(CONTENT_W - 0.5), Inches(0.35),
             body, size=12, color=CREAM)
    animated.append(box)
add_footer(s, 10)
add_entrance_animations(s, animated, per_shape_delay_ms=180)
add_transition(s, "fade")


# ============== SLIDE 11 — PANEL HR ==============
s = new_slide(NAVY)
t = standard_title(s, "Panel HR — dane, których nie ma w arkuszu Excel", size=34)
features = [
    ("Wskaźnik dobrostanu zespołu",   "Agregat WHO-5 z całej organizacji"),
    ("Trendy w czasie",                "Stres, lęk, depresja w ujęciu tygodniowym i miesięcznym"),
    ("Filtrowanie po działach",       "Tylko grupy ≥ 5 osób (k-anonymity); małe zespoły są ukrywane"),
    ("Alerty automatyczne",            "Powiadomienie, gdy średnia w dziale przekroczy próg ostrzegawczy"),
    ("Statystyki uczestnictwa",       "Ile osób wypełnia testy regularnie — bez wskazania kto"),
    ("Eksport PDF / CSV",              "Raport miesięczny dla zarządu jednym kliknięciem"),
]
y0 = Inches(2.0); cw = Inches(5.95); ch = Inches(1.5); gx = Inches(0.3); gy = Inches(0.25)
animated = [t]
for i, (title, body) in enumerate(features):
    col = i % 2; row = i // 2
    x = Inches(MARGIN) + col*(cw + gx)
    y = y0 + row*(ch + gy)
    add_rect(s, x, y, Inches(0.06), ch, GOLD)
    title_tb = add_text(s, x + Inches(0.2), y + Inches(0.05), cw - Inches(0.2), Inches(0.55),
             title, size=18, bold=True, color=GOLD)
    add_text(s, x + Inches(0.2), y + Inches(0.6), cw - Inches(0.2), ch - Inches(0.7),
             body, size=14, color=CREAM)
    animated.append(title_tb)
add_footer(s, 11)
add_entrance_animations(s, animated, per_shape_delay_ms=180)
add_transition(s, "fade")


# ============== SLIDE 12 — k-ANONYMITY ==============
s = new_slide(NAVY_DEEP)
# lewa
t = add_text(s, Inches(MARGIN), Inches(0.55), Inches(7.6), Inches(1.5),
             "Anonimowość, której nie da się obejść",
             size=34, bold=True, color=GOLD)
lead = add_text(s, Inches(MARGIN), Inches(2.05), Inches(7.6), Inches(1.4),
                "K-anonymity wbudowane w warstwę API. Nie da się wymusić "
                "pokazania danych pojedynczej osoby — nawet z konta administratora.",
                size=16, color=CREAM, line_spacing=1.45)
b = add_bullets(s, Inches(MARGIN), Inches(3.6), Inches(7.6), Inches(3.5), [
    "Próg minimum 5 odpowiedzi do prezentacji wyniku w panelu HR",
    "Komunikat zwracany zamiast danych, gdy próg nie jest spełniony",
    "Brak imion, nazwisk i e-maili w jakimkolwiek widoku HR",
    "Logika anonimizacji w backendzie — frontend nie dostaje surowych danych",
    "Audytowane logi dostępu (kto, kiedy, do jakiego raportu)",
], size=14, line_spacing=1.4)

# prawa cream
add_rect(s, Inches(8.6), Inches(0.4), Inches(4.4), Inches(6.7), CREAM)
big = add_text(s, Inches(8.6), Inches(1.7), Inches(4.4), Inches(2.6),
               "k ≥ 5", size=130, bold=True, color=NAVY, align=PP_ALIGN.CENTER, auto_size=True)
sub = add_text(s, Inches(8.85), Inches(4.7), Inches(3.9), Inches(2.0),
               "każdy widoczny w raporcie wynik dotyczy co najmniej 5 osób — pojedynczy pracownik nigdy nie zostanie zidentyfikowany",
               size=13, color=OLIVE, align=PP_ALIGN.CENTER, line_spacing=1.35)
add_footer(s, 12)
add_entrance_animations(s, [t, lead, b, big, sub], effect="zoom", per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== SLIDE 13 — GRUPA DOCELOWA ==============
s = new_slide(NAVY)
t = standard_title(s, "Dla kogo zbudowaliśmy MoodFlow", size=42)
groups = [
    ("Średnie i duże firmy",    "50–2000 pracowników\nstruktura działowa\npresja retencji"),
    ("Działy HR i People Ops",  "wellbeing, kultura,\nzaangażowanie\nprogramy retencyjne"),
    ("Menedżerowie liniowi",    "wczesne wykrywanie\nprzeciążeń w zespołach\nbez zaglądania w prywatność"),
]
y = Inches(2.4); n = 3; gap = 0.25
w_in = (CONTENT_W - gap*(n-1))/n
w = Inches(w_in); h = Inches(3.0)
animated = [t]
for i, (title, body) in enumerate(groups):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y, w, h, NAVY_DEEP, line=GOLD, line_w=Pt(1.4))
    add_text(s, x, y + Inches(0.4), w, Inches(0.8),
             title, size=22, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.3), y + Inches(1.45), w - Inches(0.6), Inches(1.5),
             body, size=15, color=CREAM, align=PP_ALIGN.CENTER, line_spacing=1.5)
    animated.append(box)

add_text(s, Inches(MARGIN), Inches(5.95), Inches(CONTENT_W), Inches(0.8),
         "Pracownik dostaje narzędzie, które naprawdę go słucha — bez raportowania imiennego do szefa.",
         size=18, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
add_footer(s, 13)
add_entrance_animations(s, animated, per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 14 — WYRÓŻNIKI ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Czym MoodFlow różni się od ankiet pulse", size=34)
diffs = [
    ("Walidowane skale, nie ankiety satysfakcji",
     "PHQ-9, GAD-7 i WHO-5 są używane przez psychologów klinicznych — wyniki są porównywalne i mają wartość naukową."),
    ("Anonimowość gwarantowana technicznie",
     "K-anonymity wymuszone w backendzie. Konkurencja często polega tylko na polityce prywatności."),
    ("Multi-tenant od dnia pierwszego",
     "Twoja firma ma własną przestrzeń danych — żadnego wspólnego zbioru z innymi klientami."),
    ("Tryb safety-net dla osób w kryzysie",
     "Aplikacja sama rozpoznaje sygnały ryzyka i podaje numery telefonów zaufania — bez angażowania HR."),
    ("PWA — działa na każdym telefonie",
     "Bez App Store, bez Google Play, bez instalacji. Pracownik klika link i ma pełną aplikację."),
    ("Open scoring, nie black-box",
     "Cała logika scoringu jest udokumentowana i powtarzalna — bez ukrytej magii AI."),
]
y0 = Inches(1.85); cw = Inches(5.95); ch = Inches(1.55); gx = Inches(0.3); gy = Inches(0.18)
animated = [t]
for i, (title, body) in enumerate(diffs):
    col = i % 2; row = i // 2
    x = Inches(MARGIN) + col*(cw + gx); y = y0 + row*(ch + gy)
    add_rect(s, x, y, Inches(0.06), ch, GOLD_SOFT)
    title_tb = add_text(s, x + Inches(0.2), y + Inches(0.05), cw - Inches(0.2), Inches(0.5),
             title, size=15, bold=True, color=GOLD)
    add_text(s, x + Inches(0.2), y + Inches(0.55), cw - Inches(0.25), ch - Inches(0.65),
             body, size=12, color=CREAM, line_spacing=1.35)
    animated.append(title_tb)
add_footer(s, 14)
add_entrance_animations(s, animated, per_shape_delay_ms=180)
add_transition(s, "fade")


# ============== SLIDE 15 — BEZPIECZEŃSTWO + RODO ==============
s = new_slide(GREEN_DARK)
t = standard_title(s, "Bezpieczeństwo i zgodność z RODO", size=38)
lead = standard_lead(s,
    "Dane o zdrowiu psychicznym należą do kategorii szczególnej w sensie RODO. Tak je traktujemy.",
    size=16)
sec = [
    ("Multi-tenant izolacja na poziomie ORM",   "Każde zapytanie filtrowane po tenant_id — brak ryzyka wycieku między firmami."),
    ("JWT + refresh tokens + role",              "3 role: pracownik, HR, admin. Strażnicy ról walidowani na backendzie."),
    ("bcrypt + walidacja siły hasła",            "Hasła nigdy nie trafiają do logów ani do bazy w postaci jawnej."),
    ("HTTPS, CORS, helmet, throttler",           "Rate limiting chroni endpoint logowania przed atakami brute-force."),
    ("Minimalizacja danych",                     "Zbieramy tylko to, co potrzebne do scoringu. Nic więcej."),
    ("Audit log i prawo do usunięcia",           "Pełna historia operacji administracyjnych + soft-delete kont."),
]
y0 = Inches(2.55); cw = Inches(5.95); ch = Inches(1.45); gx = Inches(0.3); gy = Inches(0.15)
animated = [t, lead]
for i, (title, body) in enumerate(sec):
    col = i % 2; row = i // 2
    x = Inches(MARGIN) + col*(cw + gx); y = y0 + row*(ch + gy)
    add_rect(s, x, y, Inches(0.06), ch, GOLD_SOFT)
    title_tb = add_text(s, x + Inches(0.2), y + Inches(0.05), cw - Inches(0.2), Inches(0.5),
             title, size=15, bold=True, color=GOLD)
    add_text(s, x + Inches(0.2), y + Inches(0.55), cw - Inches(0.25), ch - Inches(0.65),
             body, size=12, color=CREAM, line_spacing=1.35)
    animated.append(title_tb)
add_footer(s, 15)
add_entrance_animations(s, animated, per_shape_delay_ms=180)
add_transition(s, "wipe")


# ============== SLIDE 16 — STACK TECH ==============
s = new_slide(NAVY)
t = standard_title(s, "Stack technologiczny", size=42)
lead = standard_lead(s, "Nowoczesny. Sprawdzony. Gotowy do skalowania.", size=18)

cols = [
    ("Frontend pracownika", [
        "React 19 + TypeScript",
        "Vite (HMR, fast build)",
        "Tailwind CSS",
        "Redux Toolkit",
        "React Router v7",
        "Framer Motion",
        "PWA (offline-ready)",
    ]),
    ("Frontend HR / Admin", [
        "Next.js 16 (App Router)",
        "React 19 + TypeScript",
        "Tailwind CSS v4",
        "Recharts (wykresy)",
        "jsPDF + html2canvas",
        "next-themes (dark mode)",
        "PWA",
    ]),
    ("Backend & DB", [
        "NestJS 11 (TypeScript)",
        "TypeORM + migracje",
        "PostgreSQL 16",
        "JWT + Passport",
        "bcrypt, helmet, throttler",
        "Nodemailer",
        "class-validator (DTO)",
    ]),
]
y0 = Inches(2.65); n = 3; gap = 0.25
w_in = (CONTENT_W - gap*(n-1))/n; w = Inches(w_in); h = Inches(4.1)
animated = [t, lead]
for i, (title, items) in enumerate(cols):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y0, w, h, NAVY_DEEP, line=GOLD, line_w=Pt(1.0))
    add_text(s, x, y0 + Inches(0.25), w, Inches(0.6),
             title, size=20, bold=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
    add_bullets(s, x + Inches(0.45), y0 + Inches(1.05), w - Inches(0.6), Inches(2.9),
                items, size=13, line_spacing=1.45)
    animated.append(box)
add_text(s, Inches(MARGIN), Inches(7.0), Inches(CONTENT_W), Inches(0.4),
         "Pełna konteneryzacja Docker · CI/CD ready · wdrożenie demonstracyjne na Railway",
         size=10, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
add_footer(s, 16)
add_entrance_animations(s, animated, per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 17 — ARCHITEKTURA ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Architektura — modularna, multi-tenant", size=36)
boxes = [
    ("Client Frontend", "React + Vite",   "port 3000",  "→ pracownik"),
    ("Admin Frontend",  "Next.js 16",     "port 3001",  "→ HR + admin"),
    ("Backend API",     "NestJS 11",      "port 4000",  "→ logika domenowa"),
]
y = Inches(2.0); n = 3; gap = 0.25
w_in = (CONTENT_W - gap*(n-1))/n; w = Inches(w_in); h = Inches(2.5)
animated = [t]
for i, (title, line1, line2, line3) in enumerate(boxes):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y, w, h, NAVY, line=GOLD, line_w=Pt(1.4))
    add_text(s, x, y + Inches(0.25), w, Inches(0.6),
             title, size=22, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
    add_text(s, x, y + Inches(0.95), w, Inches(0.4),
             line1, size=14, color=CREAM, align=PP_ALIGN.CENTER)
    add_text(s, x, y + Inches(1.4), w, Inches(0.4),
             line2, size=14, color=CREAM, align=PP_ALIGN.CENTER)
    add_text(s, x, y + Inches(1.9), w, Inches(0.4),
             line3, size=12, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
    animated.append(box)

arr = add_text(s, Inches(MARGIN), Inches(4.65), Inches(CONTENT_W), Inches(0.5),
               "▼", size=32, color=GOLD, align=PP_ALIGN.CENTER)
db_box = add_round(s, Inches(3.7), Inches(5.3), Inches(5.9), Inches(1.2), NAVY, line=GOLD, line_w=Pt(1.5))
add_text(s, Inches(3.7), Inches(5.45), Inches(5.9), Inches(0.5),
         "PostgreSQL 16", size=22, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
add_text(s, Inches(3.7), Inches(5.95), Inches(5.9), Inches(0.4),
         "multi-tenant z dyskryminatorem tenant_id · pełne migracje TypeORM",
         size=12, color=CREAM, align=PP_ALIGN.CENTER)
animated.extend([arr, db_box])

add_text(s, Inches(MARGIN), Inches(6.7), Inches(CONTENT_W), Inches(0.4),
         "Moduły: auth · users · approvals · organizations · departments · assessments · responses · results · mood-checks · analytics · reports · notifications · audit",
         size=10, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
add_footer(s, 17)
add_entrance_animations(s, animated, per_shape_delay_ms=200)
add_transition(s, "fade")


# ============== SLIDE 18 — MoSCoW ==============
s = new_slide(NAVY)
t = standard_title(s, "Zakres produktu — MoSCoW", size=36, h=1.0)
lead = standard_lead(s, "Co jest gotowe dziś, co przyjdzie jutro.", size=15, y=1.55, h=0.5)

cols = [
    ("Must Have ✓",   GREEN_DARK, [
        "Logowanie i role",
        "5 testów psychologicznych",
        "Auto-scoring po stronie API",
        "Anonimowy panel HR",
        "K-anonymity (k ≥ 5)",
        "Tryb safety-net",
        "Multi-tenant",
        "Zgodność z RODO",
    ]),
    ("Should Have ✓", OLIVE, [
        "Filtrowanie po działach",
        "Eksport PDF / CSV",
        "Powiadomienia o testach",
        "Analiza trendów",
        "Responsywność i PWA",
        "Skalowalność",
    ]),
    ("Could Have",    MUSTARD, [
        "Analiza sentymentu (NLP)",
        "Buforowanie raportów HR",
        "Rozszerzony audit log",
        "Webhooki",
        "Auto-podpowiedzi",
    ]),
    ("Won't Have",    CRIMSON, [
        "Diagnostyka kliniczna",
        "Integracja SAP / Workday",
        "Certyfikacja ISO 27001",
        "Audyty korporacyjne",
        "Skala milionów użytkowników",
    ]),
]
y = Inches(2.15); n = 4; gap = 0.18
w_in = (CONTENT_W - gap*(n-1))/n; w = Inches(w_in); h = Inches(4.55)
animated = [t, lead]
for i, (title, bg, items) in enumerate(cols):
    x = Inches(MARGIN + i*(w_in + gap))
    box = add_round(s, x, y, w, h, bg, line=GOLD, line_w=Pt(0.7))
    add_text(s, x, y + Inches(0.18), w, Inches(0.6),
             title, size=18, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
    add_bullets(s, x + Inches(0.25), y + Inches(0.85), w - Inches(0.4), h - Inches(1.1),
                items, size=11, line_spacing=1.4)
    animated.append(box)
add_footer(s, 18)
add_entrance_animations(s, animated, per_shape_delay_ms=200)
add_transition(s, "fade")


# ============== SLIDE 19 — ROADMAPA ==============
s = new_slide(NAVY_DEEP)
t = standard_title(s, "Roadmapa", size=42)
items = [
    ("Q3 2026 — pilot u 2–3 firm",     "Pierwsze wdrożenia, kalibracja progów alertów, case studies."),
    ("Q4 2026 — analiza komentarzy",   "Sentyment + automatyczne kategoryzowanie tematów (NLP)."),
    ("Q1 2027 — moduł terapeutyczny",  "Integracja z platformami telemedycznymi — rezerwacja sesji z aplikacji."),
    ("2027 — benchmarking branżowy",   "Anonimowe porównanie wyników firmy do średniej w branży."),
    ("2027 — SSO / Slack / Teams",     "Logowanie korporacyjne, przypomnienia z poziomu komunikatora."),
    ("Dalej — API publiczne",          "Otwarte API dla działów BI we własne dashboardy."),
]
y0 = Inches(1.85); cw = Inches(5.95); ch = Inches(1.55); gx = Inches(0.3); gy = Inches(0.18)
animated = [t]
for i, (title, body) in enumerate(items):
    col = i % 2; row = i // 2
    x = Inches(MARGIN) + col*(cw + gx); y = y0 + row*(ch + gy)
    add_rect(s, x, y, Inches(0.06), ch, GOLD)
    title_tb = add_text(s, x + Inches(0.2), y + Inches(0.05), cw - Inches(0.2), Inches(0.5),
             title, size=16, bold=True, color=GOLD)
    add_text(s, x + Inches(0.2), y + Inches(0.55), cw - Inches(0.25), ch - Inches(0.65),
             body, size=13, color=CREAM, line_spacing=1.35)
    animated.append(title_tb)
add_footer(s, 19)
add_entrance_animations(s, animated, per_shape_delay_ms=180)
add_transition(s, "push")


# ============== SLIDE 20 — MODEL CENOWY ==============
s = new_slide(NAVY)
t = standard_title(s, "Model współpracy", size=42, h=1.0)
lead = standard_lead(s, "Subskrypcja per pracownik · bez ukrytych kosztów wdrożenia.", size=16, y=1.55, h=0.5)

plans = [
    ("Starter",   "od 19 zł", "/ pracownik / mies.", [
        "do 50 pracowników",
        "wszystkie 5 testów",
        "panel HR + eksporty",
        "wsparcie e-mail",
    ], False),
    ("Business",  "od 14 zł", "/ pracownik / mies.", [
        "50–500 pracowników",
        "branding firmowy",
        "custom progi alertów",
        "onboarding + szkolenie",
    ], True),
    ("Enterprise","indywid.", "wycena na firmę", [
        "500+ pracowników",
        "dedykowana instancja",
        "SSO + integracje",
        "SLA 99,9%",
    ], False),
]
y = Inches(2.2); n = 3; gap = 0.25
w_in = (CONTENT_W - gap*(n-1))/n; w = Inches(w_in); h = Inches(4.6)
animated = [t, lead]
for i, (name, price, freq, feats, hl) in enumerate(plans):
    x = Inches(MARGIN + i*(w_in + gap))
    border = GOLD_SOFT if hl else GOLD
    bw = Pt(2.5) if hl else Pt(1.0)
    bg = NAVY_DEEP if not hl else NAVY_LIGHT
    box = add_round(s, x, y, w, h, bg, line=border, line_w=bw)
    if hl:
        add_tag(s, x + Inches(0.35), y - Inches(0.22), "★ REKOMENDOWANY", size=10, fg=NAVY, w=Inches(2.7))
    add_text(s, x, y + Inches(0.3), w, Inches(0.6),
             name, size=22, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
    add_text(s, x, y + Inches(0.95), w, Inches(1.0),
             price, size=42, bold=True, color=GOLD, align=PP_ALIGN.CENTER, auto_size=True)
    add_text(s, x, y + Inches(2.0), w, Inches(0.4),
             freq, size=12, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
    add_bullets(s, x + Inches(0.5), y + Inches(2.55), w - Inches(0.7), Inches(1.9),
                feats, size=12, line_spacing=1.5)
    animated.append(box)
add_text(s, Inches(MARGIN), Inches(7.0), Inches(CONTENT_W), Inches(0.4),
         "Cennik referencyjny — finalna wycena uwzględnia liczbę osób, model wdrożenia i SLA.",
         size=10, italic=True, color=GOLD_SOFT, align=PP_ALIGN.CENTER)
add_footer(s, 20)
add_entrance_animations(s, animated, per_shape_delay_ms=300)
add_transition(s, "push")


# ============== SLIDE 21 — KONTAKT ==============
s = new_slide(NAVY)
add_rect(s, Inches(7.5), Inches(0), Inches(SLIDE_W_INCH - 7.5), Inches(SLIDE_H_INCH), CREAM)
add_rect(s, Inches(0), Inches(7.2), Inches(SLIDE_W_INCH/2), Inches(0.3), TEAL)
add_rect(s, Inches(SLIDE_W_INCH/2), Inches(7.2), Inches(SLIDE_W_INCH/2), Inches(0.3), GOLD)

tag = add_tag(s, Inches(MARGIN), Inches(0.7), "POROZMAWIAJMY", size=11, w=Inches(2.0))
title = add_text(s, Inches(MARGIN), Inches(1.3), Inches(7), Inches(2.5),
                 "Pokażmy MoodFlow\nna danych Twojej firmy.",
                 size=42, bold=True, color=GOLD, line_spacing=1.1)
sub = add_text(s, Inches(MARGIN), Inches(3.85), Inches(7), Inches(1.6),
               "45-minutowe demo na żywo + symulacja raportu HR\n"
               "na fikcyjnych danych Twojej organizacji.",
               size=18, color=CREAM, line_spacing=1.4)
contact_n = add_text(s, Inches(MARGIN), Inches(5.45), Inches(7), Inches(0.5),
                     "Mateusz Matczuk", size=20, bold=True, color=GOLD)
contact_e = add_text(s, Inches(MARGIN), Inches(5.9), Inches(7), Inches(0.5),
                     "mateusz.matczuk.it@gmail.com", size=18, color=WHITE)
cta = add_round(s, Inches(MARGIN), Inches(6.5), Inches(2.5), Inches(0.55), GOLD)
add_text(s, Inches(MARGIN), Inches(6.55), Inches(2.5), Inches(0.5),
         "Umów demo  →", size=16, bold=True, color=NAVY, align=PP_ALIGN.CENTER)

# prawa cream
add_brand_mark(s, Inches(10.4), Inches(2.3), size=Inches(1.2))
brand = add_text(s, Inches(7.5), Inches(3.7), Inches(SLIDE_W_INCH - 7.5), Inches(1.4),
                 "MoodFlow", size=66, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
slogan = add_text(s, Inches(7.5), Inches(4.9), Inches(SLIDE_W_INCH - 7.5), Inches(0.8),
                  "ZDROWY ZESPÓŁ. MIERZALNY POSTĘP.",
                  size=14, bold=True, color=OLIVE, align=PP_ALIGN.CENTER)

add_entrance_animations(s, [tag, title, sub, contact_n, contact_e, cta, brand, slogan],
                        per_shape_delay_ms=300)
add_transition(s, "fade")


# ============== ZAPIS ==============
prs.save(OUTPUT)
print(f"Zapisano: {OUTPUT}")
print(f"Liczba slajdów: {len(prs.slides)}")
