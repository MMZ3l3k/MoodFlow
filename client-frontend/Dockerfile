# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Adresy wstrzykiwane na etapie builda (Vite zapieka import.meta.env do bundla).
# Railway przekazuje zmienne serwisu jako build-args; lokalnie fallback z kodu.
ARG VITE_API_URL
ARG VITE_ADMIN_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ADMIN_URL=$VITE_ADMIN_URL
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine
# Cache-bust: Railway nie zinwalidował warstwy COPY nginx.conf przy zmianie pliku
# (deploy d028a88 serwował stary config bez nagłówków bezpieczeństwa). Nowa instrukcja
# ARG wymusza przebudowę całego etapu nginx od tego miejsca. Zmień wartość, by ponowić.
ARG NGINX_CACHE_BUST=etap2-security-headers
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx.conf jako szablon — obraz nginx uruchamia envsubst na starcie
# i podstawia ${PORT} (Railway wstrzykuje własny $PORT; lokalnie fallback 80).
# envsubst podstawia tylko zdefiniowane zmienne env, więc $uri/$http_pragma zostają nietknięte.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
