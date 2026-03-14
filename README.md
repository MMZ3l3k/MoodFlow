# MoodFlow

System do monitorowania nastrojów pracowników w organizacji.

## Struktura projektu

```
MoodFlow/
├── client-frontend/      # Aplikacja React dla pracowników (port 3000)
├── admin-frontend/       # Panel administracyjny Next.js (port 3001)
├── backend-api/          # API NestJS (port 4000)
├── mysql/                # Konfiguracja bazy danych MySQL
├── docker-compose.yml
├── .env.example
└── README.md
```

## Wymagania

- [Docker](https://www.docker.com/) i Docker Compose
- Node.js 20+ (do lokalnego developmentu)

## Uruchomienie projektu

### 1. Sklonuj repozytorium i przejdź do katalogu projektu

```bash
git clone <url-repozytorium>
cd MoodFlow
```

### 2. Skonfiguruj zmienne środowiskowe

```bash
cp .env.example .env
```

Edytuj plik `.env` i ustaw odpowiednie wartości (hasła, sekrety JWT itp.).

### 3. Uruchom projekt za pomocą Docker Compose

```bash
docker-compose up --build
```

Aby uruchomić w tle:

```bash
docker-compose up --build -d
```

### 4. Dostęp do aplikacji

| Serwis              | Adres                   |
|---------------------|-------------------------|
| Aplikacja kliencka  | http://localhost:3000   |
| Panel admina        | http://localhost:3001   |
| API (NestJS)        | http://localhost:4000   |
| MySQL               | localhost:3306          |

## Zatrzymanie projektu

```bash
docker-compose down
```

Aby usunąć również wolumeny (dane bazy danych):

```bash
docker-compose down -v
```

## Lokalny development (bez Dockera)

### Backend API (NestJS)

```bash
cd backend-api
npm install
npm run start:dev
```

### Client Frontend (React + Vite)

```bash
cd client-frontend
npm install
npm run dev
```

### Admin Frontend (Next.js)

```bash
cd admin-frontend
npm install
npm run dev
```

## Technologie

- **client-frontend**: React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router
- **admin-frontend**: Next.js 16, TypeScript, Tailwind CSS
- **backend-api**: NestJS, TypeScript
- **baza danych**: MySQL 8.0
