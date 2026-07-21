# Wdrożenie aplikacji MoodFlow

Dokumentacja procesu wdrażania na środowisko produkcyjne.

## Środowiska

| Środowisko | URL | Compose | NODE_ENV |
|---|---|---|---|
| Lokalne (dev) | localhost:3000-5050 | `docker-compose.yml` | `development` |
| Produkcja | <domena> | `docker-compose.prod.yml` | `production` |

## Wymagania

- Docker 24+ z Compose plugin
- Dostęp do managed PostgreSQL 16 (lub własny kontener)
- Domena z certyfikatem TLS (na poziomie load balancera platformy)
- Konto Gmail z włączonym 2FA i wygenerowanym App Password (dla SMTP)

## Krok 1 — Sekrety

Wygeneruj silne sekrety (min. 64 bajty losowe):

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log('DB_PASSWORD=' + require('crypto').randomBytes(24).toString('base64'))"
```

**Wymagania:**
- `JWT_SECRET` ≠ `JWT_REFRESH_SECRET`
- min. 32 znaki, brak słów typu `secret`, `password`, `change_me`
- aplikacja ma fail-fast walidację — startup zatrzymuje się przy słabych sekretach

## Krok 2 — Plik `.env`

Skopiuj `.env.example` do `.env` i wypełnij:

```bash
DB_USER=moodflow
DB_PASSWORD=<wygenerowane>
DB_NAME=moodflow
JWT_SECRET=<wygenerowane>
JWT_REFRESH_SECRET=<wygenerowane>
CORS_ORIGIN=https://app.moodflow.pl,https://panel.moodflow.pl
NEXT_PUBLIC_API_URL=https://api.moodflow.pl
NEXT_PUBLIC_CLIENT_URL=https://app.moodflow.pl
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=moodflow.biuro@gmail.com
MAIL_PASS=<gmail-app-password>
```

**Plik `.env` jest w `.gitignore` — nie commituj.**

## Krok 3 — Schemat bazy

Schemat jest tworzony automatycznie przy pierwszym starcie backendu —
runtime działa z `synchronize: true` (świadoma decyzja dla MVP; uzasadnienie
i plan przejścia na migracje: ADR-005 w [decisions.md](./decisions.md)).
Nie trzeba uruchamiać żadnych migracji ręcznie.

Migracje TypeORM (`npm run migration:*`) są skonfigurowane w `data-source.ts`
(CLI) i przewidziane jako docelowy mechanizm zmian schematu.

## Krok 4 — Start kontenerów

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Healthchecki potwierdzą zdrowie:

```bash
docker compose -f docker-compose.prod.yml ps
# wszystkie powinny mieć status: Up (healthy)
```

## Krok 5 — Konfiguracja DNS i HTTPS

Na platformie chmurowej (Railway / Render / Fly.io):

1. Dodaj custom domeny: `api.moodflow.pl`, `app.moodflow.pl`, `panel.moodflow.pl`.
2. Skonfiguruj rekordy DNS A/AAAA lub CNAME wskazujące na load balancer platformy.
3. TLS jest dostarczany automatycznie (Let's Encrypt).
4. Upewnij się że `CORS_ORIGIN` w env zawiera wszystkie publiczne URL frontendów.

## Krok 6 — Pierwsze logowanie

Domyślne konto super-admina jest tworzone przez seed (`src/seed/users.seed.ts`):

- Email: `owner@moodflow.pl`
- Hasło: wartość zmiennej `SEED_OWNER_PASSWORD` (seed jest pomijany, jeśli zmienna nie jest ustawiona — hasło nie znajduje się w repozytorium)

**WAŻNE: zmień hasło po pierwszym logowaniu w panelu Ustawień.**

## Aktualizacja aplikacji

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Migracje TypeORM wykonają się automatycznie przy starcie nowej wersji.

## Backup bazy danych

### Managed Postgres (Railway/Render)
Automatyczne snapshoty dzienne — konfiguracja po stronie platformy.

### Własny kontener
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

## Monitoring

- **Endpoint health**: `GET /health` — sprawdza połączenie z DB
- **Logi**: `docker compose logs -f backend-api`
- **Audit log**: `GET /audit?limit=100` (rola ADMIN/SUPER_ADMIN)

## Rollback

```bash
# Cofnięcie ostatniej migracji
docker compose -f docker-compose.prod.yml run --rm backend-api npm run migration:revert

# Powrót do poprzedniej wersji obrazu
git checkout <poprzedni-tag>
docker compose -f docker-compose.prod.yml up -d --build
```

## Kontrola bezpieczeństwa po wdrożeniu

- [ ] HTTPS wymuszony (HSTS w Helmet)
- [ ] Cookies `mf_access` i `mf_refresh` mają flagę `Secure` i `SameSite=Strict`
- [ ] Endpoint `/health` odpowiada `200 OK`
- [ ] Endpoint `/auth/login` odpowiada `429` po 11. próbie z tego samego IP
- [ ] Postgres NIE jest dostępny z internetu (tylko `expose`, nie `publish`)
- [ ] `CORS_ORIGIN` zawiera tylko produkcyjne domeny (bez `localhost`)
- [ ] Adminer NIE jest uruchomiony w prod compose
