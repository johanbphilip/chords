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
- Forms are built with `useAppForm` (`apps/web/components/form`), shadcn `Field` components and a Zod schema from `@chords/shared` in `validators`. Do not hand-write validation in either app: add or change a schema in `packages/shared/src/schemas`, where the API's `ZodPipe` and the web forms both pick it up.
- Use a shadcn component from `apps/web/components/ui` before writing raw HTML for the same job; add a missing one with `pnpm exec shadcn add <name>` from `apps/web`.
- Pure logic that both apps need (the chord sheet module, schemas) lives in `packages/shared`, as extensionless-import TypeScript source. See `docs/adr/0006-shared-package-and-zod-schemas.md`.
