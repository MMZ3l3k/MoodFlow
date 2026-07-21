#!/usr/bin/env python3
"""4.2. Backend — warstwa serwerowa (NestJS) — DOCX zgodny z formatem CDV."""

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


def add_listing_placeholder(doc, *, listing_no, title, file_path, lines, comment):
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

    add_heading(doc, '4.2. Backend — warstwa serwerowa (NestJS)', size=12)

    add_paragraph(doc, [
        ('Warstwa serwerowa aplikacji MoodFlow została zbudowana w oparciu o framework ', ),
        ('NestJS 11', 'b'),
        (' działający na platformie Node.js 20. NestJS jest frameworkiem zbudowanym wokół wzorca dependency injection oraz modułowej organizacji kodu, dzięki czemu cała logika serwerowa jest podzielona na mniejsze, niezależne moduły. Każdy moduł odpowiada za jeden obszar dziedzinowy aplikacji (na przykład uwierzytelnianie, użytkownicy, testy psychologiczne, analityka), a komunikacja między modułami odbywa się przez jasno zdefiniowane interfejsy.', ),
    ])

    add_paragraph(doc, [
        ('Jako język implementacji wybrano ', ),
        ('TypeScript', 'b'),
        (' w trybie ścisłym (', ),
        ('strict mode', 'i'),
        ('). Pozwala on wychwycić wiele błędów już na etapie kompilacji, jeszcze zanim aplikacja zostanie uruchomiona. Dodatkowo TypeScript świetnie integruje się z dekoratorami NestJS, dzięki którym kod kontrolerów i serwisów jest zwięzły i czytelny. Komunikacja z bazą danych odbywa się przez bibliotekę ', ),
        ('TypeORM', 'b'),
        (', która mapuje klasy TypeScript na tabele PostgreSQL.', ),
    ])

    add_heading(doc, 'Modułowa struktura aplikacji', level=3)

    add_paragraph(doc, [
        ('Wszystkie moduły aplikacji są ładowane w jednym, centralnym pliku ', ),
        ('app.module.ts', 'm'),
        (', który stanowi punkt wejścia całej warstwy serwerowej. To w nim NestJS jest informowany, jakie moduły mają być uruchomione, jak skonfigurować bazę danych, jak skonfigurować wysyłkę e-maili oraz jakie globalne ograniczenia liczby żądań mają być zastosowane. Każdy z modułów aplikacyjnych — ', ),
        ('AuthModule', 'm'),
        (', ', ),
        ('UsersModule', 'm'),
        (', ', ),
        ('AssessmentsModule', 'm'),
        (', ', ),
        ('ResponsesModule', 'm'),
        (', ', ),
        ('ResultsModule', 'm'),
        (', ', ),
        ('AnalyticsModule', 'm'),
        (', ', ),
        ('AdminModule', 'm'),
        (', ', ),
        ('NotificationsModule', 'm'),
        (', ', ),
        ('OrganizationsModule', 'm'),
        (', ', ),
        ('DepartmentsModule', 'm'),
        (', ', ),
        ('AuditModule', 'm'),
        (' oraz ', ),
        ('HealthModule', 'm'),
        (' — opisuje jeden, wąsko zdefiniowany fragment funkcjonalności. Taki podział ułatwia utrzymanie kodu, testowanie oraz pracę zespołową, ponieważ pojedynczy autor może rozwijać dany moduł bez ryzyka, że nadpisze zmiany kolegi pracującego nad innym obszarem.', ),
    ])

    add_listing_placeholder(
        doc,
        listing_no='4.4',
        title='Główny moduł aplikacji backendu (AppModule)',
        file_path='backend-api/src/app.module.ts',
        lines='1–93',
        comment=(
            'Listing 4.4 prezentuje konfigurację głównego modułu aplikacji. '
            'Widać w nim trzy istotne elementy: konfigurację globalnego limitu '
            'żądań (ThrottlerModule — 10 żądań na 15 minut), asynchroniczną '
            'konfigurację serwera SMTP do wysyłki powiadomień e-mail oraz '
            'konfigurację połączenia z PostgreSQL przez TypeORM. Listę '
            'modułów aplikacyjnych umieszczono w sekcji imports, dzięki czemu '
            'całe dorzucanie nowych modułów do aplikacji ogranicza się do '
            'dopisania jednej linii.'
        ),
    )

    add_heading(doc, 'Bezpieczne uruchamianie aplikacji (fail-fast)', level=3)

    add_paragraph(doc, [
        ('Punktem wejścia całej warstwy serwerowej jest plik ', ),
        ('main.ts', 'm'),
        ('. Zanim NestJS zacznie nasłuchiwać na żądaniach HTTP, wykonywana jest funkcja ', ),
        ('validateEnv()', 'm'),
        ('. Sprawdza ona, czy w zmiennych środowiskowych ustawiono wszystkie wymagane wartości — adres bazy danych, dane logowania, dwa sekrety JWT — a także czy sekrety są wystarczająco silne (co najmniej 32 znaki, brak typowych słów takich jak ', ),
        ('password', 'm'),
        (' czy ', ),
        ('secret', 'm'),
        (') i czy nie są identyczne. Jeśli któryś warunek nie jest spełniony, aplikacja w ogóle nie startuje, tylko od razu kończy działanie z czytelnym komunikatem błędu. Jest to tak zwane podejście ', ),
        ('fail-fast', 'b'),
        (' — lepiej, żeby aplikacja nie wystartowała wcale, niż żeby działała z niebezpiecznym sekretem.', ),
    ])

    add_listing_placeholder(
        doc,
        listing_no='4.5',
        title='Walidacja zmiennych środowiskowych (fail-fast)',
        file_path='backend-api/src/main.ts',
        lines='10–30',
        comment=(
            'W Listingu 4.5 zdefiniowano listę wymaganych zmiennych REQUIRED_ENV '
            'oraz funkcję validateEnv(). Sprawdzane jest istnienie zmiennych, '
            'minimalna długość sekretów (32 znaki), brak typowych słabych słów '
            'oraz różność dwóch sekretów JWT. Każde naruszenie tych zasad '
            'prowadzi do natychmiastowego wyrzucenia wyjątku i przerwania '
            'startu aplikacji.'
        ),
    )

    add_heading(doc, 'Zabezpieczenia HTTP (helmet, CORS, ciasteczka, walidacja)', level=3)

    add_paragraph(doc, [
        ('Bezpośrednio po utworzeniu instancji aplikacji NestJS w funkcji ', ),
        ('bootstrap()', 'm'),
        (' rejestrowanych jest kilka warstw zabezpieczeń. Biblioteka ', ),
        ('helmet', 'b'),
        (' dodaje do każdej odpowiedzi HTTP zestaw nagłówków bezpieczeństwa, które utrudniają przeprowadzenie ataków typu ', ),
        ('clickjacking', 'i'),
        (', ', ),
        ('XSS', 'i'),
        (' czy ', ),
        ('MIME sniffing', 'i'),
        ('. Biblioteka ', ),
        ('cookie-parser', 'b'),
        (' pozwala czytać zawartość ciasteczek HttpOnly, w których przechowywane są tokeny JWT (omówione szerzej w podrozdziale 4.3). ', ),
        ('ValidationPipe', 'b'),
        (' automatycznie waliduje wszystkie dane wejściowe (DTO) wysyłane do kontrolerów — odrzuca pola, które nie zostały zadeklarowane w schemacie (', ),
        ('whitelist', 'i'),
        (') oraz przekształca surowe dane w obiekty TypeScript (', ),
        ('transform', 'i'),
        ('). Dzięki temu kontrolery zawsze otrzymują dane już zwalidowane.', ),
    ])

    add_paragraph(doc, [
        ('Polityka ', ),
        ('CORS', 'b'),
        (' (Cross-Origin Resource Sharing) określa, z jakich domen przeglądarka może wysyłać zapytania do API. Lista dozwolonych domen pobierana jest ze zmiennej środowiskowej ', ),
        ('CORS_ORIGIN', 'm'),
        (' i — co istotne — jeśli zmienna nie jest ustawiona, aplikacja w ogóle nie wystartuje. Ustawienie ', ),
        ('credentials: true', 'm'),
        (' zezwala przeglądarce na dołączanie ciasteczek z tokenami uwierzytelniającymi do każdego zapytania.', ),
    ])

    add_listing_placeholder(
        doc,
        listing_no='4.6',
        title='Konfiguracja zabezpieczeń HTTP w funkcji bootstrap()',
        file_path='backend-api/src/main.ts',
        lines='32–66',
        comment=(
            'Listing 4.6 prezentuje rejestrację helmeta, parsera ciasteczek, '
            'globalnego pipeline\'u walidacji oraz konfigurację CORS. '
            'Aplikacja nasłuchuje na adresie 0.0.0.0 (a nie tylko localhost), '
            'co jest konieczne do prawidłowego działania w kontenerze Docker '
            'oraz na platformie Railway.'
        ),
    )

    add_heading(doc, 'Globalne ograniczenie liczby żądań (rate limiting)', level=3)

    add_paragraph(doc, [
        ('W ramach modułu głównego skonfigurowano również ', ),
        ('ThrottlerModule', 'b'),
        (' — mechanizm ograniczania liczby żądań trafiających do aplikacji z jednego adresu IP. Domyślnie pozwala on na ', ),
        ('10 żądań w ciągu 15 minut', 'b'),
        (', co skutecznie spowalnia próby zgadywania haseł (', ),
        ('brute force', 'i'),
        (') na endpointcie logowania. Po przekroczeniu limitu serwer zwraca błąd HTTP 429 (', ),
        ('Too Many Requests', 'i'),
        (') aż do końca okna czasowego.', ),
    ])

    add_heading(doc, 'Połączenie z bazą danych (TypeORM + PostgreSQL)', level=3)

    add_paragraph(doc, [
        ('Połączenie z bazą danych jest tworzone asynchronicznie przez ', ),
        ('TypeOrmModule.forRootAsync', 'm'),
        (', co pozwala odczytać parametry połączenia (host, port, użytkownik, hasło, nazwa bazy) z konfiguracji środowiskowej dopiero po jej pełnym załadowaniu. Wszystkie encje aplikacji (User, Organization, Department, Assessment, Question, AnswerOption, AssessmentResult, UserResponse, AssessmentAssignment, AuditLog, Notification) są jawnie wymienione w polu ', ),
        ('entities', 'm'),
        (', dzięki czemu TypeORM wie, jakie tabele ma utworzyć i jak je powiązać.', ),
    ])

    add_paragraph(doc, [
        ('Ustawienie ', ),
        ('synchronize: true', 'm'),
        (' powoduje, że schemat bazy danych jest automatycznie generowany z definicji encji TypeScript przy każdym starcie aplikacji. Dla potrzeb pracy inżynierskiej i wdrożenia na platformę Railway było to rozwiązanie najprostsze i najbardziej niezawodne — eliminuje problem ze stanem migracji w nowo utworzonej bazie chmurowej. W wersji aplikacji przeznaczonej do długoterminowej eksploatacji przemysłowej miejsce automatycznej synchronizacji powinny zająć kontrolowane skrypty migracyjne TypeORM. Decyzję tę świadomie udokumentowano w komentarzu wewnątrz pliku ', ),
        ('app.module.ts', 'm'),
        ('.', ),
    ])

    add_heading(doc, 'Folder common — elementy współdzielone', level=3)

    add_paragraph(doc, [
        ('Część kodu jest wykorzystywana przez wiele modułów jednocześnie — na przykład dekoratory ról, dekorator pobierający aktualnego użytkownika z żądania, strażnicy uprawnień (', ),
        ('guards', 'i'),
        (') oraz wspólne wyliczenia (', ),
        ('enums', 'i'),
        (') typu role użytkownika. Tego rodzaju kod znajduje się w katalogu ', ),
        ('backend-api/src/common/', 'm'),
        (', co eliminuje duplikację i pozwala wprowadzać zmiany w jednym miejscu. Konkretne elementy tego folderu — w szczególności guard ', ),
        ('JwtAuthGuard', 'm'),
        (', guard ', ),
        ('RolesGuard', 'm'),
        (' oraz dekorator ', ),
        ('@Roles()', 'm'),
        (' — zostaną szczegółowo omówione w podrozdziale 4.3 dotyczącym bezpieczeństwa.', ),
    ])

    add_heading(doc, 'Uzasadnienie wyboru NestJS', level=3)

    add_paragraph(doc, [
        ('Na etapie projektowania aplikacji rozważano trzy alternatywy dla warstwy serwerowej: ', ),
        ('Express.js', 'i'),
        (' (lekki, ale wymagający ręcznego budowania całej struktury aplikacji), ', ),
        ('Fastify', 'i'),
        (' (szybszy, ale słabiej udokumentowany w polskiej społeczności) oraz właśnie ', ),
        ('NestJS', 'b'),
        ('. Decyzja padła na NestJS z trzech powodów. Po pierwsze, narzuca on jasną, modułową strukturę projektu, co jest zgodne z dobrymi praktykami inżynierii oprogramowania i ułatwia opisanie kodu w pracy inżynierskiej. Po drugie, oferuje wbudowane mechanizmy walidacji DTO, dependency injection oraz integrację z TypeORM, dzięki czemu nie trzeba samodzielnie pisać tych warstw od zera. Po trzecie, NestJS jest popularnym wyborem w środowiskach komercyjnych — umiejętność jego stosowania ma realną wartość rynkową dla autora pracy.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.2-Backend-warstwa-serwerowa.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
