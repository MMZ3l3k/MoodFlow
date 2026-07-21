#!/usr/bin/env python3
"""Podsumowanie i wnioski — rozdział nienumerowany — DOCX zgodny z formatem CDV (max 2 strony)."""

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


def add_heading(doc, text, *, size=12, level=1):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8 if level == 1 else 6)
    pf.space_after = Pt(8 if level == 1 else 4)
    r = p.add_run(text)
    set_run(r, bold=True, size=size)


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

    # Tytuł rozdziału — nienumerowany, zgodnie z wymogami CDV
    add_heading(doc, 'Podsumowanie i wnioski', size=12)

    add_paragraph(doc, [
        ('W ramach pracy inżynierskiej zaprojektowano, zaimplementowano i wdrożono kompletną platformę webową ', ),
        ('MoodFlow', 'b'),
        (' służącą do monitorowania dobrostanu psychicznego pracowników w organizacjach. System przyjmuje formę aplikacji wielodostępnej (multi-tenant), w której jedna instancja oraz wspólna baza danych obsługują wiele niezależnych firm z pełną izolacją danych. Założone cele zostały zrealizowane w pełnym zakresie minimalnym (MVP), a wytworzony produkt został wdrożony na środowisko produkcyjne platformy Railway, gdzie jest dostępny pod publicznym adresem internetowym. Wszystkie kluczowe funkcjonalności przewidziane w wymaganiach funkcjonalnych zostały zaimplementowane i zweryfikowane scenariuszami testowymi.', ),
    ])

    add_paragraph(doc, [
        ('Po stronie ', ),
        ('backendu', 'b'),
        (' wytworzono modularną aplikację NestJS w języku TypeScript obejmującą trzynaście modułów domenowych (auth, users, organizations, departments, assessments, responses, results, mood-checks, analytics, notifications, audit, approvals, health). Backend implementuje uwierzytelnianie oparte o tokeny JSON Web Tokens z mechanizmem auto-refresh, autoryzację opartą na rolach (RBAC) z czterema poziomami uprawnień (super-admin, admin, HR, pracownik), izolację danych multi-tenant na poziomie wierszy z obowiązkowym filtrowaniem po identyfikatorze organizacji w każdym zapytaniu, sześć walidowanych klinicznie kwestionariuszy psychometrycznych (PHQ-9, GAD-7, PSS-10, WHO-5 oraz dwa narzędzia uzupełniające MOOD10 i DAILY_MOOD) z dedykowanym serwisem obliczającym wyniki według wzorca strategii oraz mechanizm anonimizacji raportów HR oparty na progu k-anonymity (MIN_GROUP_SIZE = 5).', ),
    ])

    add_paragraph(doc, [
        ('Po stronie ', ),
        ('warstwy prezentacji', 'b'),
        (' wytworzono dwie niezależne aplikacje frontendowe. Aplikacja pracownika (React + Vite + Redux Toolkit) wdrożona jako Progressive Web App umożliwia instalację na urządzeniu mobilnym i pracę w trybie pełnoekranowym z ograniczoną funkcjonalnością offline. Panel administracyjny (Next.js z App Routerem) udostępnia narzędzia zarządzania pracownikami, strukturą organizacji oraz interaktywne wykresy analityczne oparte na bibliotece Recharts. Komunikacja obu aplikacji z backendem odbywa się przez wspólny wzorzec klienta HTTP z mechanizmem ', ),
        ('pending queue', 'i'),
        (' eliminującym sytuacje wyścigu podczas równoległego odświeżania tokena. Bezpieczeństwo eksploatacyjne uzupełniają nagłówki HTTP generowane przez Helmet, polityka CORS oparta na whiteliście, ograniczenie częstotliwości żądań na endpointach uwierzytelniania, ciasteczka sesyjne z flagami httpOnly, secure i sameSite, hashowanie haseł funkcją bcrypt z parametrem 12 oraz parametryzowane zapytania SQL przez warstwę TypeORM.', ),
    ])

    add_heading(doc, 'Napotkane problemy i ich rozwiązania', size=11, level=2)

    add_paragraph(doc, [
        ('W trakcie realizacji projektu napotkano kilka problemów wymagających niestandardowych decyzji projektowych. ', ),
        ('Blokada portu SMTP 587', 'b'),
        (' w niskim planie platformy Railway uniemożliwiała niezawodną wysyłkę powiadomień e-mail; rozwiązaniem było zaprojektowanie systemu notyfikacji w trybie ', ),
        ('best effort', 'i'),
        (' — głównym kanałem komunikacji z użytkownikiem stały się powiadomienia in-app oparte na pollingu, a wiadomości e-mail pełnią rolę kanału pomocniczego. ', ),
        ('Cross-origin cookies', 'b'),
        (' między domenami dwóch frontendów a backendem na osobnych poddomenach Railway wymusiły wdrożenie konfiguracji ', ),
        ('SameSite=None; Secure', 'm'),
        (' w produkcji oraz precyzyjnej konfiguracji CORS z opcją ', ),
        ('credentials: true', 'm'),
        ('. ', ),
        ('Niezgodność tokenów stanu między motywem jasnym i ciemnym', 'b'),
        (' powodowała niewidoczność etykiet formularzy logowania na białych kartach w trybie systemowym dark; problem rozwiązano przez wymuszenie jasnych tokenów koloru w obrębie wrapperów ekranów uwierzytelniania (mechanizm dziedziczenia zmiennych CSS). Wszystkie napotkane problemy zostały rozwiązane bez kompromisów funkcjonalnych — system działa stabilnie w środowisku produkcyjnym.', ),
    ])

    add_heading(doc, 'Realizacja celów pracy i wnioski', size=11, level=2)

    add_paragraph(doc, [
        ('Cele określone w fazie analizy projektowej zostały osiągnięte w pełnym zakresie. Wytworzony produkt: ', ),
        ('rozwiązuje konkretny problem biznesowy', 'b'),
        (' (monitorowanie dobrostanu psychicznego pracowników z zachowaniem prywatności indywidualnych wyników); ', ),
        ('jest oparty na walidowanych narzędziach psychologicznych', 'b'),
        (' (PHQ-9, GAD-7, PSS-10, WHO-5), co odróżnia go od typowych aplikacji do oceny nastroju opartych na intuicyjnych skalach; ', ),
        ('wdraża wielowarstwową ochronę danych wrażliwych', 'b'),
        (' (kontrola dostępu rolami, agregacja statystyczna, k-anonymity, twarde usuwanie z propagacją kaskadową realizujące prawo do bycia zapomnianym); ', ),
        ('jest wdrażalny w sposób kontrolowany i powtarzalny', 'b'),
        (' (Docker Compose lokalnie, Railway w produkcji, continuous deployment z automatycznym rollbackiem). Architektura modularna i deklaratywna w stosowanych wzorcach (klasy DTO z dekoratorami walidacji, strażnicy uprawnień, plasterki Redux, layouty zagnieżdżone Next.js) pozwala na dalszy rozwój bez konieczności przebudowy fundamentów.', ),
    ])

    add_heading(doc, 'Kierunki dalszego rozwoju', size=11, level=2)

    add_paragraph(doc, [
        ('Zakres pracy inżynierskiej został świadomie ograniczony do funkcjonalności uznanych za krytyczne dla MVP. W ramach naturalnych kierunków rozwoju systemu poza obecnym zakresem przewidziano następujące rozszerzenia. ', ),
        ('Realizacja prawa do przenoszenia danych', 'b'),
        (' (RODO art. 20) przez dedykowany endpoint ', ),
        ('GET /users/me/export', 'm'),
        (' generujący kompletne archiwum konta w formacie JSON. ', ),
        ('Wprowadzenie soft delete z okresem karencji', 'b'),
        (' (np. 30 dni) umożliwiającego cofnięcie pomyłkowego usunięcia konta. ', ),
        ('Polityka retencji dziennika audytu', 'b'),
        (' z automatycznym czyszczeniem wpisów starszych niż określony okres (np. 365 dni). ', ),
        ('Powiadomienia czasu rzeczywistego', 'b'),
        (' przez Web Push (Service Worker) i WebSocket zastępujące mechanizm pollingu. ', ),
        ('Pełna konfiguracja Content-Security-Policy', 'b'),
        (' wraz z mechanizmem trust proxy dla precyzyjnego rate limitingu opartego na rzeczywistym adresie IP klienta. ', ),
        ('Zaawansowane mechanizmy ochrony prywatności', 'b'),
        (' typu differential privacy w warstwie analitycznej dla organizacji o większej skali. ', ),
        ('Skalowanie poziome', 'b'),
        (' przez wdrożenie wielu replik backendu za load balancerem oraz zewnętrznego cache (Redis) dla zagregowanych raportów. ', ),
        ('Rozszerzenie zakresu testów automatycznych', 'b'),
        (' o testy jednostkowe scoringu psychometrycznego, testy integracyjne API oraz testy end-to-end krytycznych ścieżek użytkownika. Każdy z tych kierunków stanowi naturalne rozszerzenie zaprojektowanej architektury i nie wymaga przebudowy istniejących fundamentów systemu.', ),
    ])

    add_paragraph(doc, [
        ('Praca inżynierska pozwoliła na praktyczne zastosowanie wiedzy z zakresu projektowania nowoczesnych aplikacji webowych, modelowania domenowego, bezpieczeństwa danych wrażliwych oraz wdrażania systemów konteneryzowanych w środowisku produkcyjnym. Wytworzony system MoodFlow stanowi pełnoprawne, wdrożone rozwiązanie biznesowe gotowe do dalszego rozwoju i potencjalnego wdrożenia w realnych organizacjach po dopełnieniu formalności prawnych związanych z przetwarzaniem danych szczególnej kategorii.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/Podsumowanie-i-wnioski.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
