# Turtle Soup Server

NestJS backend for 海龟汤在线联机.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

SQLite tables are created automatically on boot. Built-in soup cases are seeded automatically.

## API

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /soups`
- `POST /soups`
- `GET /rooms/:id`
- `POST /rooms`
- `PATCH /rooms/:id`
- `POST /rooms/:id/questions`
- `PATCH /rooms/:id/questions/:questionId`
- `DELETE /rooms/:id/questions/:questionId`
- Socket.IO namespace default, events: `join-room`, `room-updated`

