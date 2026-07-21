#!/usr/bin/env python3
"""5.4. Bezpieczeństwo eksploatacyjne — Helmet, CORS, rate limiting, walidacja — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '5.4. Bezpieczeństwo eksploatacyjne — warstwa transportowa, walidacja i ochrona przed nadużyciami', size=12)

    add_paragraph(doc, [
        ('Rozdział 4.3 omawiał podstawowy mechanizm uwierzytelniania (JSON Web Tokens) oraz autoryzacji opartej na rolach (RBAC). Niniejszy podrozdział uzupełnia te informacje o mechanizmy bezpieczeństwa działające w warstwie eksploatacyjnej — od momentu, gdy żądanie HTTP trafi do aplikacji, aż do zwrócenia odpowiedzi. Składają się na nie: ', ),
        ('walidacja konfiguracji', 'b'),
        (' przy starcie procesu, ', ),
        ('nagłówki bezpieczeństwa', 'b'),
        (' (Helmet), ', ),
        ('polityka CORS', 'b'),
        (', ', ),
        ('walidacja danych wejściowych', 'b'),
        (' (class-validator), ', ),
        ('ograniczenie częstotliwości żądań', 'b'),
        (' (rate limiting), ', ),
        ('bezpieczna obsługa ciasteczek sesji', 'b'),
        (', mocne ', ),
        ('hashowanie haseł', 'b'),
        (' oraz ', ),
        ('ochrona przed wstrzyknięciem SQL', 'b'),
        ('. Każda z tych warstw została wdrożona deklaratywnie, dzięki czemu zabezpieczenia obowiązują dla całej aplikacji bez konieczności ręcznego włączania ich w poszczególnych endpointach.', ),
    ])

    add_heading(doc, 'Walidacja środowiska — zasada fail-fast', level=3)

    add_paragraph(doc, [
        ('Pierwszą linię obrony stanowi ', ),
        ('walidacja zmiennych środowiskowych', 'b'),
        (' wykonywana przed inicjalizacją modułu Nest. Funkcja ', ),
        ('validateEnv', 'm'),
        (' sprawdza obecność wszystkich wymaganych zmiennych (', ),
        ('DB_HOST', 'm'),
        (', ', ),
        ('DB_PORT', 'm'),
        (', ', ),
        ('DB_USER', 'm'),
        (', ', ),
        ('DB_PASSWORD', 'm'),
        (', ', ),
        ('DB_NAME', 'm'),
        (', ', ),
        ('JWT_SECRET', 'm'),
        (', ', ),
        ('JWT_REFRESH_SECRET', 'm'),
        (') i przerywa start, jeśli którakolwiek z nich jest pusta. Dodatkowo wykonywane są dwie aktywne kontrole sekretów JWT: każdy musi mieć ', ),
        ('co najmniej 32 znaki', 'b'),
        (' i nie może zawierać typowych słów-pułapek (', ),
        ('change_me', 'i'),
        (', ', ),
        ('secret', 'i'),
        (', ', ),
        ('password', 'i'),
        (', ', ),
        ('moodflow_secret', 'i'),
        ('). Wreszcie sekrety dla tokena dostępu i odświeżania muszą być różne — w przeciwnym razie kompromitacja jednego umożliwiłaby falsyfikację drugiego. Mechanizm fail-fast eliminuje sytuację, w której aplikacja działa z nieświadomie pozostawioną domyślną wartością sekretu.', ),
    ])

    add_listing(
        doc,
        listing_no='5.4',
        title='Walidacja zmiennych środowiskowych przy starcie aplikacji',
        file_path='backend-api/src/main.ts',
        lines='10–30',
        comment=(
            'Listing 5.4 prezentuje funkcję validateEnv. Sprawdzenia są '
            'celowo restrykcyjne — jakikolwiek brak lub słabość konfiguracji '
            'powoduje natychmiastowe zatrzymanie procesu, co ujawnia problem '
            'na etapie wdrożenia, zamiast tworzyć niewidoczną podatność w '
            'środowisku produkcyjnym. Identyfikacja typowych słów-pułapek '
            'eliminuje typowy błąd polegający na pozostawieniu w pliku .env '
            'wartości skopiowanej z .env.example.'
        ),
    )

    add_heading(doc, 'Helmet, CORS i parsowanie ciasteczek — middleware HTTP', level=3)

    add_paragraph(doc, [
        ('Po pomyślnej walidacji środowiska aplikacja rejestruje trzy globalne komponenty middleware. ', ),
        ('Helmet', 'b'),
        (' (popularny pakiet ekosystemu Express) ustawia zestaw nagłówków bezpieczeństwa: ', ),
        ('X-Content-Type-Options: nosniff', 'm'),
        (' (blokada MIME-sniffing), ', ),
        ('X-Frame-Options: SAMEORIGIN', 'm'),
        (' (ochrona przed clickjacking), ', ),
        ('Strict-Transport-Security', 'm'),
        (' (wymuszenie HTTPS na poziomie przeglądarki), a także konfigurację Cross-Origin Resource Policy oraz Cross-Origin Embedder Policy. Polityka ', ),
        ('Content-Security-Policy', 'm'),
        (' została jawnie wyłączona, ponieważ jej domyślna wartość blokowałaby zasoby pobierane z domeny frontendu — pełna konfiguracja CSP przewidziana jest jako element przyszłego rozwoju.', ),
    ])

    add_paragraph(doc, [
        ('Polityka ', ),
        ('CORS', 'b'),
        (' (Cross-Origin Resource Sharing) jest oparta na liście dozwolonych originów pobranej ze zmiennej środowiskowej ', ),
        ('CORS_ORIGIN', 'm'),
        ('. Lista ma postać wartości oddzielonych przecinkami; w środowisku lokalnym zwykle zawiera ', ),
        ('http://localhost:3000', 'm'),
        (' i ', ),
        ('http://localhost:3001', 'm'),
        (', a w produkcji — domeny obu frontendów na Railway. Opcja ', ),
        ('credentials: true', 'm'),
        (' zezwala przeglądarce na wysyłanie ciasteczek przy żądaniach cross-origin, co jest niezbędne do działania mechanizmu ciasteczek HTTP-only. Trzeci komponent — ', ),
        ('cookie-parser', 'b'),
        (' — przetwarza nagłówek ', ),
        ('Cookie', 'm'),
        (' przychodzących żądań i udostępnia jego zawartość pod ', ),
        ('req.cookies', 'm'),
        (', umożliwiając strażnikowi JWT odczyt tokena z bezpiecznego ciasteczka.', ),
    ])

    add_listing(
        doc,
        listing_no='5.5',
        title='Konfiguracja Helmet, CORS, cookie-parser i ValidationPipe',
        file_path='backend-api/src/main.ts',
        lines='35–61',
        comment=(
            'Listing 5.5 prezentuje konfigurację globalnych komponentów. '
            'Kolejność rejestracji ma znaczenie: Helmet i cookie-parser muszą '
            'być włączone przed enableCors, aby nagłówki bezpieczeństwa były '
            'dodawane także do odpowiedzi preflight. ValidationPipe '
            'rejestrowany globalnie obejmuje wszystkie endpointy — żaden '
            'kontroler nie musi go ponownie deklarować.'
        ),
    )

    add_heading(doc, 'Walidacja danych wejściowych — class-validator i ValidationPipe', level=3)

    add_paragraph(doc, [
        ('Każde żądanie modyfikujące dane przekazuje payload w formacie JSON, który musi zostać zweryfikowany przed dotarciem do warstwy biznesowej. Realizację zapewnia kombinacja biblioteki ', ),
        ('class-validator', 'b'),
        (' (definiowanie reguł walidacji w postaci dekoratorów na polach klasy DTO) oraz globalnego ', ),
        ('ValidationPipe', 'b'),
        (' (automatyczne stosowanie reguł i odrzucanie nieprawidłowych żądań ze statusem 400). Trzy opcje konfiguracyjne ValidationPipe są kluczowe dla bezpieczeństwa: ', ),
        ('whitelist: true', 'm'),
        (' usuwa z payloadu pola, które nie są zdefiniowane w DTO; ', ),
        ('forbidNonWhitelisted: true', 'm'),
        (' powoduje, że ich obecność nie tylko jest ignorowana, ale wręcz zwraca błąd — dzięki temu klient nie może podsunąć dodatkowych pól w nadziei, że trafi na nieautoryzowaną właściwość encji (atak typu mass-assignment); ', ),
        ('transform: true', 'm'),
        (' automatycznie przekształca surowy JSON w instancje klas DTO z poprawnymi typami (np. string z ', ),
        ('"123"', 'm'),
        (' staje się liczbą, jeśli pole jest oznaczone ', ),
        ('@IsNumber', 'm'),
        (').', ),
    ])

    add_listing(
        doc,
        listing_no='5.6',
        title='Przykładowy DTO rejestracji z dekoratorami walidacji',
        file_path='backend-api/src/modules/auth/dto/register.dto.ts',
        lines='1–24',
        comment=(
            'Listing 5.6 prezentuje DTO rejestracji. Dekoratory @IsEmail, '
            '@MinLength(8), @IsNotEmpty są deklaratywne — komunikują '
            'czytelnikowi intencje walidacyjne bez konieczności analizowania '
            'kodu walidującego. ValidationPipe wykonuje wszystkie reguły '
            'jednocześnie i zwraca komplet błędów w jednej odpowiedzi 400, '
            'co jest istotne dla ergonomii formularzy w panelu rejestracji.'
        ),
    )

    add_heading(doc, 'Rate limiting — ochrona endpointów uwierzytelniania', level=3)

    add_paragraph(doc, [
        ('Endpointy operacji wrażliwych — rejestracji i logowania — są szczególnie podatne na ataki polegające na automatycznym wysyłaniu wielu żądań w celu zgadnięcia hasła (brute-force) lub zalewania systemu fałszywymi rejestracjami. Ochronę realizuje pakiet ', ),
        ('@nestjs/throttler', 'b'),
        ('. Globalna konfiguracja modułu w ', ),
        ('AppModule', 'm'),
        (' definiuje domyślny limit (10 żądań na 15 minut z jednego adresu IP), a poszczególne endpointy autoryzacyjne są dodatkowo opatrzone dekoratorem ', ),
        ('@Throttle', 'm'),
        (' z bardziej restrykcyjnymi parametrami: rejestracja firmy (najbardziej kosztowna operacja) — ', ),
        ('5 żądań na 60 minut', 'b'),
        (', rejestracja pracownika i ogólna rejestracja — ', ),
        ('5 żądań na 15 minut', 'b'),
        (', logowanie — ', ),
        ('10 żądań na 15 minut', 'b'),
        ('. Po przekroczeniu limitu serwer zwraca status ', ),
        ('429 Too Many Requests', 'm'),
        ('.', ),
    ])

    add_heading(doc, 'Bezpieczna obsługa ciasteczek sesyjnych', level=3)

    add_paragraph(doc, [
        ('Po udanym logowaniu serwer wystawia parę tokenów (dostępu i odświeżania) i zapisuje je w ciasteczkach przeglądarki. Każde z ciasteczek ma trzy krytyczne flagi bezpieczeństwa: ', ),
        ('httpOnly: true', 'b'),
        (' (uniemożliwia odczyt z JavaScriptu, co eliminuje wektor ataku XSS na kradzież tokena), ', ),
        ('secure: true', 'b'),
        (' w środowisku produkcyjnym (ciasteczko jest przesyłane tylko po HTTPS) oraz ', ),
        ('sameSite: \'strict\'', 'b'),
        (' w produkcji (przeglądarka nie wysyła ciasteczek przy żądaniach inicjowanych z innych witryn — ochrona przed CSRF). W środowisku lokalnym, gdzie rozwój odbywa się na HTTP, flagi ', ),
        ('secure', 'm'),
        (' i ', ),
        ('sameSite', 'm'),
        (' są łagodniejsze (', ),
        ('false', 'm'),
        (' i ', ),
        ('lax', 'm'),
        ('), ponieważ inaczej ciasteczka nie działałyby w trybie deweloperskim. Czas życia ciasteczka dostępu wynosi 15 minut, a odświeżania — 7 dni; po wygaśnięciu obu konieczne jest ponowne logowanie.', ),
    ])

    add_listing(
        doc,
        listing_no='5.7',
        title='Konfiguracja ciasteczek sesyjnych z rate limitingiem na endpointach auth',
        file_path='backend-api/src/modules/auth/auth.controller.ts',
        lines='19–74',
        comment=(
            'Listing 5.7 łączy dwa zagadnienia: setAuthCookies pokazuje '
            'pełną konfigurację flag bezpieczeństwa (httpOnly, secure, '
            'sameSite, path, maxAge), a dekoratory @Throttle nad endpointami '
            'register i login ilustrują dobranie limitów per typ operacji. '
            'Funkcja clearAuthCookies stosowana w endpoincie wylogowania '
            'używa identycznych opcji bazowych — przeglądarka usunie '
            'ciasteczko tylko, jeśli atrybuty pasują do tych użytych przy '
            'jego utworzeniu.'
        ),
    )

    add_heading(doc, 'Hashowanie haseł — bcrypt z parametrem 12', level=3)

    add_paragraph(doc, [
        ('Hasła użytkowników nigdy nie są przechowywane w postaci jawnej — przed zapisem do bazy podlegają funkcji skrótu ', ),
        ('bcrypt', 'b'),
        (' z parametrem ', ),
        ('cost factor = 12', 'b'),
        ('. Bcrypt jest funkcją skrótu zaprojektowaną z myślą o haszowaniu haseł — jest celowo ', ),
        ('powolna', 'i'),
        (', dzięki czemu atak słownikowy lub brute-force wymaga znacznych zasobów obliczeniowych. Parametr cost factor określa liczbę iteracji wewnętrznej funkcji (', ),
        ('2¹²', 'm'),
        (' = 4096 iteracji); wybrana wartość 12 jest powszechnie rekomendowana w 2026 roku jako balans między bezpieczeństwem (kosztowne łamanie offline) a użytecznością (czas hashowania ok. 250 ms na typowym serwerze, niezauważalny dla użytkownika). Każdy hash zawiera również losową ', ),
        ('sól', 'i'),
        (' generowaną automatycznie przez bibliotekę, co eliminuje atak rainbow table. Weryfikacja hasła odbywa się przez funkcję ', ),
        ('bcrypt.compare', 'm'),
        (' wykonywaną w stałym czasie (ochrona przed timing attacks).', ),
    ])

    add_heading(doc, 'Ochrona przed wstrzyknięciem SQL — TypeORM Query Builder', level=3)

    add_paragraph(doc, [
        ('Wszystkie zapytania do bazy danych przechodzą przez warstwę abstrakcji ', ),
        ('TypeORM', 'b'),
        (' — zarówno w wariancie repozytoryjnym (', ),
        ('repo.find', 'm'),
        (', ', ),
        ('repo.save', 'm'),
        (', ', ),
        ('repo.delete', 'm'),
        ('), jak i w wariancie ', ),
        ('Query Builder', 'b'),
        (' używanym w bardziej złożonych agregacjach analitycznych. W obu przypadkach wartości pochodzące z żądania są przekazywane jako ', ),
        ('parametry pozycyjne', 'b'),
        (' lub ', ),
        ('parametry nazwane', 'b'),
        (' (np. ', ),
        (':organizationId', 'm'),
        ('), a nie konkatenowane bezpośrednio do tekstu zapytania SQL. Sterownik bazodanowy zapewnia poprawne escapowanie wartości, dzięki czemu wstrzyknięcie złośliwego SQL przez parametr żądania jest niemożliwe. W całym kodzie aplikacji nie występuje żadne miejsce, w którym wartość użytkownika byłaby wpisywana wprost do łańcucha SQL.', ),
    ])

    add_listing(
        doc,
        listing_no='5.8',
        title='Parametryzowane zapytanie TypeORM Query Builder',
        file_path='backend-api/src/modules/analytics/analytics.service.ts',
        lines='363–379',
        comment=(
            'Listing 5.8 prezentuje fragment metody getDepartmentWellbeingLoad. '
            'Wartości organizationId, status, role oraz lista codes są '
            'przekazywane jako parametry nazwane (drugi argument metod where '
            'i andWhere). TypeORM przekształca je w prepared statement na '
            'poziomie sterownika PostgreSQL, eliminując ryzyko wstrzyknięcia '
            'SQL niezależnie od zawartości tych zmiennych.'
        ),
    )

    add_heading(doc, 'Świadome ograniczenia i kierunki dalszego rozwoju', level=3)

    add_paragraph(doc, [
        ('Warstwa bezpieczeństwa eksploatacyjnego w obecnej formie ma trzy świadomie zaakceptowane ograniczenia. ', ),
        ('Brak jawnej konfiguracji trust proxy', 'b'),
        (' — w środowisku Railway żądania trafiają do aplikacji przez warstwę reverse proxy, dzięki czemu wartość ', ),
        ('request.ip', 'm'),
        (' obserwowana w aplikacji odpowiada adresowi proxy, a nie rzeczywistego klienta. Wpływa to na precyzję rate limitingu — limit jest stosowany dla całego ruchu z jednego węzła Railway. Naprawą byłoby dodanie ', ),
        ('app.set(\'trust proxy\', 1)', 'm'),
        (' i odczyt nagłówka ', ),
        ('X-Forwarded-For', 'm'),
        ('. ', ),
        ('Wyłączona Content-Security-Policy', 'b'),
        (' — domyślna konfiguracja Helmet blokowałaby zasoby z domeny frontendu, więc jest tymczasowo wyłączona. Pełna konfiguracja CSP z whitelistą domen frontendu jest planowana jako rozszerzenie. ', ),
        ('Brak globalnego mechanizmu Web Application Firewall', 'b'),
        (' — w środowisku produkcyjnym o większej skali warto rozważyć wdrożenie WAF na poziomie usługi chmurowej (np. Cloudflare) jako dodatkowej warstwy obrony przed atakami warstwy aplikacyjnej.', ),
    ])

    add_heading(doc, 'Podsumowanie warstwy bezpieczeństwa eksploatacyjnego', level=3)

    add_paragraph(doc, [
        ('Bezpieczeństwo eksploatacyjne MoodFlow opiera się na siedmiu komplementarnych mechanizmach: walidacji konfiguracji środowiska z zasadą fail-fast, nagłówkach bezpieczeństwa generowanych przez Helmet, polityce CORS opartej na whiteliście originów, deklaratywnej walidacji danych wejściowych z opcją ', ),
        ('forbidNonWhitelisted', 'm'),
        (' eliminującą atak mass-assignment, ograniczeniu częstotliwości żądań na endpointach uwierzytelniania (5 prób rejestracji firmy na godzinę, 10 prób logowania na 15 minut), bezpiecznej obsłudze ciasteczek sesyjnych z flagami ', ),
        ('httpOnly', 'm'),
        (' + ', ),
        ('secure', 'm'),
        (' + ', ),
        ('sameSite', 'm'),
        (', haszowaniu haseł funkcją bcrypt z parametrem cost factor 12 oraz parametryzowanych zapytaniach SQL przez warstwę TypeORM. Każdy z mechanizmów został wdrożony deklaratywnie — obowiązuje w całej aplikacji bez konieczności ręcznego włączania w poszczególnych endpointach. Trzy świadomie zaakceptowane ograniczenia (brak trust proxy, wyłączona CSP, brak WAF) zostały opisane jako kierunki dalszego rozwoju i wynikają ze skali projektu inżynierskiego.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/5.4-Bezpieczenstwo-eksploatacyjne.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
