#!/usr/bin/env python3
"""4.5. Frontend pracownika — React, Vite, Redux Toolkit, PWA — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '4.5. Frontend pracownika — aplikacja React z Vite i Redux Toolkit', size=12)

    add_paragraph(doc, [
        ('Aplikacja pracownika została wydzielona jako odrębny projekt frontendowy ', ),
        ('client-frontend', 'm'),
        (', niezależny od panelu administracyjnego i od backendu. Decyzja o rozdziale na dwie aplikacje frontendowe wynika z różnicy ról i potrzeb użytkowników: pracownik korzysta z aplikacji najczęściej z urządzenia mobilnego, w trakcie krótkich sesji (wypełnienie codziennego nastroju, ukończenie testu psychologicznego, podgląd wyniku), natomiast administrator i dział HR pracują z desktopa, z bardziej rozbudowanymi widokami analitycznymi. Łączenie obu interfejsów w jedną aplikację prowadziłoby do nadmiarowych zależności, większego rozmiaru paczki produkcyjnej oraz trudniejszej kontroli uprawnień na poziomie routingu. Osobny projekt umożliwia także niezależne wdrożenia i niezależną optymalizację bundle’a.', ),
    ])

    add_heading(doc, 'Stos technologiczny i organizacja kodu', level=3)

    add_paragraph(doc, [
        ('Aplikacja została zbudowana w oparciu o ', ),
        ('React', 'b'),
        (' (biblioteka komponentowa do budowy interfejsów użytkownika) i ', ),
        ('TypeScript', 'b'),
        (' (statyczny system typów eliminujący znaczną część błędów na etapie kompilacji). Środowisko deweloperskie i bundler zapewnia ', ),
        ('Vite', 'b'),
        (' — narzędzie wybrane zamiast Create React App ze względu na natywne wykorzystanie modułów ECMAScript w trybie deweloperskim, błyskawiczny start serwera oraz znacząco szybszy hot module replacement. Zarządzanie globalnym stanem aplikacji (sesja użytkownika, tokeny) realizuje ', ),
        ('Redux Toolkit', 'b'),
        (', a routing i nawigacja oparte są na bibliotece ', ),
        ('React Router', 'b'),
        (' w wariancie deklaratywnym z konfiguracją tras zagnieżdżonych. Komunikacja z REST API odbywa się przez klienta ', ),
        ('axios', 'b'),
        (' z dedykowanymi interceptorami żądań i odpowiedzi, a stylowanie warstwy wizualnej zapewnia ', ),
        ('Tailwind CSS', 'b'),
        ('.', ),
    ])

    add_paragraph(doc, [
        ('Struktura katalogów odzwierciedla podział odpowiedzialności na warstwy. W katalogu ', ),
        ('pages/', 'm'),
        (' znajdują się komponenty pełnoekranowe odpowiadające poszczególnym trasom (', ),
        ('HomePage', 'm'),
        (', ', ),
        ('TestsPage', 'm'),
        (', ', ),
        ('ResultsPage', 'm'),
        (', ', ),
        ('SettingsPage', 'm'),
        (', ', ),
        ('LoginPage', 'm'),
        (', ', ),
        ('RegisterPage', 'm'),
        (', ', ),
        ('TakeAssessmentPage', 'm'),
        ('). Katalog ', ),
        ('components/', 'm'),
        (' grupuje komponenty wielokrotnego użytku — układ aplikacji (', ),
        ('AppLayout', 'm'),
        ('), strażnika tras (', ),
        ('ProtectedRoute', 'm'),
        ('), banner aktualizacji wersji PWA (', ),
        ('PwaUpdatePrompt', 'm'),
        (') oraz mniejsze elementy interfejsu. W katalogu ', ),
        ('store/', 'm'),
        (' znajduje się konfiguracja Redux Toolkit wraz z plasterkami stanu (ang. ', ),
        ('slices', 'i'),
        ('), w ', ),
        ('api/', 'm'),
        (' — pojedynczy klient HTTP, w ', ),
        ('hooks/', 'm'),
        (' — niestandardowe hooki Reacta, a w ', ),
        ('types/', 'm'),
        (' — definicje typów współdzielone między warstwami. Taki układ jest płaski i przewidywalny, co ułatwia utrzymanie projektu w skali pracy inżynierskiej.', ),
    ])

    add_heading(doc, 'Routing i ochrona tras', level=3)

    add_paragraph(doc, [
        ('Konfiguracja routingu została zrealizowana deklaratywnie w komponencie ', ),
        ('App', 'm'),
        ('. Trasy publiczne (', ),
        ('/login', 'm'),
        (' i ', ),
        ('/register', 'm'),
        (') są dostępne bez logowania, natomiast wszystkie trasy aplikacyjne znajdują się pod prefiksem ', ),
        ('/app', 'm'),
        (' i są opakowane komponentem ', ),
        ('ProtectedRoute', 'm'),
        (', który blokuje dostęp niezalogowanym użytkownikom. W ramach prefiksu ', ),
        ('/app', 'm'),
        (' zastosowano ', ),
        ('zagnieżdżone trasy', 'b'),
        (' z wspólnym układem ', ),
        ('AppLayout', 'm'),
        (' (boczny pasek nawigacji w wariancie desktopowym oraz dolna nawigacja w wariancie mobilnym), do którego React Router wstrzykuje aktywną podstronę. Wyjątkiem jest trasa ', ),
        ('/app/take/:id', 'm'),
        (' realizująca pełnoekranowe wypełnianie testu — celowo umieszczona poza wspólnym layoutem, aby zminimalizować rozproszenie uwagi pracownika podczas udzielania odpowiedzi. Stare ścieżki (', ),
        ('/dashboard', 'm'),
        (', ', ),
        ('/assessments', 'm'),
        (') zostały zachowane w postaci przekierowań, co zapobiega błędom 404 w przypadku odwołań z wcześniejszych wersji aplikacji.', ),
    ])

    add_listing(
        doc,
        listing_no='4.18',
        title='Konfiguracja routingu aplikacji pracownika',
        file_path='client-frontend/src/App.tsx',
        lines='15–62',
        comment=(
            'Listing 4.18 prezentuje główny komponent aplikacji. Provider biblioteki '
            'Redux dostarcza store wszystkim komponentom potomnym, BrowserRouter '
            'definiuje routing po stronie klienta, a ProtectedRoute opakowuje gałąź '
            '/app/* odpowiedzialną za widoki dla zalogowanego pracownika. Komponent '
            'PwaUpdatePrompt jest renderowany na poziomie aplikacji, dzięki czemu '
            'jest widoczny niezależnie od bieżącej trasy.'
        ),
    )

    add_paragraph(doc, [
        ('Strażnik tras ', ),
        ('ProtectedRoute', 'm'),
        (' realizuje pojedynczą, ściśle określoną odpowiedzialność — sprawdza, czy w stanie globalnym aplikacji znajduje się ważny token dostępu. Jeśli tak, wyświetla zagnieżdżone komponenty potomne; jeśli nie, wykonuje przekierowanie na stronę logowania. Logika sprawdzenia została wydzielona do hooka ', ),
        ('useAuth', 'm'),
        (', co eliminuje duplikację kodu w innych miejscach, w których aplikacja musi wiedzieć, czy użytkownik jest uwierzytelniony.', ),
    ])

    add_listing(
        doc,
        listing_no='4.19',
        title='Strażnik tras chroniący widoki przed nieautoryzowanym dostępem',
        file_path='client-frontend/src/components/ProtectedRoute.tsx',
        lines='1–12',
        comment=(
            'Listing 4.19 pokazuje implementację ProtectedRoute. Komponent jest '
            'celowo minimalny — pełni rolę bramki autoryzacyjnej w warstwie '
            'routingu. Należy podkreślić, że ten mechanizm chroni jedynie widoczność '
            'interfejsu po stronie klienta; właściwa kontrola dostępu do danych '
            'odbywa się na backendzie poprzez weryfikację tokena JWT i strażników '
            'NestJS. Frontend nie może być traktowany jako warstwa bezpieczeństwa.'
        ),
    )

    add_heading(doc, 'Zarządzanie stanem — Redux Toolkit', level=3)

    add_paragraph(doc, [
        ('Aplikacja przechowuje globalny stan związany z sesją użytkownika w pojedynczym sklepie Redux skonfigurowanym przy pomocy ', ),
        ('Redux Toolkit', 'b'),
        (' — oficjalnego, opiniotwórczego rozwiązania rekomendowanego przez zespół Redux. Toolkit znacząco redukuje ilość kodu boilerplate (znanego z klasycznego Reduksa) dzięki funkcji ', ),
        ('createSlice', 'm'),
        (' generującej automatycznie akcje i reducery oraz ', ),
        ('createAsyncThunk', 'm'),
        (' opakowującemu asynchroniczne operacje w cykl ', ),
        ('pending → fulfilled → rejected', 'i'),
        ('. Sklep zawiera obecnie jedynie plasterek ', ),
        ('auth', 'm'),
        (' — pozostałe dane domenowe (lista przypisanych testów, historia wyników) są pobierane lokalnie w komponentach ekranowych za pomocą hooków ', ),
        ('useEffect', 'm'),
        (' i ', ),
        ('useState', 'm'),
        ('. Świadomie zrezygnowano z umieszczania danych domenowych w globalnym stanie, ponieważ są one specyficzne dla pojedynczego widoku i nie wymagają udostępniania między ekranami — wprowadzanie ich do Redux byłoby formą over-engineeringu nieprzystającą do skali aplikacji.', ),
    ])

    add_paragraph(doc, [
        ('Plasterek ', ),
        ('authSlice', 'm'),
        (' zawiera cztery operacje asynchroniczne: ', ),
        ('login', 'b'),
        (' (uwierzytelnianie użytkownika i odebranie pary tokenów), ', ),
        ('register', 'b'),
        (' (rejestracja pracownika z kodem zaproszenia firmy), ', ),
        ('logoutThunk', 'b'),
        (' (wylogowanie z unieważnieniem sesji po stronie serwera) oraz ', ),
        ('fetchMe', 'b'),
        (' (pobranie profilu zalogowanego użytkownika). Każda z tych operacji obsługuje błąd HTTP poprzez ', ),
        ('rejectWithValue', 'm'),
        (' i propaguje czytelny komunikat do warstwy interfejsu. Akcja synchroniczna ', ),
        ('logout', 'm'),
        (' wykonuje natomiast czyszczenie pamięci ', ),
        ('localStorage', 'm'),
        (' — gdyby ją pominąć, tokeny pozostałyby w przeglądarce po wylogowaniu, co stanowiłoby naruszenie zasady minimalizacji danych wrażliwych.', ),
    ])

    add_listing(
        doc,
        listing_no='4.20',
        title='Plasterek auth — async thunki i reducery sesji użytkownika',
        file_path='client-frontend/src/store/slices/authSlice.ts',
        lines='14–119',
        comment=(
            'Listing 4.20 pokazuje fragment authSlice obejmujący cztery operacje '
            'asynchroniczne oraz reducery synchroniczne. Po pomyślnym logowaniu '
            'tokeny zapisywane są zarówno w stanie Redux, jak i w pamięci '
            'localStorage przeglądarki — dzięki temu użytkownik pozostaje zalogowany '
            'po odświeżeniu strony. Reducer fetchMe.rejected obsługuje sytuację, '
            'w której zapisany token wygasł lub został unieważniony — czyści wówczas '
            'sesję i zmusza użytkownika do ponownego logowania.'
        ),
    )

    add_heading(doc, 'Komunikacja z API i automatyczne odświeżanie tokenów', level=3)

    add_paragraph(doc, [
        ('Wszystkie żądania HTTP w aplikacji przechodzą przez pojedynczego klienta ', ),
        ('axiosClient', 'm'),
        (', który centralizuje konfigurację adresu API, nagłówków, ciasteczek oraz logiki obsługi błędów uwierzytelniania. Adres bazowy jest pobierany ze zmiennej środowiskowej ', ),
        ('VITE_API_URL', 'm'),
        (', a w razie jej braku stosowany jest adres produkcyjny na platformie Railway. Opcja ', ),
        ('withCredentials: true', 'm'),
        (' jest niezbędna, ponieważ backend wykorzystuje uwierzytelnianie oparte o ciasteczka HTTP-only (zabezpieczone przed odczytem ze skryptu i przed atakami typu XSS), a przeglądarka domyślnie nie wysyła ciasteczek do żądań cross-origin.', ),
    ])

    add_paragraph(doc, [
        ('Najistotniejszym elementem klienta jest ', ),
        ('interceptor odpowiedzi', 'b'),
        (' realizujący automatyczne odświeżanie wygasłego tokena dostępu. Gdy serwer zwróci błąd ', ),
        ('401 Unauthorized', 'm'),
        (' dla żądania, które nie dotyczy samego endpointu uwierzytelniania, klient próbuje uzyskać nową parę tokenów na podstawie zapisanego refresh tokena, a następnie ponawia oryginalne żądanie. Aby uniknąć równoległego wywoływania endpointu ', ),
        ('/auth/refresh', 'm'),
        (' przez wiele żądań, które wygasły w tym samym momencie, zastosowano ', ),
        ('kolejkę oczekujących żądań', 'b'),
        (' (', ),
        ('pendingQueue', 'm'),
        ('). Pierwsze żądanie wykonuje odświeżenie, a pozostałe czekają na rozstrzygnięcie i zostają wznowione w jednym przebiegu. Jeśli odświeżenie się nie powiedzie (refresh token wygasł lub został odwołany), klient czyści ', ),
        ('localStorage', 'm'),
        (' i przekierowuje użytkownika na stronę logowania.', ),
    ])

    add_listing(
        doc,
        listing_no='4.21',
        title='Klient HTTP z interceptorem automatycznego odświeżania tokena',
        file_path='client-frontend/src/api/axiosClient.ts',
        lines='1–65',
        comment=(
            'Listing 4.21 prezentuje klienta axios wraz z dwoma interceptorami. '
            'Interceptor żądania dokleja nagłówek Authorization, a interceptor '
            'odpowiedzi obsługuje błąd 401 i odświeża token. Mechanizm flagi '
            '_retry zapobiega nieskończonej pętli — po nieudanej ponownej próbie '
            'żądanie nie zostanie wywołane ponownie. Wykluczenie ścieżek /auth/ '
            'z mechanizmu zapobiega rekurencyjnemu odświeżaniu w sytuacji, gdy '
            'sam endpoint refresh zwróci 401.'
        ),
    )

    add_heading(doc, 'Niestandardowy hook useAuth', level=3)

    add_paragraph(doc, [
        ('Aby ujednolicić sposób korzystania ze stanu sesji w komponentach aplikacji, wprowadzono niestandardowy hook ', ),
        ('useAuth', 'm'),
        ('. Ukrywa on bezpośrednie odwołania do selektorów Reduksa i udostępnia gotowy zestaw pól (', ),
        ('user', 'm'),
        (', ', ),
        ('accessToken', 'm'),
        (', ', ),
        ('isLoading', 'm'),
        (', ', ),
        ('error', 'm'),
        (', ', ),
        ('isAuthenticated', 'm'),
        (') oraz akcję ', ),
        ('handleLogout', 'm'),
        ('. Dzięki temu komponenty nie muszą wiedzieć, jak zorganizowany jest store — wszelka zmiana wewnętrznej struktury slice’a wymaga modyfikacji wyłącznie hooka, a nie wszystkich konsumentów. Jest to praktyczne zastosowanie zasady ', ),
        ('separation of concerns', 'i'),
        ('.', ),
    ])

    add_listing(
        doc,
        listing_no='4.22',
        title='Hook useAuth jako abstrakcja nad stanem sesji',
        file_path='client-frontend/src/hooks/useAuth.ts',
        lines='1–17',
        comment=(
            'Listing 4.22 pokazuje implementację hooka useAuth. Pojedyncze pole '
            'isAuthenticated jest wyliczane na podstawie obecności accessToken — '
            'komponenty w całej aplikacji (np. ProtectedRoute, LogoutButton) '
            'odwołują się wyłącznie do tego prostego boola, nie znając wewnętrznej '
            'reprezentacji stanu autoryzacji.'
        ),
    )

    add_heading(doc, 'Progressive Web App — instalowalność i tryb offline', level=3)

    add_paragraph(doc, [
        ('Aplikacja pracownika została zaimplementowana jako ', ),
        ('Progressive Web App', 'b'),
        (' (PWA), co oznacza, że może zostać zainstalowana na urządzeniu mobilnym jak natywna aplikacja, działa w trybie pełnoekranowym (bez paska adresu przeglądarki) i posiada ograniczoną funkcjonalność offline. Decyzja o wdrożeniu PWA wynika z profilu użytkownika końcowego — pracownik najczęściej korzysta z aplikacji z telefonu, a oczekuje doświadczenia zbliżonego do aplikacji natywnej, bez konieczności publikacji w sklepach App Store i Google Play. Implementacja opiera się na pluginie ', ),
        ('vite-plugin-pwa', 'm'),
        (', który integruje bibliotekę ', ),
        ('Workbox', 'b'),
        (' z procesem budowania Vite i automatycznie generuje plik manifestu oraz Service Workera.', ),
    ])

    add_paragraph(doc, [
        ('Manifest aplikacji definiuje nazwę, opis, kolor motywu, orientację portretową, tryb wyświetlania ', ),
        ('standalone', 'm'),
        (' oraz zestaw ikon w wariantach 192 i 512 pikseli, w tym wariant ', ),
        ('maskable', 'm'),
        (' adaptujący się do różnych kształtów ikon na różnych systemach Android. Strategia rejestracji Service Workera została ustawiona na ', ),
        ('prompt', 'm'),
        (', co oznacza, że nowa wersja aplikacji nie jest aktywowana automatycznie — użytkownik otrzymuje banner z propozycją odświeżenia. Wybór tego trybu zamiast ', ),
        ('autoUpdate', 'm'),
        (' zapobiega utracie danych formularza w sytuacji, gdy nowa wersja zostałaby pobrana w trakcie wypełniania testu. Strategia cache została starannie dobrana: dane wrażliwe i sesyjne (', ),
        ('/auth/', 'm'),
        (', ', ),
        ('/users/me', 'm'),
        (', ', ),
        ('/results', 'm'),
        (', ', ),
        ('/admin', 'm'),
        (', ', ),
        ('/analytics', 'm'),
        (') są wykluczone z cache (', ),
        ('NetworkOnly', 'm'),
        ('), co eliminuje ryzyko podejrzenia danych poprzedniego użytkownika po wylogowaniu lub przełączeniu konta. Pozostałe zasoby API są obsługiwane strategią ', ),
        ('NetworkFirst', 'm'),
        (' z timeoutem 5 sekund — w warunkach dobrego połączenia wracają świeże dane z serwera, a w razie problemów sieciowych aplikacja korzysta z poprzedniej kopii.', ),
    ])

    add_listing(
        doc,
        listing_no='4.23',
        title='Konfiguracja Vite z pluginem PWA i strategiami cache',
        file_path='client-frontend/vite.config.ts',
        lines='1–63',
        comment=(
            'Listing 4.23 prezentuje pełną konfigurację Vite. Sekcja manifest '
            'opisuje aplikację z perspektywy systemu operacyjnego, a sekcja '
            'workbox definiuje zachowanie Service Workera. Wykluczenie endpointów '
            'wrażliwych z cache jest świadomą decyzją bezpieczeństwa — w środowisku '
            'wielu użytkowników korzystających z tego samego urządzenia (np. tablet '
            'wspólny dla zespołu) cache mógłby ujawnić dane innej osoby.'
        ),
    )

    add_heading(doc, 'Główny przepływ domenowy — wypełnianie testu psychologicznego', level=3)

    add_paragraph(doc, [
        ('Najistotniejszym scenariuszem aplikacji pracownika jest wypełnienie testu psychologicznego (np. PHQ-9, GAD-7, WHO-5, PSS-10) i otrzymanie wyniku wraz z interpretacją. Realizacją tego scenariusza jest komponent ', ),
        ('TakeAssessmentPage', 'm'),
        (', osadzony pod trasą ', ),
        ('/app/take/:id', 'm'),
        (' z parametrem zapytania ', ),
        ('assignmentId', 'm'),
        (' identyfikującym konkretne przypisanie testu do pracownika. Komponent jest celowo umieszczony poza wspólnym ', ),
        ('AppLayout', 'm'),
        (', dzięki czemu użytkownik nie widzi nawigacji bocznej ani dolnego paska — uwaga jest skupiona wyłącznie na pytaniach.', ),
    ])

    add_paragraph(doc, [
        ('Po zamontowaniu komponentu wykonywane jest pojedyncze żądanie ', ),
        ('GET /assessments/:id', 'm'),
        (' pobierające definicję testu (treść pytań, dostępne opcje odpowiedzi). Odpowiedzi użytkownika są przechowywane lokalnie w stanie komponentu jako mapa ', ),
        ('{ questionId → value }', 'm'),
        (', co umożliwia płynną zmianę odpowiedzi przed wysłaniem oraz prostą walidację kompletności (każde pytanie musi mieć przypisaną odpowiedź). Po kliknięciu przycisku zatwierdzającego dane są transformowane do formatu oczekiwanego przez backend i wysyłane jako ', ),
        ('POST /responses', 'm'),
        (' wraz z identyfikatorem przypisania. Backend wykonuje obliczenia psychometryczne — wyliczenie surowego wyniku, normalizację, klasyfikację stopnia nasilenia (severity) oraz wykrycie czerwonych flag (np. flagi ryzyka samookaleczenia w teście PHQ-9). Frontend nie powtarza tej logiki, ponieważ obliczanie wyników musi pozostać po stronie serwera ze względów bezpieczeństwa i spójności (zasada szczegółowo omówiona w rozdziale dotyczącym backendu).', ),
    ])

    add_listing(
        doc,
        listing_no='4.24',
        title='Pobranie definicji testu i wysłanie odpowiedzi do backendu',
        file_path='client-frontend/src/pages/TakeAssessmentPage.tsx',
        lines='18–53',
        comment=(
            'Listing 4.24 przedstawia rdzeń komponentu odpowiedzialnego za '
            'wypełnianie testu. Hook useEffect pobiera definicję testu po '
            'zamontowaniu komponentu i przekierowuje na listę testów w razie '
            'błędu. Funkcja handleSubmit waliduje kompletność odpowiedzi i wysyła '
            'je do backendu, który zwraca wynik wraz z interpretacją. Wszelkie '
            'obliczenia psychometryczne pozostają po stronie serwera — frontend '
            'pełni wyłącznie rolę warstwy prezentacji i zbierania danych.'
        ),
    )

    add_heading(doc, 'Podsumowanie warstwy frontendowej pracownika', level=3)

    add_paragraph(doc, [
        ('Aplikacja pracownika łączy nowoczesny stos technologiczny (React, TypeScript, Vite, Redux Toolkit, Tailwind CSS) z prostym i przewidywalnym podziałem odpowiedzialności. Routing jest deklaratywny i chroniony pojedynczym strażnikiem ', ),
        ('ProtectedRoute', 'm'),
        (', stan globalny ograniczony jest do sesji użytkownika, komunikacja z API skoncentrowana w jednym kliencie z automatycznym odświeżaniem tokenów, a niestandardowy hook ', ),
        ('useAuth', 'm'),
        (' ujednolica dostęp do stanu autoryzacji. Wdrożenie jako Progressive Web App umożliwia instalację na urządzeniach mobilnych bez konieczności publikacji w sklepach z aplikacjami, a starannie dobrana strategia cache zachowuje równowagę między wydajnością a bezpieczeństwem danych wrażliwych. Krytyczna logika domenowa — w szczególności obliczanie wyników testów psychologicznych — pozostaje po stronie backendu, dzięki czemu frontend skupia się na prezentacji i zbieraniu danych, co odpowiada zasadzie separacji warstw przyjętej w całej architekturze MoodFlow.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.5-Frontend-pracownika.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
