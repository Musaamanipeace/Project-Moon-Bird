// update after every commit wherever nessesary only when nessesary.

# 🌙 Moonbug

A wellness and lunar-rhythm companion that aligns your intentions, energy, and
rest with the phases of the moon. Moonbug is a fully functional, production-grade
app — **no mock endpoints, no placeholder data, no static-only UI**.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion
- **Backend:** Go (net/http) with real authentication, challenge progress, and
  calendar endpoints
- **Database:** PostgreSQL (real relational schema, auto-migrated on boot)

---

## Features

### Hybrid, Go-backed authentication
Two independent, real sign-in flows wired to PostgreSQL:

1. **Passwordless Email OTP** — the server generates a 6-digit code, stores a
   hash with a 5-minute TTL, and delivers it over SMTP (or logs it in dev).
2. **Password fallback** — `bcrypt`-hashed passwords as a seamless backup.

Sessions are issued as signed **JWTs stored in http-only secure cookies** and
validated by middleware on every request (sessions can be revoked on logout).

### Atmospheric "Midnight Cosmic" home
- A real-time, **SVG Moon Dial** rendering the current phase, illumination %,
  and days until the next full / new moon.
- An interactive **Lunar Calendar** with a phase icon on every date; click any
  day to view the challenges you completed there.

### The 5 Lunar Challenges (tracked live in PostgreSQL)
1. **New Moon Reflection** — save three intentions for the cycle.
2. **Waxing Crescent Focus** — allocate energy across mind / body / spirit
   with auto-balancing sliders.
3. **Full Moon Release** — a burn-animation journal that fades your releases
   away.
4. **Waning Gibbous Gratitude** — log three things you are grateful for.
5. **Balsamic Moon Rest** — a 4-7-8 breathing timer with expanding ripples.

Each completion awards a badge and feeds your **streak** (computed from
consecutive days with completed challenges).

### Profile
Sign-up date, current / longest streak, earned badges, recent activity, and
toggles for notifications and preferred sign-in method.

---

## Running locally

### 1. Start PostgreSQL
```bash
docker compose up -d          # creates a `moonbug` db on :5432
cp .env.example .env          # DATABASE_URL already points at the container
```

### 2. Install & run (development)
```bash
npm install
npm run dev                   # Vite on :3000 (proxies /api -> Go on :8080)
```
Open **http://localhost:3000**.

### 3. Production build
```bash
npm run build                 # builds the SPA into dist/ and the Go binary into bin/
npm start                     # Go server serves the SPA + API on :3000
```
The Go server binds **0.0.0.0:3000** (override with `PORT`) and runs migrations
automatically against `DATABASE_URL`.

---

## Environment

| Variable        | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `DATABASE_URL`  | PostgreSQL connection string (required)                     |
| `JWT_SECRET`    | JWT signing secret (defaults to a dev secret)                |
| `APP_ENV`       | `production` disables dev OTP reveal + enables Secure cookies |
| `SMTP_*`        | Optional real email delivery for OTP codes                   |
| `PORT`          | HTTP port (default `3000`)                                   |
| `STATIC_DIR`    | Directory the SPA is served from (default `dist`)            |

---

## Project layout
```
backend/                 Go server (auth, challenges, calendar, profile)
  internal/db           connection pool + auto-migration
  internal/auth         JWT, bcrypt, OTP, email
  internal/store        PostgreSQL data access
  internal/handlers     HTTP API + router
  internal/middleware    session-auth middleware
  internal/lunar        moon-phase math (shared algorithm with the frontend)
migrations/001_init.sql portable SQL schema
src/                    React app (pages, components, challenges, context)
scripts/dev.mjs         dev orchestrator (Go API + Vite)
docker-compose.yml      local PostgreSQL
```

## Contributing

We follow Conventional Commits for commit messages. Please create a feature branch, make your changes, run `npm test` (frontend) and `go test ./...` (backend) before committing. Follow the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.
