# Chords

A focused app for our church's musicians. See `CONTEXT.md` for the vocabulary and `.scratch/chords-mvp/spec.md` for the plan.

## Running locally

Install once with `pnpm install`, then run each in its own terminal:

| Command | What it does |
| --- | --- |
| `pnpm db` | Starts a local Postgres (data kept in `.pgdata`) on port 54329 |
| `pnpm api` | Starts the NestJS API on port 4000 (needs `DATABASE_URL`, printed by `pnpm db`) |
| `pnpm web` | Starts the Next.js app on port 3000 (the browser reads `NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) |

Example: `DATABASE_URL=postgres://chords:chords@localhost:54329/chords ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=Password123 pnpm api`

`ADMIN_EMAIL` and `ADMIN_PASSWORD` define the one Admin that exists from the start. The API refuses to start with one but not the other, and the password in the environment is applied on every start, so change it there. `Password123` is a placeholder for local development only.

## Checks

- `pnpm typecheck` checks both apps.
- `pnpm test` runs the API tests against a throwaway real Postgres.
