#!/usr/bin/env python3
"""4.3. Bezpieczeństwo i autentykacja — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '4.3. Bezpieczeństwo i autentykacja', size=12)

    add_paragraph(doc, [
        ('MoodFlow operuje na danych dotyczących dobrostanu psychicznego pracowników, dlatego bezpieczeństwo aplikacji potraktowano jako wymóg krytyczny, a nie opcjonalny dodatek. W praktyce oznaczało to wbudowanie kilku niezależnych warstw zabezpieczeń: bezpiecznego przechowywania haseł, krótkotrwałych tokenów dostępu w ciasteczkach HttpOnly, sprawdzania uprawnień w oparciu o rolę użytkownika, ograniczania liczby żądań logowania oraz dziennika audytu rejestrującego wszystkie istotne zdarzenia. Każda z tych warstw została omówiona poniżej wraz z fragmentem kodu, który ją realizuje.', ),
    ])

    add_heading(doc, 'Hashowanie haseł algorytmem bcrypt', level=3)

    add_paragraph(doc, [
        ('Hasła użytkowników nie są nigdy zapisywane w bazie danych w postaci jawnej — w polu ', ),
        ('passwordHash', 'm'),
        (' tabeli ', ),
        ('users', 'm'),
        (' przechowywany jest jedynie skrót kryptograficzny obliczony algorytmem ', ),
        ('bcrypt', 'b'),
        (' z parametrem kosztu ', ),
        ('12 rund', 'b'),
        ('. Bcrypt został zaprojektowany specjalnie do przechowywania haseł — celowo działa wolno (około 200 ms na pojedynczy hash), co znacząco utrudnia ataki brute force, w których atakujący próbuje miliarda kombinacji w sekundę. Każdy hash zawiera również wbudowaną „sól”, czyli losową wartość dodawaną do hasła przed obliczeniem skrótu. Dzięki temu nawet dwóch użytkowników z identycznym hasłem ma w bazie zupełnie różne wartości skrótu, co uniemożliwia ataki słownikowe oparte o gotowe tablice tęczowe.', ),
    ])

    add_paragraph(doc, [
        ('Hashowanie odbywa się we wszystkich trzech ścieżkach rejestracji (rejestracja firmy, rejestracja pracownika przez kod zaproszenia oraz starsza ścieżka rejestracji utrzymywana dla zgodności wstecznej). Przy logowaniu zamiast porównywać hasła wprost, używana jest funkcja ', ),
        ('bcrypt.compare', 'm'),
        (', która hashuje wpisane hasło w identyczny sposób i porównuje wynik bajt po bajcie z wartością zapisaną w bazie.', ),
    ])

    add_heading(doc, 'Tokeny JWT w bezpiecznych ciasteczkach HttpOnly', level=3)

    add_paragraph(doc, [
        ('Po pomyślnym zalogowaniu serwer wystawia użytkownikowi dwa tokeny ', ),
        ('JWT', 'b'),
        (' (', ),
        ('JSON Web Token', 'i'),
        ('). Pierwszy z nich, ', ),
        ('access token', 'b'),
        (', jest ważny przez 15 minut i służy do uwierzytelniania każdego kolejnego żądania. Drugi, ', ),
        ('refresh token', 'b'),
        (', jest ważny przez 7 dni i służy wyłącznie do odnawiania access tokena bez konieczności ponownego logowania. Oba tokeny są podpisane różnymi sekretami (', ),
        ('JWT_SECRET', 'm'),
        (' i ', ),
        ('JWT_REFRESH_SECRET', 'm'),
        ('), co oznacza, że wycieki jednego z nich nie kompromitują drugiego.', ),
    ])

    add_paragraph(doc, [
        ('Tokeny nie są przekazywane w nagłówku ', ),
        ('Authorization', 'm'),
        (' ani zapisywane w pamięci przeglądarki (', ),
        ('localStorage', 'm'),
        ('), tylko zapisywane w ciasteczkach z flagą ', ),
        ('HttpOnly', 'b'),
        ('. Flaga ta sprawia, że ciasteczko jest niedostępne dla skryptów JavaScript działających w przeglądarce — co eliminuje całą klasę ataków typu ', ),
        ('XSS', 'i'),
        (', w których złośliwy skrypt mógłby ukraść token z pamięci. W środowisku produkcyjnym ciasteczka mają dodatkowo flagi ', ),
        ('Secure', 'b'),
        (' (przesyłanie tylko po HTTPS) oraz ', ),
        ('SameSite=strict', 'b'),
        (' (ochrona przed atakami CSRF). Nazwy ciasteczek to ', ),
        ('mf_access', 'm'),
        (' oraz ', ),
        ('mf_refresh', 'm'),
        ('.', ),
    ])

    add_listing(
        doc,
        listing_no='4.7',
        title='Konfiguracja bezpiecznych ciasteczek z tokenami JWT',
        file_path='backend-api/src/modules/auth/auth.controller.ts',
        lines='11–39',
        comment=(
            'Listing 4.7 prezentuje funkcje setAuthCookies oraz clearAuthCookies. '
            'Widoczne są flagi httpOnly (zawsze włączona), secure (włączana w środowisku '
            'produkcyjnym) oraz sameSite (strict w produkcji, lax w trybie deweloperskim). '
            'Czas życia ciasteczek odpowiada czasowi ważności tokenów: 15 minut '
            'dla access tokena i 7 dni dla refresh tokena.'
        ),
    )

    add_paragraph(doc, [
        ('Generowanie tokenów odbywa się w prywatnej metodzie ', ),
        ('generateTokens', 'm'),
        (' serwisu uwierzytelniania. Do payloadu tokena trafiają: identyfikator użytkownika (', ),
        ('sub', 'm'),
        ('), adres e-mail, rola w systemie oraz identyfikator organizacji — dzięki temu kolejne moduły aplikacji mogą podejmować decyzje uprawnień na podstawie samej zawartości tokena, bez dodatkowego zapytania do bazy.', ),
    ])

    add_listing(
        doc,
        listing_no='4.8',
        title='Generowanie pary tokenów JWT (access + refresh)',
        file_path='backend-api/src/modules/auth/auth.service.ts',
        lines='179–193',
        comment=(
            'Listing 4.8 pokazuje metodę generateTokens. Każdy token jest podpisywany '
            'innym sekretem, ma inny czas wygaśnięcia (15 minut vs 7 dni) i ten sam payload '
            'zawierający dane potrzebne do uwierzytelniania kolejnych żądań.'
        ),
    )

    add_heading(doc, 'Walidacja tokena i strażnik JwtAuthGuard', level=3)

    add_paragraph(doc, [
        ('Przy każdym żądaniu trafiającym do chronionego endpointu uruchamiany jest ', ),
        ('JwtStrategy', 'b'),
        (' — strategia uwierzytelniania zbudowana na bibliotece Passport. Najpierw próbuje ona odczytać token z ciasteczka ', ),
        ('mf_access', 'm'),
        (', a jeśli go nie znajdzie — z nagłówka ', ),
        ('Authorization: Bearer', 'm'),
        ('. Następnie weryfikuje podpis tokena sekretem JWT, sprawdza datę ważności i pobiera użytkownika z bazy danych. Jeżeli konto nie istnieje lub jego status to nie ', ),
        ('ACTIVE', 'm'),
        (', strategia rzuca wyjątek ', ),
        ('UnauthorizedException', 'm'),
        (' i żądanie jest odrzucane.', ),
    ])

    add_listing(
        doc,
        listing_no='4.9',
        title='Strategia JWT — odczyt tokena z cookie i walidacja użytkownika',
        file_path='backend-api/src/modules/auth/strategies/jwt.strategy.ts',
        lines='1–37',
        comment=(
            'Listing 4.9 prezentuje JwtStrategy. Funkcja cookieExtractor odczytuje '
            'token z ciasteczka HttpOnly. W metodzie validate sprawdzane jest, czy '
            'użytkownik wciąż istnieje w bazie i czy jego konto jest aktywne. Dzięki '
            'temu unieważnienie konta (np. po zwolnieniu pracownika) działa natychmiast, '
            'bez czekania na wygaśnięcie tokena.'
        ),
    )

    add_heading(doc, 'Autoryzacja oparta o role (RolesGuard)', level=3)

    add_paragraph(doc, [
        ('Samo uwierzytelnienie nie wystarczy — trzeba jeszcze sprawdzić, czy zalogowany użytkownik ma uprawnienia do wykonania konkretnej akcji. Służy do tego dekorator ', ),
        ('@Roles()', 'b'),
        (' współpracujący ze strażnikiem ', ),
        ('RolesGuard', 'b'),
        ('. Programista oznacza endpoint adnotacją w stylu ', ),
        ('@Roles(Role.HR, Role.ADMIN)', 'm'),
        (', a NestJS przy każdym żądaniu sprawdza, czy rola zalogowanego użytkownika znajduje się na liście dozwolonych. W przeciwnym razie żądanie kończy się błędem ', ),
        ('403 Forbidden', 'm'),
        (', a do akcji nie dochodzi w ogóle. Mechanizm ten działa deklaratywnie — wystarczy dopisać jedną adnotację, bez ręcznego sprawdzania uprawnień w treści metody.', ),
    ])

    add_listing(
        doc,
        listing_no='4.10',
        title='Strażnik ról i dekorator @Roles()',
        file_path='backend-api/src/common/guards/roles.guard.ts (1–20) oraz roles.decorator.ts (1–5)',
        lines='całość',
        comment=(
            'Listing 4.10 łączy dwa pliki: dekorator @Roles() zapisujący metadane '
            'na metodzie kontrolera oraz RolesGuard, który te metadane czyta i '
            'porównuje z rolą bieżącego użytkownika. Cała logika autoryzacji '
            'zamyka się w mniej niż 20 liniach kodu, a dodanie nowej roli sprowadza '
            'się do dopisania wartości do enum Role.'
        ),
    )

    add_heading(doc, 'Ograniczanie liczby prób logowania (rate limiting)', level=3)

    add_paragraph(doc, [
        ('Endpoint logowania jest najczęstszym celem ataków siłowych, w których atakujący próbuje setek tysięcy kombinacji haseł na sekundę. Aby temu zapobiec, na każdy endpoint uwierzytelniania nałożono ', ),
        ('Throttler', 'b'),
        ('. Logowanie jest ograniczone do 10 prób w ciągu 15 minut z jednego adresu IP, rejestracja pracownika również do 5 prób na 15 minut, a rejestracja całej firmy — do 5 prób na godzinę. Po przekroczeniu limitu serwer odpowiada kodem ', ),
        ('429 Too Many Requests', 'm'),
        (', co skutecznie spowalnia atakującego, nie wpływając jednocześnie na zwykłych użytkowników, którzy w naturalnych warunkach nie wykonują tylu prób.', ),
    ])

    add_listing(
        doc,
        listing_no='4.11',
        title='Rate limiting na endpointach uwierzytelniania',
        file_path='backend-api/src/modules/auth/auth.controller.ts',
        lines='41–74',
        comment=(
            'Listing 4.11 pokazuje wszystkie cztery endpointy uwierzytelniania '
            '(register, register-company, register-employee, login) z dekoratorami '
            '@Throttle, które definiują niezależne limity dla każdej operacji. '
            'Logika nakładania limitu jest przezroczysta dla samego kontrolera — '
            'NestJS odrzuca nadmiarowe żądania, zanim w ogóle dotrą do metody.'
        ),
    )

    add_heading(doc, 'Rejestrowanie zdarzeń w dzienniku audytu', level=3)

    add_paragraph(doc, [
        ('Każda operacja związana z bezpieczeństwem — udane logowanie, nieudane logowanie, zatwierdzenie konta, zmiana roli, eksport raportu — jest dodatkowo rejestrowana w tabeli ', ),
        ('audit_logs', 'm'),
        (' wraz ze znacznikiem czasu, identyfikatorem użytkownika wykonującego operację, identyfikatorem organizacji oraz strukturą metadanych w polu ', ),
        ('jsonb', 'm'),
        ('. Wpisy w dzienniku audytu są niemodyfikowalne (', ),
        ('append-only', 'i'),
        ('), co oznacza, że raz zapisane zdarzenie nie może być później zmienione ani usunięte z poziomu zwykłej logiki aplikacji. Dzięki temu dziennik audytu spełnia wymagania RODO w zakresie rozliczalności (art. 5 ust. 2) — w razie incydentu można odtworzyć, kto, kiedy i z jakiego adresu IP wykonał daną operację.', ),
    ])

    add_listing(
        doc,
        listing_no='4.12',
        title='Logowanie zdarzeń bezpieczeństwa do dziennika audytu',
        file_path='backend-api/src/modules/auth/auth.service.ts',
        lines='121–161',
        comment=(
            'Listing 4.12 pokazuje, jak metoda login wywołuje auditService.log dla '
            'trzech sytuacji: nieznany użytkownik (LOGIN_FAILED, reason: unknown_user), '
            'błędne hasło (LOGIN_FAILED, reason: wrong_password) oraz pomyślne '
            'logowanie (LOGIN_SUCCESS). Każdy wpis zawiera dokładnie tyle informacji, '
            'ile jest niezbędne do prześledzenia zdarzenia, bez ujawniania samego '
            'hasła ani innych danych wrażliwych.'
        ),
    )

    add_heading(doc, 'Podsumowanie warstw bezpieczeństwa', level=3)

    add_paragraph(doc, [
        ('Warstwa bezpieczeństwa MoodFlow została zaprojektowana zgodnie z zasadą obrony w głąb (', ),
        ('defense in depth', 'i'),
        ('). Każda z opisanych warstw — bcrypt, JWT w ciasteczkach HttpOnly, JwtAuthGuard, RolesGuard, Throttler, dziennik audytu — chroni przed inną klasą zagrożeń, a wspólnie tworzą system odporny na większość typowych ataków sieciowych. Co istotne, większość tych zabezpieczeń jest deklaratywna — programista włącza je dekoratorami lub jednolinijkowymi konfiguracjami, bez ryzyka popełnienia błędu w implementacji. Pozostałe aspekty bezpieczeństwa, takie jak izolacja danych pomiędzy organizacjami w trybie multi-tenant oraz anonimizacja wyników HR, zostały omówione odpowiednio w podrozdziałach 4.4 oraz 4.6.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.3-Bezpieczenstwo-i-autentykacja.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
