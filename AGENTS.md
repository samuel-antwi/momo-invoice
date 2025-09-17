# Repository Guidelines

## Project Structure & Module Organization
- `app/app.vue`: root application shell.
- Add features in `app/`, routed views in `pages/`, shared UI in `components/`, utilities in `composables/` (prefix with `use*`), styles in `assets/`, and static files in `public/` (served at `/`).
- Config lives in `nuxt.config.ts` and `tsconfig.json`. Generated code in `.nuxt/` (do not edit) and dependencies in `node_modules/`.

## Build, Test, and Development Commands
- `npm run dev` — start Nuxt dev server at `http://localhost:3000`.
- `npm run build` — production build output in `.nuxt/`.
- `npm run preview` — serve the built app locally for QA.
- `npm run generate` — prerender for SSG (if applicable).
- Post-install runs `nuxt prepare` to generate types.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; prefer TypeScript.
- Vue SFCs: `<script setup lang="ts">` with composables over options API.
- Components: PascalCase (e.g., `components/InvoiceCard.vue`).
- Pages: kebab-case filenames in `pages/` map to routes (e.g., `pages/invoices/[id].vue`).
- Composables: `composables/useThing.ts`; server helpers under `server/` when introduced.
- Avoid committing `.nuxt/` or local env files.

## Testing Guidelines
- Not configured yet. Recommended: Vitest + Nuxt Test Utils.
- Place tests in `tests/` (`tests/unit`, `tests/components`); name `*.spec.ts`.
- Aim for high coverage on core flows (invoice creation, MoMo payment, reminders).

## Commit & Pull Request Guidelines
- Use clear, imperative commits; Conventional Commits encouraged (e.g., `feat: add MoMo payment link`).
- PRs should include: purpose/summary, linked issue or PRD section, screenshots for UI changes, and test/QA notes.
- Keep PRs scoped; separate refactors from features.

## Security & Configuration Tips
- Store secrets in `.env`/`.env.local`; never commit them. Surface via `runtimeConfig` in `nuxt.config.ts` and access with `useRuntimeConfig()`.
- Centralize third‑party integration keys (Supabase, MoMo, messaging) and wrap calls in typed utilities.
- Review `PRD.md` when adding features to align with scope and priorities.
