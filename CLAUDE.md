# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands must be run from the `client/` directory unless stated otherwise.

```bash
# Dev server
npm run dev

# Build (TypeScript check + Vite bundle)
npm run build

# TypeScript type check only
npx tsc --noEmit

# Run all tests
npm run test -- run

# Run a single test file
npm run test -- run src/components/__tests__/Modal.test.tsx

# Lint
npm run lint
```

> **Critical:** Always use `npm run test -- run` (not `npx vitest`). The `npx` binary is a cached version that cannot resolve the `jsdom` environment. The `test` script in `package.json` invokes the local `node_modules/.bin/vitest`.

## Architecture

MediStock is a medication tracker. The frontend communicates **directly with Supabase** — there is no custom backend server. Server-side logic lives exclusively in Supabase Edge Functions (Deno).

```
medicine-tracker/
├── client/                    # React 19 + Vite 8 + TypeScript SPA
│   └── src/
│       ├── lib/supabase.ts    # Supabase client singleton
│       ├── context/AuthContext.tsx  # Auth state (session, user, signIn/Out/Up)
│       ├── types/index.ts     # All shared TypeScript interfaces
│       ├── services/          # Raw Supabase calls (no React)
│       ├── hooks/             # TanStack Query wrappers around services
│       ├── utils/
│       │   ├── restock.ts     # calcRestockDate / isRestockDue (pure, UTC-safe)
│       │   └── dates.ts       # date-fns helpers with es locale
│       ├── components/        # UI primitives + domain components
│       └── pages/             # Route-level components
├── supabase/
│   ├── migrations/            # SQL run once in Supabase Dashboard SQL Editor
│   └── functions/             # Deno Edge Functions (check-stock, check-expiration, send-daily-summary, check-doses)
└── DEPLOY.md                  # Step-by-step deployment instructions
```

### Data flow

1. **Auth:** `AuthContext` → Supabase Auth → session stored in `localStorage` by the SDK.
2. **Data:** Pages consume hooks (`useMedications`, `useDoseLogs`, etc.) → hooks call services → services call `supabase.from(...)`.
3. **Mutations:** Hooks use `useMutation` and call `queryClient.invalidateQueries` on success to keep the cache fresh.
4. **Real-time alerts:** `useUnreadAlertsCount` in `hooks/useAlerts.ts` opens a Supabase Realtime channel on the `alerts` table for the current user.
5. **Dose scheduling:** `buildTodaySchedule` in `services/doseLogs.ts` is a pure function that computes today's expected doses from `medications[]` + `todayLogs[]`. It runs in the browser — there is no scheduled job for this.

### Key design decisions

- **`mark_dose_taken` RPC:** Marking a dose taken is an atomic PostgreSQL function (`supabase/migrations/001_initial_schema.sql`) that decrements stock and creates a `low_stock` alert in a single transaction. Always use `useMarkDoseTaken()` / `markDoseTaken()` for this — never write directly to `dose_logs` for "taken" status.
- **`useMedications(activeOnly?)` flag:** Pass `false` to include inactive medications (used in Inventario's "Todos" filter and Historial's export).
- **`isRestockDue` uses UTC comparisons** (`Date.UTC(...)`) to avoid timezone-offset issues when comparing dates.
- **`dose_times` is stored as JSONB** in Postgres (array of `"HH:MM"` strings). In TypeScript it's `string[]`.
- **Medications with dose logs cannot be hard-deleted** (FK `ON DELETE RESTRICT`). Use `deactivateMedication` / `useDeactivateMedication` instead.

### Tailwind CSS

This project uses **Tailwind v4** with the Vite plugin (`@tailwindcss/vite`). There is no `tailwind.config.js`. All custom tokens are declared in `src/index.css` under `@theme {}`:
- Custom brand scale: `health-50` through `health-900` (green).
- Use `bg-health-500`, `text-health-600`, `ring-health-400`, etc. in classNames.
- Do **not** create a `tailwind.config.js` — it will be ignored.

### Testing

- Tests live in `src/**/__tests__/*.test.tsx` co-located with the code they test.
- Test setup: `src/test/setup.ts` (imports `@testing-library/jest-dom`).
- Vitest config: `vitest.config.ts` (separate from `vite.config.ts` — required for jsdom to work on Windows).
- **Mocking pattern for page tests:** Page components render child components (e.g. `MedicationCard` → `RestockDateChip` → `calcRestockDate`). When testing pages, mock all utility modules that sub-components depend on to avoid rendering errors:
  ```ts
  vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null), isRestockDue: vi.fn(() => false) }))
  vi.mock('../../utils/dates', () => ({ daysUntil: vi.fn(() => 60), formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))
  ```
- **jsPDF constructor mock:** Must use a `function` expression (not an arrow function) to be `new`-able:
  ```ts
  const MockJsPDF = vi.fn(function(this: unknown) { return mockDoc })
  ```

### Supabase project

- **Project ID:** `rciwjlumhcspitcribsr` (sa-east-1, South America)
- **URL:** `https://rciwjlumhcspitcribsr.supabase.co`
- Credentials live in `client/.env.local` (gitignored). See `DEPLOY.md` for setup.
- Migrations are applied manually via Supabase Dashboard → SQL Editor (not via `supabase db push`).
