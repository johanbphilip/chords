# Chords

A stripped-down alternative to Ultimate Guitar (ultimate-guitar.com), focused only on the core
features of finding, reading and playing guitar tabs and chord sheets.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Conventions

- The Next.js app fetches all data with TanStack Query, through the helpers in `apps/web/lib/api.ts`.
