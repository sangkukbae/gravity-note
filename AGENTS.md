# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js 14 App Router pages, layouts, API routes.
- `components/`: Reusable UI components (PascalCase folders/files).
- `lib/`: Client/server utilities, data and auth helpers.
- `hooks/`: Reusable React hooks.
- `types/`: Shared TypeScript types.
- `sql/`: SQL artifacts and migrations.
- `public/`: Static assets (icons, images, PWA files).
- `tests/`: Unit/integration tests; `e2e/`: Playwright tests.
- `docs/`: Design notes and contributor docs.

## Build, Test, and Development Commands

- `pnpm dev`: Start local dev server (cleans `.next/`).
- `pnpm build`: Production build via Next.js.
- `pnpm start`: Run built app.
- `pnpm lint` / `pnpm lint:fix`: Lint (Next + ESLint) and auto‑fix.
- `pnpm format` / `pnpm format:check`: Prettier write/check.
- `pnpm type-check`: TypeScript project check.
- `pnpm test` / `pnpm test:coverage`: Vitest unit/integration and coverage.
- `pnpm e2e` / `pnpm e2e:ui`: Playwright headless/UI runner.

## Coding Style & Naming Conventions

- Language: TypeScript (Node ≥ 18). Framework: Next.js 14, React 18.
- Prettier: 2 spaces, single quotes, no semicolons, 80 print width.
- ESLint: `next/core-web-vitals` + `prettier`; no `debugger`, limited `console`.
- Components: `PascalCase` (e.g., `components/Auth/UserMenu.tsx`).
- Tests: colocated under `tests/` mirroring folder names.

## Testing Guidelines

- Frameworks: Vitest + Testing Library (jsdom). E2E: Playwright.
- Naming: `tests/**/*.test.{ts,tsx}` (unit/integration); `e2e/**/*` for E2E.
- Coverage (Vitest): global ≥ lines 80%/statements 80%; stricter for auth.
- Setup: `tests/setup.ts` auto‑loaded; use helpers in `tests/utils/`.

## Commit & Pull Request Guidelines

- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `docs:`). Emojis are OK.
- Reference issues/PRs (e.g., `(#12)`), use present tense and concise scope.
- PRs must include: summary, linked issue, test plan, and screenshots/GIFs for UI.
- Required checks: `pnpm type-check`, `pnpm lint`, `pnpm test`, and if applicable `pnpm e2e`.

## Security & Configuration

- Use `.env.local` (see `.env.local.example`); never commit secrets.
- Run locally on `http://localhost:3000`. Tailwind and PWA are preconfigured.
- Aliases: import root as `@/...` per `vitest.config.ts`.
