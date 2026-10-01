FROM node:22-alpine AS build

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

RUN npm run build && npm prune --omit=dev

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend ./frontend

WORKDIR /app/backend

EXPOSE 40550

CMD ["sh", "-c", "node migrate.js && npm start"]
