#!/usr/bin/env python3
"""4.6. Frontend administracyjny — Next.js, Recharts, PDF — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '4.6. Frontend administracyjny — panel HR i administratora w Next.js', size=12)

    add_paragraph(doc, [
        ('Panel administracyjny stanowi drugą, niezależną aplikację frontendową systemu MoodFlow. Jest przeznaczony dla użytkowników o podwyższonych uprawnieniach: ', ),
        ('administratora firmy', 'b'),
        (' (zarządzającego pracownikami i strukturą organizacji), ', ),
        ('działu HR', 'b'),
        (' (analizującego zagregowane dane o dobrostanie pracowników) oraz ', ),
        ('właściciela platformy', 'b'),
        (' (super-administratora zatwierdzającego nowe firmy). Zakres funkcjonalny i sposób użytkowania panelu znacząco odbiega od aplikacji pracownika — administrator korzysta z panelu z komputera stacjonarnego, podczas dłuższych sesji, operuje na rozbudowanych tabelach i interaktywnych wykresach. Z tego powodu zdecydowano się na osobny projekt frontendowy, oparty na innej, specjalnie dobranej technologii.', ),
    ])

    add_heading(doc, 'Stos technologiczny i uzasadnienie wyboru Next.js', level=3)

    add_paragraph(doc, [
        ('Aplikacja administracyjna została zaimplementowana w oparciu o framework ', ),
        ('Next.js 16', 'b'),
        (' z wykorzystaniem ', ),
        ('App Routera', 'b'),
        (' — najnowszego modelu organizacji projektu opartego na konwencji folderów odpowiadających ścieżkom URL. Wybór Next.js zamiast czystego Reacta z Vite (jak w aplikacji pracownika) wynika z kilku powodów. Po pierwsze, App Router narzuca przewidywalną strukturę plików (', ),
        ('layout.tsx', 'm'),
        (', ', ),
        ('page.tsx', 'm'),
        (', ', ),
        ('loading.tsx', 'm'),
        ('), co ułatwia utrzymanie projektu o większej liczbie ekranów. Po drugie, system zagnieżdżonych layoutów świetnie odpowiada strukturze panelu administracyjnego — wspólny ', ),
        ('AppLayout', 'm'),
        (' z paskiem bocznym ', ),
        ('Sidebar', 'm'),
        (' otacza wszystkie ekrany pod ścieżką ', ),
        ('/dashboard', 'm'),
        ('. Po trzecie, Next.js zapewnia produkcyjne optymalizacje (automatyczne dzielenie paczek per trasa, optymalizacja czcionek, generacja manifestu PWA), które bez ręcznej konfiguracji są dostępne od razu.', ),
    ])

    add_paragraph(doc, [
        ('Stos uzupełniają: ', ),
        ('TypeScript', 'b'),
        (' (statyczne typowanie kodu), ', ),
        ('Tailwind CSS 4', 'b'),
        (' (utility-first stylowanie), ', ),
        ('Framer Motion', 'b'),
        (' (płynne animacje przejść między ekranami i interakcji w pasku bocznym), ', ),
        ('Recharts', 'b'),
        (' (deklaratywna biblioteka wykresów oparta na SVG), ', ),
        ('Lucide React', 'b'),
        (' (zestaw lekkich ikon SVG), ', ),
        ('Sonner', 'b'),
        (' (system powiadomień typu toast), ', ),
        ('next-themes', 'b'),
        (' (przełączanie motywu jasny/ciemny) oraz ', ),
        ('jsPDF', 'b'),
        (' wraz z ', ),
        ('html2canvas', 'b'),
        (' (generowanie raportów HR w formacie PDF). Świadomie zrezygnowano z biblioteki Redux Toolkit obecnej w aplikacji pracownika — w panelu administracyjnym nie istnieje stan globalny współdzielony między ekranami, dane są pobierane bezpośrednio w komponentach przy użyciu hooka ', ),
        ('useEffect', 'm'),
        (' i lokalnego ', ),
        ('useState', 'm'),
        ('. Wprowadzanie globalnego sklepu byłoby w tym przypadku formą over-engineeringu nieprzystającą do skali aplikacji.', ),
    ])

    add_heading(doc, 'Layout główny i bootstrap aplikacji', level=3)

    add_paragraph(doc, [
        ('Każda aplikacja Next.js w trybie App Router musi posiadać ', ),
        ('root layout', 'b'),
        (' opakowujący wszystkie strony. Plik ', ),
        ('app/layout.tsx', 'm'),
        (' deklaruje strukturę dokumentu HTML, ładuje czcionkę Montserrat z usługi Google Fonts (z opcją ', ),
        ('display: swap', 'm'),
        (' eliminującą migotanie tekstu w trakcie ładowania), definiuje metadane SEO i PWA (manifest, ikony Apple, kolor motywu) oraz osadza komponent ', ),
        ('Providers', 'm'),
        (' z dostawcą motywu kolorystycznego (jasny/ciemny) i systemem powiadomień toast. Komponent ', ),
        ('SwRegister', 'm'),
        (' rejestruje Service Workera odpowiedzialnego za funkcjonalność Progressive Web App (panel administracyjny również można zainstalować jako aplikację desktopową).', ),
    ])

    add_listing(
        doc,
        listing_no='4.25',
        title='Layout główny aplikacji administracyjnej',
        file_path='admin-frontend/app/layout.tsx',
        lines='1–40',
        comment=(
            'Listing 4.25 prezentuje root layout panelu. Jest on wykonywany na '
            'serwerze (brak dyrektywy "use client") i otacza wszystkie strony '
            'aplikacji. Atrybut suppressHydrationWarning jest niezbędny przy '
            'współpracy z biblioteką next-themes, która modyfikuje klasę elementu '
            'html po stronie klienta, co bez tej flagi powodowałoby ostrzeżenia '
            'o niezgodności stanu serwera i przeglądarki podczas hydracji.'
        ),
    )

    add_paragraph(doc, [
        ('Drugim, kluczowym layoutem jest ', ),
        ('app/dashboard/layout.tsx', 'm'),
        (' — opakowujący wszystkie ekrany aplikacyjne pod ścieżką ', ),
        ('/dashboard/*', 'm'),
        ('. Realizuje on dwie krytyczne funkcje. Pierwsza to ', ),
        ('strażnik autoryzacji', 'b'),
        (': hook ', ),
        ('useEffect', 'm'),
        (' sprawdza obecność tokena dostępu w pamięci ', ),
        ('localStorage', 'm'),
        (' i w przypadku jego braku przekierowuje użytkownika na stronę logowania, zanim jakikolwiek zawartość zostanie wyrenderowana. Druga funkcja to ', ),
        ('zegar bezczynności sesji', 'b'),
        (' — po skonfigurowanym przez użytkownika czasie braku aktywności (domyślnie 15 minut) panel automatycznie wylogowuje administratora, co jest istotne ze względu na charakter danych prezentowanych w panelu (informacje o dobrostanie pracowników, struktura organizacji). Aktywność jest wykrywana przez zdarzenia ', ),
        ('mousemove', 'm'),
        (', ', ),
        ('keydown', 'm'),
        (', ', ),
        ('click', 'm'),
        (' i ', ),
        ('scroll', 'm'),
        ('; każde z nich resetuje licznik. Layout dodatkowo obsługuje animowane przejścia między stronami z wykorzystaniem komponentu ', ),
        ('AnimatePresence', 'm'),
        (' biblioteki Framer Motion.', ),
    ])

    add_listing(
        doc,
        listing_no='4.26',
        title='Layout dashboardu z bramką autoryzacyjną i zegarem bezczynności',
        file_path='admin-frontend/app/dashboard/layout.tsx',
        lines='9–56',
        comment=(
            'Listing 4.26 pokazuje implementację layoutu dashboardu. Funkcja '
            'doLogout wywołuje endpoint wylogowania, czyści tokeny i przekierowuje '
            'na stronę logowania. resetTimer odczytuje preferowany przez '
            'użytkownika czas bezczynności i ustawia setTimeout. Hook useEffect '
            'rejestruje listenery zdarzeń i czyści je przy odmontowaniu komponentu, '
            'eliminując wycieki pamięci. Dodatkowo każda zmiana ścieżki uruchamia '
            'animację wejścia poprzez AnimatePresence.'
        ),
    )

    add_heading(doc, 'Nawigacja oparta na rolach (RBAC w warstwie interfejsu)', level=3)

    add_paragraph(doc, [
        ('Pasek boczny ', ),
        ('Sidebar', 'm'),
        (' realizuje koncepcję ', ),
        ('Role-Based Access Control', 'b'),
        (' na poziomie interfejsu. Komponent po zamontowaniu odczytuje rolę zalogowanego użytkownika z lokalnego magazynu i renderuje odpowiedni zestaw pozycji menu: administrator firmy widzi pozycje ', ),
        ('Przegląd', 'i'),
        (', ', ),
        ('Oczekujące', 'i'),
        (', ', ),
        ('Użytkownicy', 'i'),
        (' i ', ),
        ('Ustawienia', 'i'),
        (', natomiast pracownik HR otrzymuje menu nastawione na analizę danych: ', ),
        ('Dashboard HR', 'i'),
        (', ', ),
        ('Raporty', 'i'),
        (', ', ),
        ('Wygeneruj raport', 'i'),
        (', ', ),
        ('Pracownicy', 'i'),
        (' i ', ),
        ('Zaplanuj test', 'i'),
        ('. Dodatkowo paleta barw paska bocznego dynamicznie dostosowuje się do roli (pomarańczowy gradient dla administratora, turkusowy dla HR), co zapewnia natychmiastową orientację wizualną. Należy podkreślić, że ', ),
        ('warstwa interfejsu nie stanowi mechanizmu bezpieczeństwa', 'b'),
        (' — manipulacja zawartością ', ),
        ('localStorage', 'm'),
        (' przez świadomego użytkownika nie umożliwia uzyskania danych, do których jego rola nie powinna mieć dostępu, ponieważ rzeczywistą weryfikację przeprowadza backend przy każdym żądaniu.', ),
    ])

    add_listing(
        doc,
        listing_no='4.27',
        title='Pasek boczny z menu zależnym od roli użytkownika',
        file_path='admin-frontend/components/Sidebar.tsx',
        lines='15–93',
        comment=(
            'Listing 4.27 prezentuje fragment komponentu Sidebar. Tablice adminItems '
            'i hrItems definiują pozycje menu właściwe dla każdej roli. Hook '
            'useEffect odczytuje rolę z localStorage oraz pobiera nazwę organizacji, '
            'do której należy zalogowany użytkownik. Funkcja isActive wykorzystuje '
            'usePathname do podświetlania bieżącej pozycji menu. Wybór paska bocznego '
            'do podświetlenia oraz palety barw odbywa się na podstawie roli — '
            'wszystko w jednej, deklaratywnej deklaracji zmiennych accentFrom '
            'i accentTo.'
        ),
    )

    add_heading(doc, 'Komunikacja z API i automatyczne odświeżanie tokenów', level=3)

    add_paragraph(doc, [
        ('Klient HTTP w panelu administracyjnym jest funkcjonalnym lustrem klienta z aplikacji pracownika — wykorzystuje bibliotekę ', ),
        ('axios', 'm'),
        (' z dwoma interceptorami (żądania i odpowiedzi) oraz mechanizmem ', ),
        ('pending queue', 'b'),
        (' eliminującym sytuacje wyścigu (race condition) podczas równoległego odświeżania tokena. Odrębność klientów wynika z faktu, że tokeny obu aplikacji są przechowywane pod innymi kluczami w pamięci ', ),
        ('localStorage', 'm'),
        (' (', ),
        ('admin_access_token', 'm'),
        (' i ', ),
        ('admin_refresh_token', 'm'),
        (' zamiast ', ),
        ('accessToken', 'm'),
        (' i ', ),
        ('refreshToken', 'm'),
        ('). Rozdzielenie kluczy zapobiega przypadkowemu wymieszaniu sesji, gdyby z jednej przeglądarki korzystał zarówno pracownik, jak i administrator (np. podczas testów akceptacyjnych lub szkoleń).', ),
    ])

    add_listing(
        doc,
        listing_no='4.28',
        title='Klient HTTP panelu z mechanizmem auto-refresh i kolejką żądań',
        file_path='admin-frontend/lib/axiosClient.ts',
        lines='1–61',
        comment=(
            'Listing 4.28 prezentuje pełną implementację klienta. Sprawdzenie '
            'typeof window !== "undefined" jest niezbędne, ponieważ Next.js '
            'wykonuje fragment kodu w trakcie kompilacji po stronie serwera, gdzie '
            'obiekt window nie istnieje. Pomijanie endpointów /auth/ z mechanizmu '
            'odświeżania zapobiega rekurencyjnym wywołaniom, gdyby refresh sam '
            'zwrócił 401.'
        ),
    )

    add_heading(doc, 'Pamięć tokenów i pomocniki autoryzacji', level=3)

    add_paragraph(doc, [
        ('Operacje na pamięci ', ),
        ('localStorage', 'm'),
        (' zostały wyodrębnione do pojedynczego modułu ', ),
        ('lib/auth.ts', 'm'),
        (' eksportującego sześć krótkich funkcji pomocniczych: ', ),
        ('saveTokens', 'm'),
        (', ', ),
        ('saveRole', 'm'),
        (', ', ),
        ('getRole', 'm'),
        (', ', ),
        ('clearTokens', 'm'),
        (', ', ),
        ('getAccessToken', 'm'),
        (' oraz parę ', ),
        ('getSessionTimeout', 'm'),
        (' / ', ),
        ('setSessionTimeout', 'm'),
        ('. Każda z tych funkcji sprawdza dostępność obiektu ', ),
        ('window', 'm'),
        (', co umożliwia bezpieczne użycie w komponentach renderowanych po stronie serwera. Centralizacja operacji w jednym module jest istotna z dwóch powodów: po pierwsze, eliminuje rozsiane po kodzie odwołania do magicznych łańcuchów-kluczy (', ),
        ("'admin_access_token'", 'm'),
        (' itp.), po drugie umożliwia łatwą zmianę nośnika danych (np. migrację z ', ),
        ('localStorage', 'm'),
        (' na ', ),
        ('sessionStorage', 'm'),
        (' lub ciasteczka HTTP-only) bez modyfikacji konsumentów.', ),
    ])

    add_listing(
        doc,
        listing_no='4.29',
        title='Moduł pomocniczy zarządzania tokenami i preferencjami sesji',
        file_path='admin-frontend/lib/auth.ts',
        lines='1–33',
        comment=(
            'Listing 4.29 prezentuje wszystkie funkcje pomocnicze. Domyślny czas '
            'bezczynności wynosi 15 minut, ale użytkownik może go zmienić w '
            'zakresie 5–60 minut z poziomu ekranu ustawień, co jest zapisywane '
            'pod kluczem admin_session_timeout. clearTokens usuwa również rolę, '
            'aby po wylogowaniu Sidebar nie próbował pobierać danych dla '
            'nieistniejącej już sesji.'
        ),
    )

    add_heading(doc, 'Hierarchia uprawnień — zatwierdzanie organizacji przez super-administratora', level=3)

    add_paragraph(doc, [
        ('System MoodFlow obsługuje dodatkową, najwyższą rolę — ', ),
        ('super_admin', 'm'),
        (' — przypisaną właścicielowi platformy. Super-administrator nie należy do żadnej konkretnej firmy, lecz nadzoruje cykl życia wszystkich organizacji w systemie. Po rejestracji nowej firmy przez przyszłego administratora organizacja otrzymuje status ', ),
        ('PENDING', 'm'),
        (' i czeka na decyzję super-administratora. Dedykowana strona ', ),
        ('app/super-admin/dashboard/page.tsx', 'm'),
        (' prezentuje listę zgłoszeń i umożliwia trzy operacje: zatwierdzenie (zmiana statusu na ', ),
        ('ACTIVE', 'i'),
        ('), odrzucenie (', ),
        ('REJECTED', 'i'),
        (') oraz zablokowanie wcześniej aktywnej organizacji (', ),
        ('BLOCKED', 'i'),
        ('). Każda z operacji wykonuje wywołanie POST do dedykowanego endpointu backendu, a po zakończeniu odświeża listę. Strona jest osadzona pod osobną gałęzią routingu, niezależnie od dashboardu administratora firmy, co podkreśla różny zakres uprawnień obu ról.', ),
    ])

    add_listing(
        doc,
        listing_no='4.30',
        title='Panel super-administratora — zatwierdzanie zgłoszeń organizacji',
        file_path='admin-frontend/app/super-admin/dashboard/page.tsx',
        lines='32–77',
        comment=(
            'Listing 4.30 pokazuje główną logikę panelu super-administratora. '
            'Hook useEffect weryfikuje, czy zalogowany użytkownik posiada rolę '
            'super_admin — jeśli nie, przekierowuje na osobną stronę logowania '
            'super-administratora. Funkcja action obsługuje wszystkie trzy '
            'operacje (approve, reject, block) poprzez wspólny szkielet, '
            'parametryzowany typem akcji. Po zakończeniu operacji następuje '
            'pełne odświeżenie listy organizacji, dzięki czemu interfejs '
            'natychmiast odzwierciedla zaktualizowany stan systemu.'
        ),
    )

    add_heading(doc, 'Wizualizacja danych analitycznych — Recharts', level=3)

    add_paragraph(doc, [
        ('Cztery główne ekrany panelu (przegląd ogólny, dashboard HR, analityka oraz raporty HR) prezentują dane w postaci interaktywnych wykresów. Do realizacji warstwy wizualizacji wybrano bibliotekę ', ),
        ('Recharts', 'b'),
        (' opartą na deklaratywnym API komponentów Reacta i renderującą wykresy w SVG. Recharts został wybrany z trzech powodów: po pierwsze, pełna integracja z modelem komponentowym Reacta (każdy element wykresu — oś, linia, tooltip — jest osobnym komponentem), po drugie wbudowana responsywność dzięki komponentowi ', ),
        ('ResponsiveContainer', 'm'),
        (', po trzecie czytelne formatowanie animacji wprowadzania danych. W panelu wykorzystano typowe rodzaje wykresów: ', ),
        ('LineChart', 'm'),
        (' do prezentacji trendów dobrostanu w czasie, ', ),
        ('PieChart', 'm'),
        (' do rozkładu nasilenia objawów, ', ),
        ('BarChart', 'm'),
        (' do statystyk per dział oraz ', ),
        ('ReferenceLine', 'm'),
        (' do oznaczania progów alarmowych.', ),
    ])

    add_paragraph(doc, [
        ('Każdy z głównych typów wyników psychometrycznych ma przypisaną stałą paletę kolorów (zielony — minimalne, żółty — łagodne, pomarańczowy — umiarkowane, czerwony — ciężkie), zdefiniowaną w mapie ', ),
        ('SEVERITY_COLORS', 'm'),
        ('. Zachowanie spójnej palety między wykresami a etykietami w tabelach ułatwia szybką orientację i odpowiada wytycznym dotyczącym dostępności (informacja nigdy nie jest przekazywana wyłącznie kolorem — zawsze towarzyszy jej etykieta tekstowa).', ),
    ])

    add_listing(
        doc,
        listing_no='4.31',
        title='Strona analityki z wykresami Recharts i mapą kolorów nasilenia',
        file_path='admin-frontend/app/dashboard/analytics/page.tsx',
        lines='1–80',
        comment=(
            'Listing 4.31 pokazuje import biblioteki Recharts oraz definicje '
            'typów danych pobieranych z backendu (Summary, TrendPoint, '
            'SeverityItem, ParticipationItem, DepartmentStat). Pole anonymized '
            'w typie DepartmentStat jest istotne — backend zwraca tę flagę dla '
            'działów o liczebności poniżej minimalnego progu, a frontend '
            'wówczas zastępuje konkretne liczby informacją o niewystarczającej '
            'wielkości próby, co realizuje zasadę anonimizacji danych HR opisaną '
            'w odrębnym rozdziale.'
        ),
    )

    add_heading(doc, 'Eksport raportów HR do formatu PDF', level=3)

    add_paragraph(doc, [
        ('Dział HR ma możliwość wygenerowania kompletnego raportu kwartalnego w formacie PDF. Realizację zapewnia moduł ', ),
        ('lib/buildReportPdf.ts', 'm'),
        (' wykorzystujący bibliotekę ', ),
        ('jsPDF', 'b'),
        (' do programatycznego budowania dokumentu strona po stronie. Generacja PDF odbywa się w całości po stronie klienta, dzięki czemu nie obciąża backendu i nie wymaga dodatkowej infrastruktury (silnika renderującego HTML do PDF, kolejki zadań). Moduł zawiera własną implementację ', ),
        ('transliteracji polskich znaków diakrytycznych', 'b'),
        (' na warianty ASCII oraz osadzanie metryk wykresów po przekonwertowaniu ich do bitmapy przy pomocy biblioteki ', ),
        ('html2canvas', 'b'),
        ('. Wynikowy plik zawiera podsumowanie wskaźników, wykresy trendów oraz tabele zbiorcze dla wszystkich aktywnych testów psychometrycznych. Rozwiązanie po stronie klienta wybrano ze względu na dostępność danych już pobranych do widoku raportu — eliminuje to ponowne zapytania do backendu i przyspiesza generację.', ),
    ])

    add_heading(doc, 'Podsumowanie warstwy administracyjnej', level=3)

    add_paragraph(doc, [
        ('Panel administracyjny MoodFlow został zbudowany jako odrębny projekt frontendowy w technologii Next.js z App Routerem, uzupełnionej o Tailwind CSS, Framer Motion, Recharts i jsPDF. Architektura layoutów dobrze odwzorowuje strukturę uprawnień: warstwa autoryzacyjna i zegar bezczynności są zaimplementowane w layoucie ', ),
        ('/dashboard', 'm'),
        (', a osobna gałąź ', ),
        ('/super-admin', 'm'),
        (' obsługuje funkcje właściciela platformy. Nawigacja w pasku bocznym jest dynamicznie dopasowywana do roli zalogowanego użytkownika, jednak rzeczywiste bezpieczeństwo zapewnia backend — frontend pełni funkcję wyłącznie prezentacyjną. Centralny klient HTTP z mechanizmem pending queue eliminuje sytuacje wyścigu podczas odświeżania tokena, a wydzielony moduł ', ),
        ('lib/auth.ts', 'm'),
        (' centralizuje operacje na pamięci ', ),
        ('localStorage', 'm'),
        ('. Wizualizacja danych w postaci wykresów Recharts oraz możliwość eksportu raportów do PDF czynią panel HR pełnoprawnym narzędziem analitycznym, dostosowanym do potrzeb działów kadr w organizacjach korzystających z platformy MoodFlow.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.6-Frontend-administracyjny.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
