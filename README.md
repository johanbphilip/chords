# Chords

A focused app for our church's musicians. See `CONTEXT.md` for the vocabulary and `.scratch/chords-mvp/spec.md` for the plan.

## Running locally

Install once with `pnpm install`, then run each in its own terminal:

| Command | What it does |
| --- | --- |
| `pnpm db` | Starts a local Postgres (data kept in `.pgdata`) on port 54329 |
| `pnpm api` | Starts the NestJS API on port 4000 (needs `DATABASE_URL`, printed by `pnpm db`) |
| `pnpm web` | Starts the Next.js app on port 3000 (the browser reads `NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) |

Example: `DATABASE_URL=postgres://chords:chords@localhost:54329/chords pnpm api`

## Checks

- `pnpm typecheck` checks both apps.
- `pnpm test` runs the API tests against a throwaway real Postgres.
