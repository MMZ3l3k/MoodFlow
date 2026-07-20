# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
# Cache-bust etapu builder: Railway serwował stary bundle JS mimo zmian w źródłach
# (COPY . . / npm run build utykały w cache). ARG użyty w RUN realnie unieważnia
# kolejne warstwy. Zmień wartość, by wymusić przebudowę bundla.
ARG SRC_CACHE_BUST=etap2-client-v1
RUN echo "src-cache-bust: ${SRC_CACHE_BUST}"
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
COPY --from=builder /app/dist /usr/share/nginx/html
# Kopiujemy config BEZPOŚREDNIO do conf.d (NIE jako szablon envsubst). Railway
# uruchamia serwis przez startCommand (nginx -g ...), co pomija entrypoint obrazu
# przetwarzający szablony — przez co nginx startował z DOMYŚLNYM configiem
# (brak SPA fallback → deep-linki 404, brak nagłówków bezpieczeństwa). Bezpośredni
# COPY sprawia, że nasz config jest aktywny niezależnie od sposobu startu.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
