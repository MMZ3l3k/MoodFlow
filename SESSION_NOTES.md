# Notatki z sesji — 2026-05-01

## Co zrobiliśmy w tej sesji

### 1. Uruchomienie projektu
- `docker-compose up -d` — wszystko działa
- Baza wyczyszczona (firmy, pracownicy, wyniki) — zostaje tylko owner

### 2. Dane logowania
| Rola | URL | Email | Hasło |
|------|-----|-------|-------|
| Super Admin (właściciel) | localhost:3001/super-admin/login | owner@moodflow.pl | SuperAdmin1! |
| Admin / HR | localhost:3001/login | — | — |
| Pracownik | localhost:3000/login | — | — |

### 3. PWA — zaimplementowane
**client-frontend:**
- `vite-plugin-pwa` z `--legacy-peer-deps` (vite 8 wymaga tego)
- `manifest.webmanifest` + ikony SVG (192px, 512px)
- `nginx.conf` z SPA fallback i cache service workera
- `vite.config.ts` zaktualizowany z konfiguracją PWA + workbox

**admin-frontend:**
- Ręczny `public/sw.js` + komponent `SwRegister.tsx`
- Powód: next-pwa i @ducanh2912/next-pwa nie działają z Next.js 16 Turbopack
- `public/manifest.json` + ikony SVG

### 4. Produkcyjne Dockerfiles — zaimplementowane
Wszystkie 3 serwisy zmienione z trybu dev na produkcyjny:
- `client-frontend`: multi-stage → nginx serwuje statyczny build
- `admin-frontend`: multi-stage → `next start -p 3001`
- `backend-api`: multi-stage → `node dist/main`
- `.dockerignore` dodany do każdego serwisu
- `railway.json` dodany do każdego serwisu (przygotowanie pod Railway)

### 5. UI Upgrade — inspiracje z cbms-main (c:\Users\mateu\Desktop\cbms-main)
Zaadaptowane wzorce z aplikacji CBMS:

**Zainstalowane biblioteki (obie aplikacje):**
- `framer-motion` — animacje
- `lucide-react` — spójne ikony
- `sonner` — toasty
- `next-themes` — tryb ciemny (admin)

**Zmiany wizualne:**
- Sidebar admin przebudowany: ciemny gradient (`from-gray-900 to-gray-950`), lucide ikony, `layoutId` spring animation aktywnej zakładki, hover z przesunięciem x+2
- `GlassCard` komponent w obu aplikacjach (`bg-white/70 backdrop-blur-xl rounded-2xl`)
- `Providers.tsx`: ThemeProvider + Sonner Toaster
- Animacje przejść stron (`AnimatePresence` + `key={pathname}`) w obu aplikacjach

### 6. Decyzja: zachować dwa osobne frontendy
Rozważaliśmy scalenie do jednej aplikacji (jak CBMS). Decyzja: NIE.
**Uzasadnienie do pracy inżynierskiej:**
- React/Vite = mobile-first PWA dla pracownika
- Next.js = desktop-first panel admina
- Separacja eliminuje ryzyko wycieku kodu admina
- Więcej technologii do opisania

---

## Co jest do zrobienia (następna sesja)

### Priorytet wysoki
- [ ] Deployment — zdecydować: Railway ($5/mies) vs Oracle Cloud (darmowy)
- [ ] Testy aplikacji — scenariusze testowe do pracy inżynierskiej
- [ ] Weryfikacja wszystkich endpointów API

### Priorytet średni
- [ ] Dark mode w admin-frontend (ThemeProvider już jest, brakuje toggle w sidebarze)
- [ ] Skeleton loading states (zamiast pustych ekranów podczas ładowania)
- [ ] Eksport PDF/CSV raportów HR

### Priorytet niski
- [ ] Powiadomienia e-mail (MAIL_HOST skonfigurowane w .env.example)
- [ ] Zaawansowane alerty HR (progi ryzyka)

---

## Struktura projektu (przypomnienie)

```
MoodFlow/
├── client-frontend/    # React + Vite + Redux — port 3000 (pracownik)
├── admin-frontend/     # Next.js — port 3001 (admin, HR, super-admin)
├── backend-api/        # NestJS + TypeORM + PostgreSQL — port 4000
├── docker-compose.yml
├── .env.example
└── SESSION_NOTES.md    # ten plik
```

## Uruchomienie na nowym komputerze

```bash
git clone <repo>
cd MoodFlow
cp .env.example .env
# uzupełnij .env (JWT_SECRET, JWT_REFRESH_SECRET, DB_PASSWORD)
docker-compose up -d
```

Seed owner tworzy się automatycznie przy starcie backendu.

---

## Kontekst techniczny — ważne niuanse

- **vite-plugin-pwa** wymaga `--legacy-peer-deps` bo vite 8 jest za nowy
- **next-pwa** nie działa z Next.js 16 (Turbopack conflict) — używamy ręcznego SW
- **PostgreSQL** zamiast MySQL (zmiana z wczesnej fazy projektu)
- **Branch**: `eksperyment-multi-tenant` — tu są wszystkie aktualne zmiany
- **Seed** uruchamia się w `main.ts` backendu przy każdym starcie (idempotentny)
- **User.status** w admin-frontend types musi zawierać `'suspended'` (naprawione)
