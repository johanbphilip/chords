# Chords

A focused app for our church's musicians. See `CONTEXT.md` for the vocabulary and `.scratch/chords-mvp/spec.md` for the plan.

## Running locally

Install once with `pnpm install`, then run each in its own terminal:

| Command | What it does |
| --- | --- |
| `pnpm db` | Starts a local Postgres (data kept in `.pgdata`) on port 54329 |
| `pnpm migrate` | Applies pending database migrations from `apps/api/migrations` (needs `DATABASE_URL`). Run it once after `pnpm db`, and after pulling new migrations |
| `pnpm api` | Starts the NestJS API on port 4000 (needs `DATABASE_URL`, printed by `pnpm db`) |
| `pnpm web` | Starts the Next.js app on port 3000 (the browser reads `NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) |

`pnpm migrate` and `pnpm api` read `apps/api/.env` if it exists (copy `apps/api/.env.example`; the file is gitignored). Variables already set in the shell win over the file.

Example: `DATABASE_URL=postgres://chords:chords@localhost:54329/chords ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=Password123 BETTER_AUTH_SECRET=<32+ random characters> pnpm api`

`ADMIN_EMAIL` and `ADMIN_PASSWORD` define the one Admin that exists from the start. The API refuses to start if the Admin does not exist yet and `ADMIN_PASSWORD` is missing. The password is used only when the account is first created; after that the Admin changes it on their profile page or with a reset link, and restarts never overwrite it. `ADMIN_NAME` (default "Admin") is the Admin's display name. `Password123` is a placeholder for local development only. `BETTER_AUTH_SECRET` signs sessions and is required in production. Set `BETTER_AUTH_URL` to the API's public address if it is not `http://localhost:4000`, and `WEB_ORIGIN` to the web app's address if it is not `http://localhost:3000`.

## Email

Invite and password reset emails go through Resend. Set `RESEND_API_KEY` to send them, and `EMAIL_FROM` to the sender. Without a key the API only logs what it would have sent, and the Admin copies invite and reset links from the Admin page instead. Until the church has a domain verified with Resend, expect its sample sender to deliver only to the Resend account's own address (not yet verified), so copying links is the dependable route.

Requests are rate limited per client IP. See `docs/adr/0003-in-memory-rate-limiting-in-the-api.md` for the settings and their limits.

## Database

The schema lives in numbered SQL files in `apps/api/migrations`, applied by `pnpm migrate` and tracked in the `pgmigrations` table. The API does not create tables; it refuses to start on a database that has not been migrated. Add a change as a new file (`002_name.sql`) with `-- Up Migration` and `-- Down Migration` sections, never by editing an applied one.

The only setting that differs between databases is `DATABASE_URL`, so the same code runs on a local, test (e.g. Supabase) or self-hosted Postgres. See `docs/adr/0005-portable-postgres-with-versioned-migrations.md`.

Supabase is the test database and production will be a different, fresh one, so data is not carried between them: run `pnpm migrate` against the new database and the schema is built from the migrations. Moving real data (a `pg_dump` and `pg_restore` of the `public` schema) has not been rehearsed, so test it on a copy before relying on it. On a managed provider, use the connection that supports sessions (a direct or session-mode connection), because migrations take an advisory lock; a transaction-mode pooler does not support it. On Supabase, `pnpm migrate` was verified with the direct connection (`db.<ref>.supabase.co:5432`). The direct host is IPv6-only on the free tier, so fall back to the session pooler (port 5432) from an IPv4-only network.

## Design decisions

Architecture and access decisions are in `docs/adr/`: the stack (0001), Better Auth and bearer tokens (0002), rate limiting (0003), invite links and Admin-managed access (0004), and the portable Postgres rules (0005). Tickets 23 to 28 in `.scratch/chords-mvp/issues/` build the access design.

## Checks

- `pnpm typecheck` checks both apps.
- `pnpm test` runs the API tests against a throwaway real Postgres.
