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
- Run `pnpm check` before finishing. Lint is oxlint (`.oxlintrc.json`) and formatting is oxfmt (`.oxfmtrc.json`); do not add ESLint or Prettier, and fix a lint finding rather than switching its rule off (a narrow inline `oxlint-disable-next-line` with a reason is the exception).
- Tickets are titled `[ABC 1.x] - Short description`, where `ABC` is a short code for the story (`CHD` chord sheet, `ADM` admin and tooling), `1` is the phase and `.x` the ticket (`1.1.1` for a sub-ticket).
- Commit messages are `<ticket id>: <short message>`, such as `ADM 1.1: Add linting`: 75 characters or fewer on the first line, and an optional body in point form (`- ` per point). commitlint enforces this.
