#!/usr/bin/env python3
"""6.2. Wdrożenie produkcyjne na Railway — DOCX zgodny z formatem CDV."""

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


def add_command_box(doc, command):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(4)
    pf.space_after = Pt(8)
    pf.left_indent = Cm(0.6)
    r = p.add_run(command)
    set_run(r, mono=True, size=9)


def add_screenshot_placeholder(doc, *, fig_no, screenshot_type, caption):
    box = doc.add_paragraph()
    box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = box.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(8)
    pf.space_after = Pt(2)
    r = box.add_run(f'[ TUTAJ WSTAW ZRZUT EKRANU — {screenshot_type} — Rysunek {fig_no} ]')
    set_run(r, bold=True, italic=True)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = cap.paragraph_format
    pf.line_spacing = 1.15
    pf.space_before = Pt(2)
    pf.space_after = Pt(8)
    r = cap.add_run(f'Rysunek {fig_no}. {caption} (źródło: opracowanie własne)')
    set_run(r, italic=True)


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

    add_heading(doc, '6.2. Wdrożenie produkcyjne na platformie Railway', size=12)

    add_paragraph(doc, [
        ('Środowisko produkcyjne MoodFlow zostało uruchomione na platformie chmurowej ', ),
        ('Railway', 'b'),
        (' (railway.app) — usłudze typu ', ),
        ('Platform-as-a-Service', 'i'),
        (', specjalizującej się w hostingu aplikacji konteneryzowanych. Wybór Railway zamiast popularniejszych alternatyw (AWS, Google Cloud, Heroku, Render) wynika z trzech względów dopasowanych do skali pracy inżynierskiej. ', ),
        ('Po pierwsze', 'b'),
        (', Railway zapewnia natywne wsparcie dla Dockera — wystarczy wskazać plik ', ),
        ('Dockerfile', 'm'),
        (', a platforma sama zbuduje obraz, uruchomi kontener i podłączy do load balancera z certyfikatem TLS od Let’s Encrypt. ', ),
        ('Po drugie', 'b'),
        (', oferuje zarządzaną bazę PostgreSQL z automatycznymi snapshotami i prostym mechanizmem przyznawania zmiennych środowiskowych zawierających dane połączenia. ', ),
        ('Po trzecie', 'b'),
        (', ma model rozliczeniowy odpowiedni dla projektów o niewielkim ruchu (plan startowy obejmuje wystarczające zasoby do uruchomienia całej aplikacji wraz z bazą).', ),
    ])

    add_heading(doc, 'Architektura wdrożenia produkcyjnego', level=3)

    add_paragraph(doc, [
        ('W środowisku produkcyjnym aplikacja składa się z czterech niezależnych usług działających w jednym projekcie Railway. ', ),
        ('Backend API', 'b'),
        (' (NestJS) jest dostępny pod adresem ', ),
        ('moodflow-production.up.railway.app', 'm'),
        ('. ', ),
        ('Aplikacja pracownika', 'b'),
        (' (React + Vite, serwowana przez nginx) działa pod osobnym poddomeną platformy. ', ),
        ('Panel administracyjny', 'b'),
        (' (Next.js) jest hostowany pod kolejną poddomeną. Czwartą usługą jest ', ),
        ('PostgreSQL 16', 'b'),
        (' — baza zarządzana w pełni przez Railway, dostępna dla backendu wyłącznie z wewnętrznej sieci projektu (zamknięta dla połączeń z internetu). Każda usługa ma własne, niezależne wdrożenie i może być skalowana lub aktualizowana niezależnie od pozostałych.', ),
    ])

    add_heading(doc, 'Różnice między środowiskiem lokalnym a produkcyjnym', level=3)

    add_paragraph(doc, [
        ('Środowisko lokalne i produkcyjne korzystają z dwóch różnych plików Compose. Plik ', ),
        ('docker-compose.yml', 'm'),
        (' (omówiony w rozdziale 6.1) jest zoptymalizowany pod rozwój: zawiera serwis Adminer do wglądu w bazę, używa hot-reload (', ),
        ('npm run start:dev', 'm'),
        (', ', ),
        ('npm run dev', 'm'),
        ('), montuje katalogi źródłowe jako wolumeny i zezwala na zewnętrzny dostęp do bazy. Plik ', ),
        ('docker-compose.prod.yml', 'm'),
        (' realizuje cztery istotne zaostrzenia. ', ),
        ('Adminer', 'b'),
        (' nie jest uruchamiany — w produkcji nie wystawia się narzędzi administracyjnych do przeglądania bazy z poziomu przeglądarki. ', ),
        ('Brak bind-mountów', 'b'),
        (' — kontenery uruchamiają zbudowany kod, a nie podpięte katalogi z hosta. ', ),
        ('Healthchecki', 'b'),
        (' są aktywne na wszystkich trzech aplikacjach (backend, dwa frontendy) — sprawdzanie zdrowia co 30 sekund umożliwia automatyczny restart przy awarii. ', ),
        ('PostgreSQL nie jest wystawiony na zewnątrz', 'b'),
        (' — używa dyrektywy ', ),
        ('expose', 'm'),
        (' (port widoczny tylko w sieci Compose) zamiast ', ),
        ('ports', 'm'),
        (' (port mapowany na host).', ),
    ])

    add_listing(
        doc,
        listing_no='6.4',
        title='Plik docker-compose.prod.yml z zaostrzeniami produkcyjnymi',
        file_path='docker-compose.prod.yml',
        lines='1–93',
        comment=(
            'Listing 6.4 prezentuje pełny plik produkcyjny. Notacja '
            '${VAR:?komunikat} jest stosowana dla wszystkich krytycznych '
            'zmiennych — w produkcji żadna z nich nie ma fallbacku. Brak '
            'fallbacku dla CORS_ORIGIN, NEXT_PUBLIC_API_URL, MAIL_USER i '
            'MAIL_PASS jest świadomy: te wartości w produkcji są zawsze '
            'inne niż w trybie deweloperskim, a wartości domyślne mogłyby '
            'doprowadzić do błędnej konfiguracji.'
        ),
    )

    add_heading(doc, 'Konfiguracja platformy Railway', level=3)

    add_paragraph(doc, [
        ('Każda z trzech usług aplikacyjnych (backend, client-frontend, admin-frontend) ma własny plik ', ),
        ('railway.json', 'm'),
        (' w katalogu odpowiedniego serwisu. Plik ten określa metodę budowania (', ),
        ('builder: DOCKERFILE', 'm'),
        ('), ścieżkę do pliku Dockerfile oraz politykę restartu (', ),
        ('restartPolicyType: ON_FAILURE', 'm'),
        (', maksymalnie ', ),
        ('3 próby', 'm'),
        ('). Wybór wskazania na Dockerfile zamiast wykorzystania wbudowanego mechanizmu Nixpacks (auto-detekcji języka) jest decyzją o pełnej kontroli nad obrazem produkcyjnym — ten sam Dockerfile używany lokalnie buduje identyczny obraz na Railway, eliminując rozbieżności między środowiskami. Pozostałe parametry (port, zmienne środowiskowe, podłączenie do bazy) są konfigurowane z poziomu interfejsu webowego Railway lub przez Railway CLI.', ),
    ])

    add_listing(
        doc,
        listing_no='6.5',
        title='Konfiguracja Railway dla serwisu backend',
        file_path='backend-api/railway.json',
        lines='1–11',
        comment=(
            'Listing 6.5 pokazuje minimalistyczną konfigurację Railway. '
            'Pole $schema umożliwia walidację składni przez edytor IDE. '
            'restartPolicyType ON_FAILURE z limitem 3 prób chroni przed '
            'pętlą restartów w przypadku trwałego błędu konfiguracji '
            '(np. niewłaściwe sekrety) — po trzech próbach Railway oznaczy '
            'wdrożenie jako nieudane i zachowa poprzednią działającą wersję.'
        ),
    )

    add_heading(doc, 'Procedura pierwszego wdrożenia', level=3)

    add_paragraph(doc, [
        ('Wdrożenie produkcyjne wymaga sześciu jednorazowych kroków konfiguracyjnych. ', ),
        ('Krok pierwszy', 'b'),
        (' — wygenerowanie silnych sekretów aplikacyjnych. Każdy z trzech sekretów (dwa JWT plus hasło bazy) musi być losowy, mieć co najmniej 32 znaki i być różny od pozostałych:', ),
    ])
    add_command_box(doc,
        'node -e "console.log(\'JWT_SECRET=\' + require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n'
        'node -e "console.log(\'JWT_REFRESH_SECRET=\' + require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n'
        'node -e "console.log(\'DB_PASSWORD=\' + require(\'crypto\').randomBytes(24).toString(\'base64\'))"'
    )

    add_paragraph(doc, [
        ('Krok drugi', 'b'),
        (' — utworzenie projektu na Railway i podłączenie repozytorium GitHub. Każdy z trzech serwisów (backend, client-frontend, admin-frontend) tworzony jest jako osobna „usługa" wskazująca na ten sam repozytorium ale z różnym katalogiem głównym (', ),
        ('Root Directory', 'm'),
        ('). Jako czwartą usługę dodaje się ', ),
        ('PostgreSQL', 'm'),
        (' z gotowego szablonu Railway — platforma automatycznie udostępnia zmienne ', ),
        ('PGHOST', 'm'),
        (', ', ),
        ('PGPORT', 'm'),
        (', ', ),
        ('PGUSER', 'm'),
        (', ', ),
        ('PGPASSWORD', 'm'),
        (', ', ),
        ('PGDATABASE', 'm'),
        (' w sieci wewnętrznej projektu. ', ),
        ('Krok trzeci', 'b'),
        (' — przepisanie zmiennych: w sekcji Variables każdej usługi należy ustawić wszystkie zmienne wymienione w pliku ', ),
        ('.env.example', 'm'),
        (' z odpowiednimi wartościami produkcyjnymi.', ),
    ])

    add_paragraph(doc, [
        ('Krok czwarty', 'b'),
        (' — uruchomienie migracji TypeORM. Przy pierwszym wdrożeniu schemat bazy jest pusty; wykonanie migracji odbywa się przez funkcję „Run a one-off command" w panelu Railway lub przez CLI:', ),
    ])
    add_command_box(doc, 'railway run --service backend-api npm run migration:run')

    add_paragraph(doc, [
        ('W kolejnych deployach migracje są uruchamiane automatycznie dzięki opcji ', ),
        ('migrationsRun: true', 'm'),
        (' w konfiguracji TypeORM aktywowanej przy ', ),
        ('NODE_ENV=production', 'm'),
        ('. ', ),
        ('Krok piąty', 'b'),
        (' — konfiguracja domen niestandardowych. W panelu każdej usługi w sekcji Settings → Networking należy dodać ', ),
        ('Custom Domain', 'i'),
        (' (np. ', ),
        ('api.moodflow.pl', 'm'),
        (', ', ),
        ('app.moodflow.pl', 'm'),
        (', ', ),
        ('panel.moodflow.pl', 'm'),
        (') i utworzyć rekordy CNAME w panelu DNS dostawcy domeny. Railway automatycznie wystawia certyfikat TLS od Let’s Encrypt po weryfikacji własności domeny — proces zajmuje od kilku minut do godziny. ', ),
        ('Krok szósty', 'b'),
        (' — pierwsze logowanie przy użyciu domyślnego konta super-administratora (', ),
        ('owner@moodflow.pl', 'm'),
        (' / ', ),
        ('SuperAdmin1!', 'm'),
        (') i bezzwłoczna zmiana hasła w panelu ustawień.', ),
    ])

    add_screenshot_placeholder(
        doc,
        fig_no='6.1',
        screenshot_type='ZRZUT EKRANU INTERFEJSU PLATFORMY',
        caption='Panel projektu Railway z czterema usługami (backend, client, admin, postgres) i ich statusem',
    )

    add_heading(doc, 'Monitoring i obserwowalność', level=3)

    add_paragraph(doc, [
        ('Po wdrożeniu kondycja systemu jest monitorowana na trzech poziomach. ', ),
        ('Endpoint /health', 'b'),
        (' backendu zwraca strukturę JSON ze statusem aplikacji oraz wynikiem testu połączenia z bazą; jest sprawdzany przez Railway co 30 sekund, a ponadto może być wykorzystany przez zewnętrzne narzędzia uptime monitoring (UptimeRobot, Better Stack). ', ),
        ('Logi aplikacji', 'b'),
        (' są dostępne na żywo w panelu Railway lub przez ', ),
        ('railway logs', 'm'),
        (' — zawierają zarówno wpisy z systemu logowania NestJS (', ),
        ('Logger', 'm'),
        (', poziomy debug/log/warn/error), jak i logi systemowe kontenera (start, restart, OOM). ', ),
        ('Tabela audit_logs', 'b'),
        (' zawiera ślad operacji administracyjnych (zatwierdzenia kont, zmiany ról, usunięcia kont, błędne logowania) — można ją przeglądać przez endpoint ', ),
        ('GET /audit', 'm'),
        (' dostępny dla użytkowników o roli ADMIN lub SUPER_ADMIN.', ),
    ])

    add_heading(doc, 'Aktualizacja aplikacji i mechanizm rollback', level=3)

    add_paragraph(doc, [
        ('Aktualizacja kodu odbywa się w modelu ', ),
        ('continuous deployment', 'b'),
        (' — Railway śledzi wybrany branch repozytorium (zwykle ', ),
        ('master', 'm'),
        (') i automatycznie buduje oraz wdraża nową wersję po każdym zaakceptowanym ', ),
        ('git push', 'm'),
        (' lub merge pull requesta. Cały proces zajmuje od 2 do 5 minut. W trakcie wdrożenia Railway uruchamia nowy kontener w tle, czeka na pozytywny wynik healthcheck, a dopiero potem przekierowuje ruch i wyłącza poprzedni — w wyniku tego aktualizacja jest praktycznie ', ),
        ('zero-downtime', 'i'),
        ('. W razie wykrycia błędu po wdrożeniu możliwy jest natychmiastowy ', ),
        ('rollback', 'b'),
        (' przez panel Railway — wystarczy w zakładce „Deployments" wybrać poprzednie udane wdrożenie i kliknąć „Redeploy". W razie zmiany schematu bazy konieczne może być cofnięcie również ostatniej migracji:', ),
    ])
    add_command_box(doc, 'railway run --service backend-api npm run migration:revert')

    add_heading(doc, 'Lista kontrolna bezpieczeństwa po wdrożeniu', level=3)

    add_paragraph(doc, [
        ('Po pomyślnym wdrożeniu należy zweryfikować siedem punktów listy kontrolnej bezpieczeństwa. ', ),
        ('Wymuszenie HTTPS', 'i'),
        (' — wszystkie połączenia HTTP powinny być przekierowane na HTTPS (Railway robi to domyślnie); dodatkowo Helmet ustawia nagłówek ', ),
        ('Strict-Transport-Security', 'm'),
        ('. ', ),
        ('Bezpieczeństwo ciasteczek', 'i'),
        (' — w produkcji ciasteczka ', ),
        ('mf_access', 'm'),
        (' i ', ),
        ('mf_refresh', 'm'),
        (' muszą mieć flagi ', ),
        ('Secure', 'm'),
        (' i ', ),
        ('SameSite=Strict', 'm'),
        (' (warunek aktywny przy ', ),
        ('NODE_ENV=production', 'm'),
        ('). ', ),
        ('Sprawność healthchecka', 'i'),
        (' — endpoint ', ),
        ('/health', 'm'),
        (' powinien zwracać 200 OK. ', ),
        ('Działanie rate limitingu', 'i'),
        (' — endpoint ', ),
        ('/auth/login', 'm'),
        (' powinien zwracać status 429 po przekroczeniu 10 żądań w ciągu 15 minut z jednego adresu IP. ', ),
        ('Niedostępność bazy z internetu', 'i'),
        (' — próba bezpośredniego połączenia z PostgreSQL z hosta zewnętrznego musi zostać odrzucona przez sieć Railway. ', ),
        ('Whitelist CORS', 'i'),
        (' — zmienna ', ),
        ('CORS_ORIGIN', 'm'),
        (' nie powinna zawierać adresów ', ),
        ('localhost', 'm'),
        ('. ', ),
        ('Brak Adminera', 'i'),
        (' — usługa Adminer nie jest częścią ', ),
        ('docker-compose.prod.yml', 'm'),
        (' i nie powinna być dostępna w produkcji.', ),
    ])

    add_heading(doc, 'Świadome ograniczenia środowiska Railway', level=3)

    add_paragraph(doc, [
        ('Wybór Railway niesie świadomie zaakceptowane ograniczenia odpowiednie do skali pracy inżynierskiej. ', ),
        ('Brak natywnej wysokiej dostępności', 'b'),
        (' — pojedyncza instancja każdej usługi oznacza, że awaria węzła Railway powoduje krótkotrwałą niedostępność (zwykle minuty); rozwiązaniem byłoby uruchomienie wielu replik za load balancerem, dostępne w wyższych planach. ', ),
        ('Blokada portu SMTP 587', 'b'),
        (' w niskich planach — co spowodowało, że wysyłka e-mail została zaprojektowana w trybie ', ),
        ('best effort', 'i'),
        (' (omówione w rozdziale 4.9), a głównym kanałem powiadomień są notyfikacje in-app. ', ),
        ('Zależność od jednego dostawcy chmury', 'b'),
        (' — migracja do innej platformy wymagałaby ponownej konfiguracji domen, sekretów i wdrożenia, ale dzięki konteneryzacji sam kod aplikacji jest przenośny. Wszystkie te ograniczenia są opisane jako naturalne kierunki dalszego rozwoju projektu w środowisku produkcyjnym o większej skali.', ),
    ])

    add_heading(doc, 'Podsumowanie wdrożenia produkcyjnego', level=3)

    add_paragraph(doc, [
        ('Wdrożenie MoodFlow na platformie Railway łączy konteneryzację (multi-stage Dockerfiles, identyczne obrazy w środowisku lokalnym i produkcyjnym) z zarządzaniem PaaS (automatyczny build, TLS od Let’s Encrypt, snapshoty bazy, continuous deployment z każdym pushem do brancha master). Konfiguracja per usługa znajduje się w jawnych plikach ', ),
        ('railway.json', 'm'),
        (' znajdujących się w repozytorium, dzięki czemu cały opis środowiska jest wersjonowany razem z kodem. Procedura pierwszego wdrożenia (sześć kroków od wygenerowania sekretów po zmianę hasła super-administratora) jest udokumentowana w pliku ', ),
        ('docs/deployment.md', 'm'),
        (' i może być powtórzona przez nową osobę zarządzającą systemem. Mechanizm continuous deployment z healthcheckami zapewnia praktycznie zero-downtime aktualizacje, a wbudowany rollback Railway umożliwia natychmiastowe cofnięcie wadliwego wdrożenia jednym kliknięciem.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/6.2-Wdrozenie-Railway.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
