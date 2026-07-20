# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Adresy wstrzykiwane na etapie builda (Next zapieka NEXT_PUBLIC_* do bundla).
# Railway przekazuje zmienne serwisu jako build-args; lokalnie fallback z kodu.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLIENT_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLIENT_URL=$NEXT_PUBLIC_CLIENT_URL
RUN npm run build

# Stage 2: run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN chown -R node:node /app
USER node
# next start czyta port ze zmiennej PORT (Railway wstrzykuje własny $PORT;
# lokalnie fallback 3001, zgodny z docker-compose.prod.yml).
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "run", "start"]
