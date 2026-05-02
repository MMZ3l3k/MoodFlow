# MoodFlow — instrukcja testowania (live)

Aplikacja wdrożona na Railway. Pełny flow do przetestowania w 15 minut.

## Linki

| Panel | URL |
|---|---|
| Pracownik | https://innovative-presence-production.up.railway.app |
| Admin firmy / HR | https://lavish-bravery-production.up.railway.app/login |
| Właściciel platformy | https://lavish-bravery-production.up.railway.app/super-admin/login |
| Backend API health | https://moodflow-production.up.railway.app/health |

## Konto super-admina

- Email: `owner@moodflow.pl`
- Hasło: `SuperAdmin1!`

## Pełny flow testowy

1. **Rejestracja firmy** — `lavish-bravery.../login` → „Załóż konto firmy" → wypełnij dane (NIP dowolny np. `1234567890`)
2. **Zatwierdzenie firmy** (incognito) — zaloguj się jako super-admin → zatwierdź firmę
3. **Login admin firmy** — w `lavish-bravery.../login` użyj danych z kroku 1 → skopiuj `inviteCode` (`MOOD-XXXX`)
4. **Rejestracja pracownika** — `innovative-presence.../register` → użyj `inviteCode`
5. **Zatwierdź pracownika** — z poziomu admina firmy (panel „Oczekujący")
6. **Przypisz test** — admin/HR → „Zaplanuj test" → PHQ-9 / ALL / 24h
7. **Wypełnij test** — zaloguj jako pracownik → wypełnij → zobacz wynik + Wellbeing Index
8. **Panel HR** — Analityka, statystyki działowe (anonimizowane dla grup <5 osób)

## Znane ograniczenia

- Maile nie działają (Railway blokuje SMTP) — pracownik nie dostanie emaila o nowym teście
- Hobby tier Railway — możliwe chwilowe 502 jeśli aplikacja zasypia
