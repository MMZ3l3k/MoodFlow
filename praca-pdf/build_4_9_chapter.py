#!/usr/bin/env python3
"""4.9. Notyfikacje i przypomnienia — in-app + email — DOCX zgodny z formatem CDV."""

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

    add_heading(doc, '4.9. Moduł notyfikacji — powiadomienia in-app i wiadomości e-mail', size=12)

    add_paragraph(doc, [
        ('System MoodFlow opiera się na regularnym wypełnianiu krótkich kwestionariuszy psychometrycznych. Aby pracownik nie musiał samodzielnie sprawdzać, czy w panelu pojawiło się dla niego nowe zadanie, oraz aby administrator i super-administrator otrzymywali informacje o istotnych zmianach w systemie, wprowadzono dedykowany ', ),
        ('moduł notyfikacji', 'b'),
        ('. Realizuje on dwa równoległe kanały komunikacji: ', ),
        ('powiadomienia in-app', 'b'),
        (' (przechowywane w bazie danych i prezentowane w interfejsie obu aplikacji frontendowych) oraz ', ),
        ('wiadomości e-mail', 'b'),
        (' (wysyłane przez transport SMTP w przypadku przypisania nowego testu). Każdy z kanałów działa niezależnie — awaria jednego (np. zablokowany port SMTP w środowisku produkcyjnym) nie blokuje drugiego, dzięki czemu pracownik zawsze otrzyma informację, choćby tylko w panelu.', ),
    ])

    add_heading(doc, 'Model danych — encja Notification i typy zdarzeń', level=3)

    add_paragraph(doc, [
        ('Centralnym elementem modułu jest encja ', ),
        ('Notification', 'm'),
        (' przechowująca pojedyncze powiadomienie dla użytkownika. Zawiera identyfikator odbiorcy (', ),
        ('userId', 'm'),
        ('), typ zdarzenia, tytuł i treść, opcjonalny link nawigacyjny prowadzący do odpowiedniego widoku, opcjonalne metadane w postaci JSON oraz pola opisujące stan przeczytania (', ),
        ('read', 'm'),
        (', ', ),
        ('readAt', 'm'),
        ('). Definicja typów zdarzeń znajduje się w enumie ', ),
        ('NotificationType', 'm'),
        (' i obejmuje dziewięć kategorii: ', ),
        ('ASSIGNMENT_NEW', 'i'),
        (' (nowy test do wypełnienia), ', ),
        ('ASSESSMENT_COMPLETED', 'i'),
        (' (potwierdzenie wypełnienia), ', ),
        ('USER_PENDING_APPROVAL', 'i'),
        (' (nowe konto czeka na zatwierdzenie — dla administratora), ', ),
        ('USER_APPROVED', 'i'),
        (' i ', ),
        ('USER_REJECTED', 'i'),
        (' (decyzja administratora wobec konta), ', ),
        ('ORGANIZATION_PENDING', 'i'),
        (', ', ),
        ('ORGANIZATION_APPROVED', 'i'),
        (', ', ),
        ('ORGANIZATION_REJECTED', 'i'),
        (' (cykl życia firmy w systemie) oraz ', ),
        ('RISK_ALERT', 'i'),
        (' (sygnał o podwyższonym ryzyku zarezerwowany na przyszłą integrację z mechanizmem alertów). Indeks złożony na trójce ', ),
        ('(userId, read, createdAt)', 'm'),
        (' przyspiesza najczęstsze zapytania panelu — listę nieprzeczytanych powiadomień zalogowanego użytkownika posortowaną od najnowszych.', ),
    ])

    add_listing(
        doc,
        listing_no='4.43',
        title='Encja Notification z enumem NotificationType i indeksem złożonym',
        file_path='backend-api/src/modules/notifications/entities/notification.entity.ts',
        lines='1–47',
        comment=(
            'Listing 4.43 prezentuje pełną definicję encji wraz z enumem '
            'typów zdarzeń. Pole metadata o typie JSONB pozwala każdej '
            'kategorii notyfikacji nieść specyficzny kontekst (np. '
            'identyfikator przypisania dla ASSIGNMENT_NEW) bez konieczności '
            'modyfikacji schematu bazy. Indeks złożony obsługuje wzorzec '
            'wyszukiwania "nieprzeczytane powiadomienia użytkownika '
            'posortowane od najnowszych" w jednej operacji.'
        ),
    )

    add_heading(doc, 'Serwis notyfikacji — operacje CRUD i kontrola dostępu', level=3)

    add_paragraph(doc, [
        ('Klasa ', ),
        ('NotificationsService', 'm'),
        (' udostępnia kompletny zestaw operacji na powiadomieniach. Metoda ', ),
        ('create', 'm'),
        (' tworzy pojedynczy rekord, ', ),
        ('createMany', 'm'),
        (' wykonuje wsadowe utworzenie wielu rekordów w jednej transakcji (wykorzystywane przy przypisaniu testu wielu pracownikom jednocześnie), ', ),
        ('listForUser', 'm'),
        (' zwraca powiadomienia zalogowanego użytkownika posortowane od najnowszych z domyślnym limitem 50 sztuk, a ', ),
        ('unreadCount', 'm'),
        (' zlicza nieprzeczytane. Operacje modyfikujące — ', ),
        ('markRead', 'm'),
        (', ', ),
        ('deleteOne', 'm'),
        (' — przed wykonaniem weryfikują, że powiadomienie należy do wywołującego, w przeciwnym razie rzucają wyjątek ', ),
        ('ForbiddenException', 'm'),
        ('. Dzięki temu nawet znając identyfikator powiadomienia innego użytkownika, atakujący nie może go odczytać ani usunąć.', ),
    ])

    add_listing(
        doc,
        listing_no='4.44',
        title='Serwis notyfikacji z weryfikacją własności rekordu',
        file_path='backend-api/src/modules/notifications/notifications.service.ts',
        lines='24–94',
        comment=(
            'Listing 4.44 pokazuje pełen serwis. Metoda markAllRead wykorzystuje '
            'pojedyncze zapytanie UPDATE z warunkiem WHERE userId i read = false '
            'zamiast iterowania po rekordach — oszczędza to liczbę rundtripów '
            'do bazy nawet przy setkach nieprzeczytanych powiadomień. Komunikaty '
            'wyjątków są w języku polskim i bezpośrednio prezentowane w '
            'interfejsie.'
        ),
    )

    add_heading(doc, 'Endpointy REST i polling po stronie klienta', level=3)

    add_paragraph(doc, [
        ('Kontroler ', ),
        ('NotificationsController', 'm'),
        (' wystawia sześć endpointów chronionych strażnikiem ', ),
        ('JwtAuthGuard', 'm'),
        (': listę powiadomień, licznik nieprzeczytanych, oznaczenie pojedynczego powiadomienia jako przeczytane, oznaczenie wszystkich, usunięcie pojedynczego oraz usunięcie wszystkich. Każdy endpoint odczytuje identyfikator użytkownika z obiektu ', ),
        ('req.user', 'm'),
        (' wstrzykniętego przez strażnika — nie jest on przekazywany jako parametr trasy ani query, dzięki czemu nie ma możliwości uzyskania dostępu do powiadomień innego użytkownika przez modyfikację adresu URL.', ),
    ])

    add_listing(
        doc,
        listing_no='4.44b',
        title='Kontroler notyfikacji z sześcioma endpointami REST',
        file_path='backend-api/src/modules/notifications/notifications.controller.ts',
        lines='1–49',
        comment=(
            'Listing 4.44b prezentuje kontroler. Endpoint listy przyjmuje '
            'opcjonalny parametr limit, ograniczony górnym pułapem 100 '
            '(Math.min) — zapobiega to nadmiernemu obciążeniu bazy '
            'przypadkową lub złośliwą próbą pobrania bardzo dużej liczby '
            'rekordów. Wszystkie endpointy modyfikujące zwracają status '
            '204 No Content, bez treści odpowiedzi, co jest zgodne ze '
            'specyfikacją REST dla operacji typu fire-and-forget.'
        ),
    )

    add_heading(doc, 'Integracja z modułem testów — automatyczne powiadomienia o nowym przypisaniu', level=3)

    add_paragraph(doc, [
        ('Najczęstszym scenariuszem generującym notyfikację jest ', ),
        ('przypisanie nowego testu', 'b'),
        (' przez administratora lub dział HR. Po utworzeniu rekordu w tabeli ', ),
        ('assessment_assignments', 'm'),
        (' serwis ', ),
        ('AssessmentsService', 'm'),
        (' wywołuje prywatną metodę ', ),
        ('sendAssignmentEmails', 'm'),
        (' (nazwa historyczna — w rzeczywistości metoda obsługuje oba kanały). Najpierw rozwiązuje listę docelowych pracowników na podstawie typu przypisania (', ),
        ('ALL', 'i'),
        ('/', ),
        ('USER', 'i'),
        ('/', ),
        ('DEPARTMENT', 'i'),
        ('), filtruje ją do osób o roli pracowniczej, a następnie wywołuje ', ),
        ('notifications.createMany', 'm'),
        (' z odpowiednio sformatowanymi tytułem i treścią. Każda notyfikacja zawiera link do ekranu listy testów oraz metadane z identyfikatorami przypisania i testu. Dopiero po zapisaniu notyfikacji in-app uruchamiana jest równoległa wysyłka e-mail.', ),
    ])

    add_listing(
        doc,
        listing_no='4.45',
        title='Wysyłka notyfikacji o nowym przypisaniu testu — kanał in-app i e-mail',
        file_path='backend-api/src/modules/assessments/assessments.service.ts',
        lines='147–181',
        comment=(
            'Listing 4.45 pokazuje metodę sendAssignmentEmails. Komentarze '
            'w kodzie jawnie wskazują kolejność: najpierw notyfikacje in-app '
            '(zawsze działające), potem e-maile (best effort). Operator '
            'Promise.all umożliwia równoległą wysyłkę do wielu odbiorców, ale '
            'nie blokuje odpowiedzi API — wywołanie tej metody w nadrzędnym '
            'serwisie jest opakowane w .catch(() => {}), co oznacza, że '
            'awaria notyfikacji nigdy nie zniweczy samego utworzenia '
            'przypisania.'
        ),
    )

    add_heading(doc, 'Wysyłka wiadomości e-mail — szablon HTML i bezpieczeństwo', level=3)

    add_paragraph(doc, [
        ('Wysyłkę wiadomości e-mail realizuje serwis ', ),
        ('MailService', 'm'),
        (' wykorzystujący bibliotekę ', ),
        ('@nestjs-modules/mailer', 'm'),
        (' opartą na Nodemailerze. Konfiguracja transportu SMTP (host, port, dane uwierzytelniające, adres nadawcy) jest pobierana ze zmiennych środowiskowych w głównym module aplikacji, dzięki czemu sekrety nie znajdują się w kodzie źródłowym. Treść wiadomości jest budowana jako szablon HTML z osadzonymi danymi pracownika i testu. Krytyczne z punktu widzenia bezpieczeństwa jest zastosowanie funkcji ', ),
        ('escapeHtml', 'b'),
        (' do każdej wartości pochodzącej z bazy lub od użytkownika — zapobiega to wstrzyknięciu znaczników lub skryptów do treści wiadomości (np. gdyby ktoś nazwał test ', ),
        ('<script>', 'm'),
        ('-em). Oprócz tego, temat wiadomości jest tekstem czystym i jest enkodowany przez Nodemailer, co eliminuje analogiczne ryzyko po stronie nagłówków SMTP.', ),
    ])

    add_paragraph(doc, [
        ('Zwraca uwagę szczegół architektoniczny — wszelki błąd w trakcie wysyłki e-maila jest wyłącznie ', ),
        ('logowany', 'i'),
        (', a nie propagowany w górę. Decyzja ta wynika z obserwowanego ograniczenia środowiska produkcyjnego (Railway w niskim planie blokuje połączenia SMTP wychodzące), które uniemożliwiałoby działanie systemu, gdyby brak maila powodował wycofanie przypisania. Przyjęte podejście realizuje wzorzec ', ),
        ('best effort', 'i'),
        (' — kanał in-app jest źródłem prawdy, e-mail to powiadomienie pomocnicze.', ),
    ])

    add_listing(
        doc,
        listing_no='4.46',
        title='Serwis MailService z szablonem HTML i ucieczką znaków',
        file_path='backend-api/src/modules/notifications/mail.service.ts',
        lines='12–67',
        comment=(
            'Listing 4.46 prezentuje funkcję escapeHtml oraz metodę '
            'sendAssignmentNotification. Szablon HTML jest celowo prosty '
            '(inline styles, jeden plik), co eliminuje zależność od '
            'silnika szablonów i potencjalnych podatności jego konfiguracji. '
            'Dane wstawiane do szablonu są uprzednio przepuszczone przez '
            'escapeHtml — żadne dane od użytkownika nie trafiają bezpośrednio '
            'do struktury HTML.'
        ),
    )

    add_heading(doc, 'Frontend — komponent NotificationBell z mechanizmem polling', level=3)

    add_paragraph(doc, [
        ('Po stronie obu aplikacji frontendowych (', ),
        ('client-frontend', 'm'),
        (' oraz ', ),
        ('admin-frontend', 'm'),
        (') prezentację notyfikacji realizuje komponent ', ),
        ('NotificationBell', 'm'),
        (' — ikona dzwonka z liczbowym znacznikiem nieprzeczytanych w prawym górnym rogu nagłówka. Komponent stosuje mechanizm ', ),
        ('polling', 'b'),
        (': bezpośrednio po zamontowaniu wykonuje pierwsze zapytanie o listę powiadomień i licznik nieprzeczytanych, a następnie powtarza je co ', ),
        ('30 sekund', 'b'),
        ('. Wybór polling zamiast bardziej złożonych mechanizmów (WebSocket, Server-Sent Events) jest świadomą decyzją o uproszczeniu architektury — w skali projektu inżynierskiego dodawanie kolejnego protokołu komunikacyjnego nie ma uzasadnienia, a 30-sekundowe opóźnienie informacji jest akceptowalne dla scenariusza powiadomień o testach (te są planowane z wyprzedzeniem dni lub tygodni).', ),
    ])

    add_paragraph(doc, [
        ('Po kliknięciu dzwonka otwierany jest dropdown (na desktopach) lub bottom sheet (na urządzeniach mobilnych) zawierający listę powiadomień. Każde nieprzeczytane powiadomienie ma podświetlone tło i emoji odpowiadające typowi (', ),
        ('📋', 'i'),
        (' dla nowego testu, ', ),
        ('🎉', 'i'),
        (' dla zatwierdzonego konta, ', ),
        ('🚨', 'i'),
        (' dla sygnału ryzyka). Kliknięcie powiadomienia wykonuje optymistyczną aktualizację stanu (oznaczenie jako przeczytane przed potwierdzeniem z serwera) oraz nawigację do ekranu wskazanego w polu ', ),
        ('link', 'm'),
        ('. Dodatkowy przycisk „oznacz wszystkie jako przeczytane" wywołuje endpoint zbiorczy.', ),
    ])

    add_listing(
        doc,
        listing_no='4.47',
        title='Komponent NotificationBell z polling 30s i optymistyczną aktualizacją',
        file_path='client-frontend/src/components/NotificationBell.tsx',
        lines='36–94',
        comment=(
            'Listing 4.47 prezentuje główną logikę komponentu. Hook useEffect '
            'rejestruje setInterval i czyści go w funkcji sprzątającej, co '
            'eliminuje wycieki pamięci przy odmontowaniu. Funkcja markRead '
            'natychmiast aktualizuje stan lokalny, nie czekając na potwierdzenie '
            'z serwera (optimistic update) — daje to wrażenie natychmiastowej '
            'reakcji interfejsu nawet przy wolnym łączu. Drugi useEffect '
            'obsługuje zamykanie dropdownu klawiszem Escape, zapewniając '
            'zgodność z dobrymi praktykami dostępności (WCAG).'
        ),
    )

    add_heading(doc, 'Świadome ograniczenia i kierunki dalszego rozwoju', level=3)

    add_paragraph(doc, [
        ('Moduł notyfikacji w obecnej formie obsługuje dwa kanały (in-app i e-mail) oraz dziewięć typów zdarzeń. Świadomie zrezygnowano z trzech rozszerzeń: ', ),
        ('Web Push', 'b'),
        (' (powiadomienia natywne dostarczane przez Service Workera nawet gdy aplikacja jest zamknięta), ', ),
        ('komunikacji w czasie rzeczywistym', 'b'),
        (' (WebSocket lub Server-Sent Events zastępujący polling) oraz ', ),
        ('przypomnień o nadchodzącym terminie', 'b'),
        (' (zaplanowane zadanie wysyłające notyfikację 24 godziny przed deadline’em). Każde z tych rozszerzeń wymagałoby wprowadzenia dodatkowej infrastruktury (subskrypcje push, kolejka zadań, broker WebSocket), co w skali pracy inżynierskiej stanowiłoby formę over-engineeringu. Wszystkie wymienione kierunki są opisane w sekcji „dalszego rozwoju systemu" i mogą zostać zrealizowane w przyszłej iteracji projektu.', ),
    ])

    add_heading(doc, 'Podsumowanie modułu notyfikacji', level=3)

    add_paragraph(doc, [
        ('Moduł notyfikacji integruje dwa niezależne kanały komunikacji z użytkownikiem: powiadomienia in-app oparte na encji ', ),
        ('Notification', 'm'),
        (' i pollingu z odstępem 30 sekund po stronie klienta oraz wysyłkę wiadomości e-mail przez transport SMTP w trybie best effort. Trwałe powiadomienia są przechowywane w bazie danych z dziewięcioma typami zdarzeń pokrywającymi cykl życia konta pracownika, cykl życia organizacji oraz aktywność związaną z testami. Operacje na powiadomieniach są chronione weryfikacją własności rekordu, a szablon HTML wiadomości e-mail wykorzystuje funkcję ', ),
        ('escapeHtml', 'm'),
        (' eliminującą ryzyko wstrzyknięcia treści. Decyzje architektoniczne — w szczególności wybór polling zamiast WebSocketa, oddzielenie kanałów oraz traktowanie e-maila jako kanału pomocniczego — zostały podjęte świadomie i odpowiadają skali aplikacji oraz ograniczeniom środowiska produkcyjnego.', ),
    ])

    out = '/Users/zelek/MoodFlow/praca-pdf/4.9-Modul-notyfikacji.docx'
    doc.save(out)
    print(f'OK: {out}')


if __name__ == '__main__':
    main()
