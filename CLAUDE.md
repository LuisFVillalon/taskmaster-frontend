# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TaskMaster Frontend (product name "Komorebi") — a Next.js 16 (App Router) app that talks to a separate FastAPI backend (`../taskmaster-backend`) and to Supabase directly. It provides task management, notes (Tiptap rich text), habit tracking, a big-picture calendar, a doodle canvas, Canvas LMS assignment import, and an AI debrief panel.

## Commands

```
npm run dev         # start dev server (localhost:3000)
npm run build        # production build
npm run start         # run production build
npm run lint          # ESLint (flat config, eslint-config-next)
npm run test           # vitest run (single pass)
npm run test:watch      # vitest watch mode
```

Run a single test file: `npx vitest run path/to/file.test.ts`. There is no `vitest.config.*` — Vitest runs zero-config off `tsconfig.json`.

## Environment variables

Required in `.env.local` (see `.env` for local values — never print or commit its contents):

- `NEXT_PUBLIC_TASKMASTER_DB_URL` — base URL of the FastAPI backend
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `NEXT_PUBLIC_CANVAS_API_KEY` — Canvas LMS token (optional)
- `NEXT_PUBLIC_SITE_URL` — canonical OAuth redirect base for production only (set in Vercel, not locally); on `localhost` the app always uses `window.location.origin` instead, regardless of this var

## Architecture

### Auth and data-loading flow

- `src/app/layout.tsx` wraps the whole app in `AuthProvider` (Supabase session) → `AppDataProvider` (domain data), mounted once so state survives client-side navigation between `/`, `/calendar`, `/notes`.
- `AppDataProvider` (`src/app/context/AppDataProvider.tsx`) nests four independent context providers — `TasksProvider`, `TagsProvider`, `HabitsProvider`, `NotesProvider` — each wrapping the pre-existing `useTasksAndTags`/`useHabits`/`useNotes` hooks. They're kept separate rather than merged into one context specifically so that, e.g., typing in a note doesn't re-render the task list — don't collapse them into a single context without preserving that isolation.
- Every route's content is gated by `ProtectedPage` (`src/app/components/auth/ProtectedPage.tsx`), which redirects to `/login` when `useAuth()` reports no user.
- All backend calls in `src/app/lib/backend-api.ts` fetch the Supabase access token per-request (`getAuthHeaders`) and throw if there's no session — callers must handle that by redirecting to `/login`, not by catching and ignoring.
- New backend/Supabase accounts can have orphaned (`user_id IS NULL`) rows from before auth existed; `useClaimOrphanedData` calls `claimOrphanedData()` once per session (guarded by a per-user localStorage flag) to attach them to the signed-in user. This runs automatically on sign-in and on `TaskManager` mount.

### Component organization (`src/app/components/`)

Components are grouped by domain, not by type: `auth/`, `calendar/`, `charts/`, `common/` (generic shared UI — modals, pickers, spinners), `doodle/`, `habit/`, `layout/` (cross-domain composition like `CalendarAndStats`, `TaskManagerModals`), `lms/` (Canvas integration), `notes/`, `settings/`, `stats/`, `tag/`, `task/`. When adding a component, match it to the domain it serves rather than defaulting to `common/`.

Note: the repo is mid-reorganization (see `git status` — components were recently moved out of flat `components/` and a `common/`/`canvas/`/`tasks/` split into the domain folders above). Some in-flight renames may still be pending commit; check current file locations rather than trusting older references (including this file's own domain list, which should be kept in sync as folders continue to move).

### State layering inside the main app (`TaskManager.tsx`)

`TaskManager.tsx` is the root client component behind `/` (the dashboard). It composes:
- Domain data from the four contexts above (`useTasksContext`, `useTagsContext`, `useHabitsContext`, `useNotesContext`)
- UI-only local state via dedicated hooks in `src/app/hooks/`: `useTaskManagerState` (modal/panel visibility), `useSplitPanel`/`useResizableSplit` (draggable panel sizing), `useTaskHandlers` (CRUD handler wiring), `useTaskFiltering` (search/filter/sort)
- `mode: 'normal' | 'focus' | 'doodle'` (via `ModeSwitcher`) toggles between the standard layout, a focus layout, and the `DoodleCanvas` overlay

Follow this split when extending the dashboard: data fetching/mutation belongs in a context or `lib/backend-api.ts`, cross-cutting UI state belongs in a `hooks/useXxx` hook, not inlined into `TaskManager.tsx`.

### Theming

- Dark mode follows OS preference only (`prefers-color-scheme`) — there is no manual toggle. An inline `<script>` in `layout.tsx` applies `.dark` to `<html>` before hydration to avoid a flash; a matching check lives in CSS.
- Accent color is user-customizable (Settings → Appearance) via `src/app/lib/theme.ts`, which sets `--tm-accent`/`--tm-accent-hover`/`--tm-accent-subtle`/`--tm-accent-text` as inline CSS custom properties (derived with `color-mix()` and a WCAG luminance check for text contrast) and persists the choice to `localStorage` (`tm_theme_accent`). A second inline `<script>` in `layout.tsx` re-applies the stored color before first paint, mirroring `theme.ts`'s logic — if you change the luminance/derivation formula in `theme.ts`, update that inline script too, or the pre-hydration paint and the post-hydration state will disagree.
- Notebook page style (Settings → Appearance) is stamped as `data-page-style` on `<html>` via a third pre-hydration script, read from `localStorage` key `tm_page_style`.
- `DESIGN.md` documents the underlying "Notion-style warm paper" visual design system (colors, type scale, spacing, component specs) that `globals.css` implements — consult it before making styling decisions.
- On sign-out, all `localStorage` keys prefixed `tm_`, `tm-`, or `komorebi_` are cleared so a different account on the same browser doesn't inherit the previous user's theme/profile/doodle state.

### Path alias

`@/*` maps to `src/*` (see `tsconfig.json`). Prefer `@/app/...` imports over deep relative paths.
