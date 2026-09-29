FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

EXPOSE 40550

CMD ["sh", "-c", "node migrate.js && npm start"]
