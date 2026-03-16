# MediStock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir MediStock, una aplicación web completa de gestión de medicamentos con inventario, dosis, alertas y exportaciones.

**Architecture:** Frontend React/Vite/TypeScript que se comunica directamente con Supabase (Auth + PostgreSQL + Realtime). La lógica server-side vive en Supabase Edge Functions (Deno) disparadas por pg_cron. Emails vía Resend. Sin servidor propio.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS, TanStack Query v5, Supabase JS, date-fns, jsPDF, SheetJS, Supabase Edge Functions (Deno), Resend.

---

## File Map

```
medicine-tracker/
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.local                        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│   ├── package.json
│   └── src/
│       ├── main.tsx                       # Entry point, QueryClientProvider, BrowserRouter
│       ├── App.tsx                        # Route definitions
│       ├── lib/
│       │   └── supabase.ts               # Supabase client singleton
│       ├── types/
│       │   └── index.ts                  # All TypeScript interfaces (Profile, Medication, DoseLog, Alert)
│       ├── context/
│       │   └── AuthContext.tsx           # Auth state, session, user, signIn/signOut/signUp
│       ├── utils/
│       │   ├── restock.ts               # calcRestockDate() con guard división por cero
│       │   └── dates.ts                 # date-fns helpers con locale es
│       ├── services/
│       │   ├── medications.ts           # CRUD medications table
│       │   ├── doseLogs.ts             # dose_logs ops + mark_dose_taken RPC
│       │   ├── alerts.ts               # alerts read/mark-read
│       │   ├── export.ts               # PDF (jsPDF) + Excel (SheetJS) generation
│       │   └── profile.ts              # fetchProfile, updateProfile
│       ├── hooks/
│       │   ├── useMedications.ts        # TanStack Query: medications
│       │   ├── useDoseLogs.ts          # TanStack Query: dose_logs
│       │   ├── useAlerts.ts            # TanStack Query + Realtime: alerts
│       │   └── useProfile.ts           # TanStack Query: profile
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Badge.tsx           # Primitivo badge genérico
│       │   │   ├── Button.tsx          # Primitivo botón con variantes
│       │   │   ├── Card.tsx            # Contenedor card
│       │   │   └── Modal.tsx           # Modal desktop / drawer mobile
│       │   ├── Layout.tsx              # Navbar + contenedor de página
│       │   ├── AuthGuard.tsx           # HOC: redirige a /login si no hay sesión
│       │   ├── StockBadge.tsx          # Verde/Amarillo/Rojo según nivel de stock
│       │   ├── ExpirationBadge.tsx     # Verde/Amarillo/Rojo según días hasta vencimiento
│       │   ├── RestockDateChip.tsx     # Chip con fecha de recompra calculada
│       │   ├── MedicationCard.tsx      # Tarjeta de medicamento con todos los badges
│       │   ├── DoseTracker.tsx         # Ítem de dosis diaria con checkbox
│       │   ├── NotificationBell.tsx    # Ícono campana + badge + suscripción Realtime
│       │   └── MedicationForm.tsx      # Formulario crear/editar medicamento (modal/drawer)
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── ResetPassword.tsx
│           ├── Dashboard.tsx
│           ├── Inventario.tsx
│           ├── MedicamentoDetalle.tsx
│           ├── Historial.tsx
│           ├── Notificaciones.tsx
│           └── Configuracion.tsx
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Schema completo + RLS + RPC mark_dose_taken + pg_cron
│   └── functions/
│       ├── _shared/
│       │   └── resend.ts               # Helper de email compartido entre functions
│       ├── check-stock/
│       │   └── index.ts
│       ├── check-expiration/
│       │   └── index.ts
│       ├── send-daily-summary/
│       │   └── index.ts
│       └── check-doses/
│           └── index.ts
└── docs/
    └── superpowers/
        ├── specs/
        └── plans/
```

---

## Chunk 1: Project Setup & Base de Datos

### Task 1: Inicializar proyecto React/Vite

**Files:**
- Create: `client/` (scaffolding via Vite)
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/package.json`

- [ ] **Step 1: Crear proyecto Vite con template React + TypeScript**

```bash
cd medicine-tracker
npm create vite@latest client -- --template react-ts
cd client
```

- [ ] **Step 2: Verificar que el scaffolding fue correcto**

```bash
ls client/src
```
Expected: `App.css  App.tsx  assets/  index.css  main.tsx  vite-env.d.ts`

- [ ] **Step 3: Instalar todas las dependencias**

```bash
cd client
npm install \
  @supabase/supabase-js \
  @tanstack/react-query \
  react-router-dom \
  date-fns \
  jspdf \
  jspdf-autotable \
  xlsx \
  lucide-react
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/node \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

- [ ] **Step 4: Verificar que no hubo errores de instalación**

```bash
cat client/package.json | grep '"dependencies"' -A 20
```
Expected: ver todas las dependencias listadas sin errores.

- [ ] **Step 5: Inicializar git en la raíz del proyecto y hacer primer commit**

```bash
# Ejecutar desde medicine-tracker/ (raíz del repo), no desde client/
cd ..   # si estás dentro de client/, subir un nivel
git init
git add client/package.json client/package-lock.json client/vite.config.ts client/tsconfig.json client/tsconfig.node.json client/index.html
git commit -m "feat: scaffold Vite React TypeScript project"
```
> Todos los commits siguientes también se ejecutan desde `medicine-tracker/` como raíz del repo.

---

### Task 2: Configurar TailwindCSS

**Files:**
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Modify: `client/src/index.css`

- [ ] **Step 1: Inicializar Tailwind**

```bash
cd client
npx tailwindcss init -p
```

- [ ] **Step 2: Configurar tailwind.config.js con colores del proyecto**

Reemplazar el contenido de `client/tailwind.config.js` con:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        health: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Reemplazar client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 text-slate-900 antialiased;
  }
}
```

- [ ] **Step 4: Verificar que Tailwind compila correctamente**

```bash
cd client && npm run dev
```
Expected: servidor en http://localhost:5173 sin errores de compilación. Ctrl+C para detener.

- [ ] **Step 5: Commit**

```bash
cd client
git add tailwind.config.js postcss.config.js src/index.css
git commit -m "feat: configure TailwindCSS with health color palette"
```

---

### Task 3: Configurar Vitest

**Files:**
- Modify: `client/vite.config.ts`
- Create: `client/src/test/setup.ts`

- [ ] **Step 1: Actualizar vite.config.ts para incluir Vitest**

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 2: Crear archivo de setup de tests**

```typescript
// client/src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Agregar script de test en package.json**

En `client/package.json`, agregar en `"scripts"`:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Verificar que Vitest arranca**

```bash
cd client && npx vitest run
```
Expected: `No test files found` — correcto, aún no hay tests.

- [ ] **Step 5: Commit**

```bash
cd client
git add vite.config.ts src/test/setup.ts package.json
git commit -m "chore: configure Vitest with jsdom and testing-library"
```

---

### Task 4: Escribir migración SQL completa

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Crear estructura de carpetas Supabase**

```bash
mkdir -p supabase/migrations supabase/functions/_shared
```

- [ ] **Step 2: Crear el archivo de migración**

```sql
-- supabase/migrations/001_initial_schema.sql

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE profiles (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name              TEXT,
  email                  TEXT,
  notification_email     TEXT,
  restock_margin_days    INTEGER NOT NULL DEFAULT 5,
  timezone               TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  daily_summary_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: medications
-- ============================================================
CREATE TABLE medications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  quantity_current NUMERIC NOT NULL DEFAULT 0,
  quantity_minimum NUMERIC NOT NULL DEFAULT 0,
  quantity_unit    TEXT NOT NULL DEFAULT 'unidades',
  dose_amount      NUMERIC NOT NULL DEFAULT 1,
  dose_frequency   TEXT,
  dose_times       JSONB NOT NULL DEFAULT '[]'::JSONB,
  expiration_date  DATE,
  purchase_date    DATE,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: dose_logs
-- ============================================================
CREATE TABLE dose_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id  UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
  taken_at       TIMESTAMPTZ,
  scheduled_at   TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'missed')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: alerts
-- ============================================================
CREATE TABLE alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id  UUID REFERENCES medications(id) ON DELETE RESTRICT,
  type           TEXT NOT NULL CHECK (type IN ('low_stock', 'expiration', 'dose_reminder', 'restock_date')),
  message        TEXT NOT NULL,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: mark_dose_taken (atómica)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_dose_taken(
  p_medication_id UUID,
  p_scheduled_at  TIMESTAMPTZ
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Registrar la toma
  INSERT INTO dose_logs (user_id, medication_id, taken_at, scheduled_at, status)
  VALUES (v_user_id, p_medication_id, NOW(), p_scheduled_at, 'taken');

  -- 2. Decrementar stock
  UPDATE medications
  SET quantity_current = quantity_current - dose_amount
  WHERE id = p_medication_id AND user_id = v_user_id;

  -- 3. Crear alerta low_stock si corresponde (con dedup)
  INSERT INTO alerts (user_id, medication_id, type, message)
  SELECT m.user_id, m.id, 'low_stock', 'Stock bajo en ' || m.name
  FROM medications m
  WHERE m.id = p_medication_id
    AND m.user_id = v_user_id
    AND m.quantity_current <= m.quantity_minimum
    AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.medication_id = p_medication_id
        AND a.type = 'low_stock'
        AND a.is_read = FALSE
    );
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts     ENABLE ROW LEVEL SECURITY;

-- profiles: usuario ve y edita solo el suyo
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- medications
CREATE POLICY "medications_own" ON medications
  FOR ALL USING (auth.uid() = user_id);

-- dose_logs
CREATE POLICY "dose_logs_own" ON dose_logs
  FOR ALL USING (auth.uid() = user_id);

-- alerts
CREATE POLICY "alerts_own" ON alerts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: habilitar para tabla alerts
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_medications_user_id   ON medications(user_id);
CREATE INDEX idx_medications_active    ON medications(user_id, active);
CREATE INDEX idx_dose_logs_user_id     ON dose_logs(user_id);
CREATE INDEX idx_dose_logs_med_sched   ON dose_logs(medication_id, scheduled_at);
CREATE INDEX idx_alerts_user_unread    ON alerts(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- PG_CRON: programar Edge Functions
-- IMPORTANTE: ejecutar este bloque DESPUÉS de desplegar las Edge Functions (Chunk 6).
-- Reemplazar <PROJECT_REF> con el ID de tu proyecto Supabase (ej: abcdefghijklmnop).
-- La URL de cada función sigue el patrón:
--   https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
-- El service_role key se obtiene en: Dashboard → Settings → API → service_role secret.
-- ============================================================
-- SELECT cron.schedule(
--   'check-stock', '0 0 * * *',
--   $$SELECT net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/check-stock',
--     '{}', 'application/json',
--     ARRAY[http_header('Authorization','Bearer <SERVICE_ROLE_KEY>')])$$
-- );
-- SELECT cron.schedule(
--   'check-expiration', '5 0 * * *',
--   $$SELECT net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/check-expiration',
--     '{}', 'application/json',
--     ARRAY[http_header('Authorization','Bearer <SERVICE_ROLE_KEY>')])$$
-- );
-- SELECT cron.schedule(
--   'send-daily-summary', '0 7 * * *',
--   $$SELECT net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-summary',
--     '{}', 'application/json',
--     ARRAY[http_header('Authorization','Bearer <SERVICE_ROLE_KEY>')])$$
-- );
-- SELECT cron.schedule(
--   'check-doses', '0 * * * *',
--   $$SELECT net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/check-doses',
--     '{}', 'application/json',
--     ARRAY[http_header('Authorization','Bearer <SERVICE_ROLE_KEY>')])$$
-- );
```

- [ ] **Step 3: Verificar sintaxis SQL básica**

Abrir Supabase Dashboard → SQL Editor → pegar el contenido y verificar que no hay errores de sintaxis antes de ejecutar.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add complete database migration with RLS, RPC and indexes"
```

---

### Task 5: Inicializar Supabase CLI y configurar proyecto

**Files:**
- Create: `supabase/config.toml`
- Create: `client/.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Instalar Supabase CLI (si no está instalado)**

```bash
# Windows (via Scoop)
scoop install supabase
# o via npm
npm install -g supabase
```

Expected: `supabase --version` muestra la versión instalada.

- [ ] **Step 2: Crear proyecto en Supabase Dashboard**

1. Ir a https://supabase.com/dashboard
2. "New Project" → completar nombre: `medistock`, región: South America (São Paulo)
3. Esperar a que termine el provisioning (~2 minutos)
4. Ir a Settings → API → copiar `Project URL` y `anon public key`

- [ ] **Step 3: Crear client/.env.local con las credenciales**

Crear el archivo `client/.env.local` con los valores copiados en el Step 2 (reemplazar los placeholders con los valores reales antes de guardar):

```
VITE_SUPABASE_URL=https://<tu-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-public-key>
```

> Sin estos valores reales la app no puede conectarse a Supabase. No continuar al siguiente step con placeholders.

- [ ] **Step 4: Ejecutar migración en Supabase**

En Supabase Dashboard → SQL Editor → pegar el contenido completo de `supabase/migrations/001_initial_schema.sql` → Run.

Expected: "Success. No rows returned" para cada statement.

- [ ] **Step 5: Generar supabase/config.toml con supabase init**

```bash
# Desde medicine-tracker/ (raíz del proyecto)
supabase init
```
Expected: crea `supabase/config.toml` con la configuración base del proyecto local.

- [ ] **Step 6: Crear .gitignore en raíz del proyecto**

```gitignore
# Env files
client/.env.local
client/.env

# Node
node_modules/
client/node_modules/

# Build
client/dist/

# Supabase
.supabase/

# OS
.DS_Store
Thumbs.db

# Superpowers
.superpowers/
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore supabase/config.toml
git commit -m "chore: add gitignore and Supabase project configuration"
```

---

## Chunk 2: Foundation — Types, Utils, Supabase Client, Auth

### Task 6: TypeScript types y Supabase client

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/lib/supabase.ts`

- [ ] **Step 1: Escribir los tipos TypeScript**

```typescript
// client/src/types/index.ts
export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  notification_email: string | null
  restock_margin_days: number
  timezone: string
  daily_summary_enabled: boolean
  created_at: string
}

export interface Medication {
  id: string
  user_id: string
  name: string
  description: string | null
  quantity_current: number
  quantity_minimum: number
  quantity_unit: string
  dose_amount: number
  dose_frequency: string | null
  dose_times: string[]
  expiration_date: string | null
  purchase_date: string | null
  active: boolean
  created_at: string
}

export type DoseStatus = 'taken' | 'skipped' | 'missed'

export interface DoseLog {
  id: string
  user_id: string
  medication_id: string
  taken_at: string | null
  scheduled_at: string
  status: DoseStatus
  notes: string | null
  created_at: string
  medication?: Pick<Medication, 'name' | 'dose_amount' | 'quantity_unit'>
}

export type AlertType = 'low_stock' | 'expiration' | 'dose_reminder' | 'restock_date'

export interface Alert {
  id: string
  user_id: string
  medication_id: string | null
  type: AlertType
  message: string
  is_read: boolean
  triggered_at: string
  medication?: Pick<Medication, 'name'>
}

export type MedicationFormData = Omit<Medication, 'id' | 'user_id' | 'created_at'>

// Dosis programada del día (calculada en frontend)
export interface ScheduledDose {
  medication: Medication
  scheduledTime: string   // "08:00"
  scheduledAt: Date
  logEntry: DoseLog | null  // null = pendiente
}
```

- [ ] **Step 2: Crear el cliente Supabase**

```typescript
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add client/src/types/index.ts client/src/lib/supabase.ts
git commit -m "feat: add TypeScript types and Supabase client"
```

---

### Task 7: Utilidades — restock y dates

**Files:**
- Create: `client/src/utils/restock.ts`
- Create: `client/src/utils/restock.test.ts`
- Create: `client/src/utils/dates.ts`

- [ ] **Step 1: Escribir los tests de restock**

```typescript
// client/src/utils/restock.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcRestockDate, isRestockDue } from './restock'

describe('calcRestockDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('calcula la fecha correctamente con margen default de 5 días', () => {
    // 30 pastillas, 1/toma, 2 tomas/día = 15 días stock → recompra en 10 días
    const result = calcRestockDate(30, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.toDateString()).toBe(new Date('2026-03-25T12:00:00Z').toDateString())
  })

  it('retorna null si doseTimesPerDay es 0', () => {
    expect(calcRestockDate(30, 1, 0)).toBeNull()
  })

  it('retorna null si doseAmount es 0', () => {
    expect(calcRestockDate(30, 0, 2)).toBeNull()
  })

  it('respeta margen personalizado', () => {
    // 20 pastillas, 1/toma, 1/día = 20 días, margen 10 → recompra en 10 días
    const result = calcRestockDate(20, 1, 1, 10)
    expect(result).not.toBeNull()
    expect(result!.toDateString()).toBe(new Date('2026-03-25T12:00:00Z').toDateString())
  })
})

describe('isRestockDue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('retorna true si la fecha ya pasó', () => {
    expect(isRestockDue(new Date('2026-03-14'))).toBe(true)
  })
  it('retorna true si la fecha es hoy', () => {
    expect(isRestockDue(new Date('2026-03-15'))).toBe(true)
  })
  it('retorna false si la fecha es mañana', () => {
    expect(isRestockDue(new Date('2026-03-16'))).toBe(false)
  })
  it('retorna false si es null', () => {
    expect(isRestockDue(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
cd client && npx vitest run src/utils/restock.test.ts
```
Expected: FAIL — `Cannot find module './restock'`

- [ ] **Step 3: Implementar restock.ts**

```typescript
// client/src/utils/restock.ts
import { addDays } from 'date-fns'

export function calcRestockDate(
  stockCurrent: number,
  doseAmount: number,
  doseTimesPerDay: number,
  marginDays: number = 5
): Date | null {
  const dosesPerDay = doseAmount * doseTimesPerDay
  if (!dosesPerDay || dosesPerDay <= 0) return null
  const daysRemaining = stockCurrent / dosesPerDay
  return addDays(new Date(), daysRemaining - marginDays)
}

export function isRestockDue(restockDate: Date | null): boolean {
  if (!restockDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const restock = new Date(restockDate)
  restock.setHours(0, 0, 0, 0)
  return restock <= today
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
cd client && npx vitest run src/utils/restock.test.ts
```
Expected: 8 tests passed (4 en calcRestockDate + 4 en isRestockDue)

- [ ] **Step 5: Crear dates.ts**

```typescript
// client/src/utils/dates.ts
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

export function formatDoseTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return format(d, 'HH:mm')
}

export { isToday, isTomorrow }
```

- [ ] **Step 6: Commit**

```bash
git add client/src/utils/
git commit -m "feat: add restock calculator and date utilities with tests"
```

---

### Task 8: AuthContext

**Files:**
- Create: `client/src/context/AuthContext.tsx`

- [ ] **Step 1: Crear AuthContext**

```typescript
// client/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; session: import('@supabase/supabase-js').Session | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    return { error: error ? error.message : null, session: data.session }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? error.message : null }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error ? error.message : null }
  }

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading,
      signUp, signIn, signOut, resetPassword, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/context/AuthContext.tsx
git commit -m "feat: add AuthContext with Supabase session management"
```

---

### Task 9: App shell + páginas de Auth

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/components/AuthGuard.tsx`
- Create: `client/src/components/Layout.tsx` (placeholder)
- Create: `client/src/pages/Login.tsx`
- Create: `client/src/pages/Register.tsx`
- Create: `client/src/pages/ResetPassword.tsx`
- Create stubs: `Dashboard.tsx`, `Inventario.tsx`, `MedicamentoDetalle.tsx`, `Historial.tsx`, `Notificaciones.tsx`, `Configuracion.tsx`

- [ ] **Step 1: Crear main.tsx**

```typescript
// client/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 2: Crear App.tsx**

```typescript
// client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import MedicamentoDetalle from './pages/MedicamentoDetalle'
import Historial from './pages/Historial'
import Notificaciones from './pages/Notificaciones'
import Configuracion from './pages/Configuracion'

export default function App() {
  const { loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-health-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AuthGuard />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/medicamentos/:id" element={<MedicamentoDetalle />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Crear AuthGuard**

```typescript
// client/src/components/AuthGuard.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from './Layout'

export default function AuthGuard() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <Layout><Outlet /></Layout>
}
```

- [ ] **Step 4: Crear Layout placeholder**

```typescript
// client/src/components/Layout.tsx
// Placeholder — se implementa completamente en Chunk 4 (Task 18)
import { ReactNode } from 'react'
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
```

- [ ] **Step 5: Crear stubs de páginas protegidas**

Crear cada archivo con el mínimo necesario para que TypeScript compile:

```typescript
// client/src/pages/Dashboard.tsx
export default function Dashboard() { return <div className="p-6">Dashboard (en construcción)</div> }
```

Repetir para `Inventario.tsx`, `MedicamentoDetalle.tsx`, `Historial.tsx`, `Notificaciones.tsx`, `Configuracion.tsx` — misma estructura, cambiando solo el texto.

- [ ] **Step 6: Crear página Login**

```typescript
// client/src/pages/Login.tsx
import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError('Credenciales incorrectas. Verificá tu email y contraseña.')
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-health-500 rounded-2xl mb-3 shadow-lg shadow-health-200">
            <span className="text-white text-2xl">💊</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">Iniciá sesión en tu cuenta</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="tu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="••••••••" />
          </div>
          <div className="text-right">
            <Link to="/reset-password" className="text-xs text-health-600 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-health-600 font-medium hover:underline">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Crear página Register**

```typescript
// client/src/pages/Register.tsx
import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setError(null)
    setLoading(true)
    const { error, session } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError(error)
    } else if (session) {
      // Email confirmation deshabilitada en Supabase → sesión inmediata
      navigate('/dashboard')
    } else {
      // Email confirmation habilitada → mostrar mensaje, no redirigir
      setError(null)
      setMessage('¡Cuenta creada! Revisá tu email para confirmar tu cuenta antes de iniciar sesión.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-health-500 rounded-2xl mb-3 shadow-lg shadow-health-200">
            <span className="text-white text-2xl">💊</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">Creá tu cuenta gratis</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          {message && (
            <div className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-100">{message}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="tu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="Mínimo 6 caracteres" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-health-600 font-medium hover:underline">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Crear página ResetPassword**

```typescript
// client/src/pages/ResetPassword.tsx
import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
// supabase se importa solo para onAuthStateChange (detectar evento PASSWORD_RECOVERY).
// El envío del email de recuperación usa resetPassword de AuthContext.

export default function ResetPassword() {
  const { updatePassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error)
    else setMessage('Revisá tu email para el link de recuperación.')
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    setError(null)
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
    else { setMessage('Contraseña actualizada.'); setTimeout(() => navigate('/dashboard'), 1500) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-health-500 rounded-2xl mb-3 shadow-lg shadow-health-200">
            <span className="text-white text-2xl">💊</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'request' ? 'Recuperar contraseña' : 'Nueva contraseña'}
          </p>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}
          {message && <div className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-100">{message}</div>}
          {mode === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
                  placeholder="tu@email.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
                  placeholder="Mínimo 6 caracteres" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Verificar que la app compila y carga en /login**

```bash
cd client && npm run dev
```
Expected: http://localhost:5173/login muestra el formulario de login sin errores en consola. Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add client/src/
git commit -m "feat: add auth pages, routing, AuthGuard and app shell"
```

---

## Chunk 3: Services & Hooks

### Task 10: Servicio de medicamentos + hook

**Files:**
- Create: `client/src/services/medications.ts`
- Create: `client/src/hooks/useMedications.ts`

- [ ] **Step 1: Crear el servicio de medicamentos**

```typescript
// client/src/services/medications.ts
import { supabase } from '../lib/supabase'
import type { Medication, MedicationFormData } from '../types'

/**
 * @param activeOnly - true (default): solo medicamentos activos (vistas normales).
 *                     false: todos, incluyendo desactivados (filtro "Todos" en /inventario).
 */
export async function fetchMedications(activeOnly = true): Promise<Medication[]> {
  let query = supabase.from('medications').select('*').order('name')
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function fetchMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createMedication(payload: MedicationFormData): Promise<Medication> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('medications')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateMedication(id: string, payload: Partial<MedicationFormData>): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deactivateMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMedication(id: string): Promise<void> {
  // Solo posible si no tiene dose_logs (ON DELETE RESTRICT). Verificar antes de llamar.
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
  if (error) throw new Error('No se puede eliminar: el medicamento tiene historial de tomas. Usá Desactivar.')
}

export async function hasDoseLogs(medicationId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('dose_logs')
    .select('id', { count: 'exact', head: true })
    .eq('medication_id', medicationId)
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}
```

- [ ] **Step 2: Crear el hook useMedications**

```typescript
// client/src/hooks/useMedications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMedications, fetchMedication,
  createMedication, updateMedication,
  deactivateMedication, deleteMedication,
} from '../services/medications'
import type { MedicationFormData } from '../types'

export const MEDICATIONS_KEY = ['medications']

export function useMedications(activeOnly = true) {
  return useQuery({
    queryKey: [...MEDICATIONS_KEY, { activeOnly }],
    queryFn: () => fetchMedications(activeOnly),
  })
}

export function useMedication(id: string) {
  return useQuery({
    queryKey: [...MEDICATIONS_KEY, id],
    queryFn: () => fetchMedication(id),
    enabled: !!id,
  })
}

export function useCreateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MedicationFormData) => createMedication(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useUpdateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MedicationFormData> }) =>
      updateMedication(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useDeactivateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateMedication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useDeleteMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMedication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/medications.ts client/src/hooks/useMedications.ts
git commit -m "feat: add medications service and useMedications hooks"
```

---

### Task 11: Servicio de dose_logs + hook

**Files:**
- Create: `client/src/services/doseLogs.ts`
- Create: `client/src/hooks/useDoseLogs.ts`

- [ ] **Step 1: Crear el servicio de dose_logs**

```typescript
// client/src/services/doseLogs.ts
import { supabase } from '../lib/supabase'
import type { DoseLog, ScheduledDose, Medication } from '../types'
import { parseISO, setHours, setMinutes } from 'date-fns'

export async function fetchDoseLogs(medicationId?: string): Promise<DoseLog[]> {
  let query = supabase
    .from('dose_logs')
    .select('*, medication:medications(name, dose_amount, quantity_unit)')
    .order('scheduled_at', { ascending: false })

  if (medicationId) query = query.eq('medication_id', medicationId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function fetchTodayDoseLogs(): Promise<DoseLog[]> {
  // Usamos la hora local del navegador para construir los límites del día.
  // Nota: los scheduled_at se generan también en hora local (buildTodaySchedule),
  // por lo que la comparación es consistente dentro de la misma sesión del usuario.
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString()
  const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)

  if (error) throw new Error(error.message)
  return data
}

/**
 * Marca una dosis como tomada usando la RPC atómica.
 * Descuenta stock y crea alerta low_stock si corresponde.
 */
export async function markDoseTaken(medicationId: string, scheduledAt: string): Promise<void> {
  const { error } = await supabase.rpc('mark_dose_taken', {
    p_medication_id: medicationId,
    p_scheduled_at: scheduledAt,
  })
  if (error) throw new Error(error.message)
}

export async function skipDose(medicationId: string, scheduledAt: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: user.id,
      medication_id: medicationId,
      scheduled_at: scheduledAt,
      status: 'skipped',
    })
  if (error) throw new Error(error.message)
}

/**
 * Calcula las dosis programadas para hoy a partir de los medicamentos activos.
 * Las cruza con los dose_logs del día para saber cuáles ya fueron registradas.
 */
export function buildTodaySchedule(
  medications: Medication[],
  todayLogs: DoseLog[]
): ScheduledDose[] {
  const today = new Date()
  const schedule: ScheduledDose[] = []

  for (const med of medications) {
    if (!med.active) continue
    for (const timeStr of med.dose_times) {
      const [h, m] = timeStr.split(':').map(Number)
      const scheduledAt = setMinutes(setHours(new Date(today), h), m)
      scheduledAt.setSeconds(0, 0)

      // Ventana de 5 minutos para tolerar pequeñas diferencias de reloj o redondeo
      const logEntry = todayLogs.find(
        log => log.medication_id === med.id &&
          Math.abs(parseISO(log.scheduled_at).getTime() - scheduledAt.getTime()) < 300_000
      ) ?? null

      schedule.push({ medication: med, scheduledTime: timeStr, scheduledAt, logEntry })
    }
  }

  return schedule.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}
```

- [ ] **Step 2: Crear el hook useDoseLogs**

```typescript
// client/src/hooks/useDoseLogs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDoseLogs, fetchTodayDoseLogs, markDoseTaken, skipDose } from '../services/doseLogs'

export const DOSE_LOGS_KEY = ['dose_logs']
export const TODAY_LOGS_KEY = ['dose_logs', 'today']

export function useDoseLogs(medicationId?: string) {
  return useQuery({
    queryKey: medicationId ? [...DOSE_LOGS_KEY, medicationId] : DOSE_LOGS_KEY,
    queryFn: () => fetchDoseLogs(medicationId),
  })
}

export function useTodayDoseLogs() {
  return useQuery({
    queryKey: TODAY_LOGS_KEY,
    queryFn: fetchTodayDoseLogs,
  })
}

export function useMarkDoseTaken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, scheduledAt }: { medicationId: string; scheduledAt: string }) =>
      markDoseTaken(medicationId, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODAY_LOGS_KEY })
      qc.invalidateQueries({ queryKey: DOSE_LOGS_KEY })
      qc.invalidateQueries({ queryKey: ['medications'] }) // stock actualizado
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useSkipDose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, scheduledAt }: { medicationId: string; scheduledAt: string }) =>
      skipDose(medicationId, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODAY_LOGS_KEY })
      qc.invalidateQueries({ queryKey: DOSE_LOGS_KEY })
    },
  })
}
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/doseLogs.ts client/src/hooks/useDoseLogs.ts
git commit -m "feat: add dose logs service with atomic mark_dose_taken RPC and hooks"
```

---

### Task 12: Servicio de alertas + hook con Realtime

**Files:**
- Create: `client/src/services/alerts.ts`
- Create: `client/src/hooks/useAlerts.ts`

- [ ] **Step 1: Crear el servicio de alertas**

```typescript
// client/src/services/alerts.ts
import { supabase } from '../lib/supabase'
import type { Alert } from '../types'

export async function fetchAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, medication:medications(name)')
    .order('triggered_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markAlertRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllAlertsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Crear el hook useAlerts con suscripción Realtime**

```typescript
// client/src/hooks/useAlerts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAlerts, fetchUnreadCount, markAlertRead, markAllAlertsRead } from '../services/alerts'
import { useAuth } from '../context/AuthContext'

export const ALERTS_KEY = ['alerts']
export const ALERTS_UNREAD_KEY = ['alerts', 'unread']

export function useAlerts() {
  return useQuery({
    queryKey: ALERTS_KEY,
    queryFn: fetchAlerts,
  })
}

export function useUnreadAlertsCount() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ALERTS_UNREAD_KEY,
    queryFn: fetchUnreadCount,
    enabled: !!user,
  })

  // Suscripción Realtime: al insertar nueva alerta, invalidar cache
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`alerts-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ALERTS_KEY })
          qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, qc])

  return query
}

export function useMarkAlertRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markAlertRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALERTS_KEY })
      qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
    },
  })
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALERTS_KEY })
      qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
    },
  })
}
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/alerts.ts client/src/hooks/useAlerts.ts
git commit -m "feat: add alerts service with Realtime subscription hook"
```

---

### Task 13: Servicio de perfil + hook

**Files:**
- Create: `client/src/services/profile.ts`
- Create: `client/src/hooks/useProfile.ts`

- [ ] **Step 1: Crear el servicio de perfil**

```typescript
// client/src/services/profile.ts
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export async function fetchProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProfile(payload: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Crear el hook useProfile**

```typescript
// client/src/hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateProfile } from '../services/profile'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../types'

export const PROFILE_KEY = ['profile']

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Omit<Profile, 'id' | 'created_at'>>) => updateProfile(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  })
}
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/profile.ts client/src/hooks/useProfile.ts
git commit -m "feat: add profile service and useProfile hook"
```

---

## Chunk 4: UI Primitivos & Componentes

### Task 14: Primitivos UI (Badge, Button, Card, Modal)

**Files:**
- Create: `client/src/components/ui/Badge.tsx`
- Create: `client/src/components/ui/Button.tsx`
- Create: `client/src/components/ui/Card.tsx`
- Create: `client/src/components/ui/Modal.tsx`
- Test: `client/src/components/ui/__tests__/Modal.test.tsx`

- [ ] **Step 1: Escribir el test fallido para Modal**

```typescript
// client/src/components/ui/__tests__/Modal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from '../Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test"><span>content</span></Modal>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders with role="dialog" when open', () => {
    render(<Modal open onClose={vi.fn()} title="Test"><span>content</span></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the title', () => {
    render(<Modal open onClose={vi.fn()} title="Mi título"><span /></Modal>)
    expect(screen.getByText('Mi título')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test"><span /></Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button has aria-label', () => {
    render(<Modal open onClose={vi.fn()} title="Test"><span /></Modal>)
    expect(screen.getByLabelText('Cerrar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/components/ui/__tests__/Modal.test.tsx
```
Expected: FAIL con "Cannot find module '../Modal'"

- [ ] **Step 3: Crear Badge**

```typescript
// client/src/components/ui/Badge.tsx
import { ReactNode } from 'react'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-health-100 text-health-700 border-health-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  gray:   'bg-slate-100 text-slate-600 border-slate-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export default function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Crear Button**

```typescript
// client/src/components/ui/Button.tsx
import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-health-500 hover:bg-health-600 text-white shadow-sm shadow-health-200',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  ghost:     'hover:bg-slate-100 text-slate-600',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Crear Card**

```typescript
// client/src/components/ui/Card.tsx
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Crear Modal con atributos de accesibilidad**

```typescript
// client/src/components/ui/Modal.tsx
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

const TITLE_ID = 'modal-title'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel — modal en desktop, drawer desde abajo en mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className={`fixed z-50
          /* Mobile: drawer desde abajo */
          bottom-0 left-0 right-0 rounded-t-3xl
          /* Desktop: modal centrado */
          sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:w-full sm:${maxWidth}
          bg-white shadow-2xl
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 id={TITLE_ID} className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/components/ui/__tests__/Modal.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 8: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/ui/
git commit -m "feat: add UI primitives (Badge, Button, Card, Modal)"
```

---

### Task 15: Layout + Navbar + NotificationBell

**Files:**
- Modify: `client/src/components/Layout.tsx` (reemplazar placeholder)
- Create: `client/src/components/NotificationBell.tsx`
- Test: `client/src/components/__tests__/NotificationBell.test.tsx`

- [ ] **Step 1: Escribir el test fallido para NotificationBell**

```typescript
// client/src/components/__tests__/NotificationBell.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from '../NotificationBell'

vi.mock('../../hooks/useAlerts', () => ({
  useUnreadAlertsCount: vi.fn(),
}))

import { useUnreadAlertsCount } from '../../hooks/useAlerts'

describe('NotificationBell', () => {
  it('renders bell button', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('hides badge when count is 0', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows count when count > 0', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 5 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 99+ when count exceeds 99', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 150 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/components/__tests__/NotificationBell.test.tsx
```
Expected: FAIL con "Cannot find module '../NotificationBell'"

- [ ] **Step 3: Crear NotificationBell**

```typescript
// client/src/components/NotificationBell.tsx
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUnreadAlertsCount } from '../hooks/useAlerts'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { data: count = 0 } = useUnreadAlertsCount()

  return (
    <button
      onClick={() => navigate('/notificaciones')}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
      aria-label={`Notificaciones${count > 0 ? ` (${count} sin leer)` : ''}`}
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/components/__tests__/NotificationBell.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Reemplazar Layout.tsx con la implementación completa**

```typescript
// client/src/components/Layout.tsx
import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const navLinks = [
  { to: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/inventario',     label: 'Inventario',    icon: Package },
  { to: '/historial',      label: 'Historial',     icon: ClipboardList },
  { to: '/configuracion',  label: 'Configuración', icon: Settings },
]

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-health-500 rounded-lg flex items-center justify-center shadow-sm shadow-health-200">
              <span className="text-white text-sm">💊</span>
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block">MediStock</span>
          </NavLink>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-health-50 text-health-700'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <button
              onClick={handleSignOut}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 flex" aria-label="Navegación principal">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-health-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Layout.tsx client/src/components/NotificationBell.tsx client/src/components/__tests__/NotificationBell.test.tsx
git commit -m "feat: add Layout with responsive navbar and NotificationBell"
```

---

### Task 16: StockBadge, ExpirationBadge, RestockDateChip

**Files:**
- Create: `client/src/components/StockBadge.tsx`
- Create: `client/src/components/ExpirationBadge.tsx`
- Create: `client/src/components/RestockDateChip.tsx`
- Test: `client/src/components/__tests__/StockBadge.test.tsx`
- Test: `client/src/components/__tests__/ExpirationBadge.test.tsx`

- [ ] **Step 1: Escribir los tests fallidos para StockBadge y ExpirationBadge**

```typescript
// client/src/components/__tests__/StockBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StockBadge from '../StockBadge'

const med = (current: number, min: number) => ({
  quantity_current: current,
  quantity_minimum: min,
  quantity_unit: 'pastillas',
})

describe('StockBadge', () => {
  it('shows Stock OK when above minimum', () => {
    render(<StockBadge medication={med(10, 5)} />)
    expect(screen.getByText(/Stock OK/)).toBeInTheDocument()
  })

  it('shows Stock bajo when at or below minimum', () => {
    render(<StockBadge medication={med(3, 5)} />)
    expect(screen.getByText(/Stock bajo/)).toBeInTheDocument()
  })

  it('shows Sin stock when quantity is 0', () => {
    render(<StockBadge medication={med(0, 5)} />)
    expect(screen.getByText(/Sin stock/)).toBeInTheDocument()
  })

  it('includes current quantity in label', () => {
    render(<StockBadge medication={med(12, 5)} />)
    expect(screen.getByText(/12 pastillas/)).toBeInTheDocument()
  })
})
```

```typescript
// client/src/components/__tests__/ExpirationBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExpirationBadge from '../ExpirationBadge'

vi.mock('../../utils/dates', () => ({
  daysUntil: vi.fn(),
  formatDate: (d: string) => d,
}))

import { daysUntil } from '../../utils/dates'

describe('ExpirationBadge', () => {
  it('shows "Sin vencimiento" when no date', () => {
    render(<ExpirationBadge expirationDate={null} />)
    expect(screen.getByText('Sin vencimiento')).toBeInTheDocument()
  })

  it('shows "Vencido" when days < 0', () => {
    vi.mocked(daysUntil).mockReturnValue(-3)
    render(<ExpirationBadge expirationDate="2020-01-01" />)
    expect(screen.getByText(/Vencido/)).toBeInTheDocument()
  })

  it('shows "Vence hoy" when days === 0', () => {
    vi.mocked(daysUntil).mockReturnValue(0)
    render(<ExpirationBadge expirationDate="2026-03-15" />)
    expect(screen.getByText('Vence hoy')).toBeInTheDocument()
  })

  it('shows "Vence en Nd" when days <= 30', () => {
    vi.mocked(daysUntil).mockReturnValue(7)
    render(<ExpirationBadge expirationDate="2026-03-22" />)
    expect(screen.getByText('Vence en 7d')).toBeInTheDocument()
  })

  it('shows formatted date when days > 30', () => {
    vi.mocked(daysUntil).mockReturnValue(60)
    render(<ExpirationBadge expirationDate="2026-05-14" />)
    expect(screen.getByText(/Vence 2026-05-14/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar los tests — esperar que fallen**

```bash
cd client && npx vitest run src/components/__tests__/StockBadge.test.tsx src/components/__tests__/ExpirationBadge.test.tsx
```
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Crear StockBadge**

```typescript
// client/src/components/StockBadge.tsx
import Badge from './ui/Badge'
import type { Medication } from '../types'

interface StockBadgeProps {
  medication: Pick<Medication, 'quantity_current' | 'quantity_minimum' | 'quantity_unit'>
}

export default function StockBadge({ medication }: StockBadgeProps) {
  const { quantity_current: current, quantity_minimum: min, quantity_unit: unit } = medication

  const variant =
    current <= 0         ? 'red'
    : current <= min     ? 'yellow'
    : 'green'

  const label =
    current <= 0     ? 'Sin stock'
    : current <= min ? 'Stock bajo'
    : 'Stock OK'

  return (
    <Badge variant={variant}>
      {label} · {current} {unit}
    </Badge>
  )
}
```

- [ ] **Step 4: Crear ExpirationBadge**

```typescript
// client/src/components/ExpirationBadge.tsx
import Badge from './ui/Badge'
import { daysUntil, formatDate } from '../utils/dates'

interface ExpirationBadgeProps {
  expirationDate: string | null
}

export default function ExpirationBadge({ expirationDate }: ExpirationBadgeProps) {
  if (!expirationDate) {
    return <Badge variant="gray">Sin vencimiento</Badge>
  }

  const days = daysUntil(expirationDate)

  const variant =
    days < 0     ? 'red'
    : days <= 7  ? 'red'
    : days <= 30 ? 'yellow'
    : 'green'

  const label =
    days < 0    ? `Vencido hace ${Math.abs(days)}d`
    : days === 0 ? 'Vence hoy'
    : days <= 30 ? `Vence en ${days}d`
    : `Vence ${formatDate(expirationDate)}`

  return <Badge variant={variant}>{label}</Badge>
}
```

- [ ] **Step 5: Crear RestockDateChip**

Nota: `dose_times` es `jsonb` en la DB y podría llegar como `null` en registros legacy — se protege con `?.length ?? 0`.

```typescript
// client/src/components/RestockDateChip.tsx
import { ShoppingCart } from 'lucide-react'
import { calcRestockDate, isRestockDue } from '../utils/restock'
import { formatDate } from '../utils/dates'
import type { Medication } from '../types'

interface RestockDateChipProps {
  medication: Pick<Medication, 'quantity_current' | 'dose_amount' | 'dose_times'>
  marginDays?: number
}

export default function RestockDateChip({ medication, marginDays = 5 }: RestockDateChipProps) {
  const restockDate = calcRestockDate(
    medication.quantity_current,
    medication.dose_amount,
    medication.dose_times?.length ?? 0,
    marginDays
  )

  if (!restockDate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <ShoppingCart size={12} />
        Sin dosis configuradas
      </span>
    )
  }

  const due = isRestockDue(restockDate)

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${due ? 'text-red-600' : 'text-slate-500'}`}>
      <ShoppingCart size={12} />
      Recomprar: {due ? '¡Hoy!' : formatDate(restockDate)}
    </span>
  )
}
```

- [ ] **Step 6: Ejecutar los tests — esperar que pasen**

```bash
cd client && npx vitest run src/components/__tests__/StockBadge.test.tsx src/components/__tests__/ExpirationBadge.test.tsx
```
Expected: 9 tests PASS.

- [ ] **Step 7: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/StockBadge.tsx client/src/components/ExpirationBadge.tsx client/src/components/RestockDateChip.tsx client/src/components/__tests__/
git commit -m "feat: add StockBadge, ExpirationBadge and RestockDateChip components"
```

---

### Task 17: MedicationCard + DoseTracker

**Files:**
- Create: `client/src/components/MedicationCard.tsx`
- Create: `client/src/components/DoseTracker.tsx`
- Test: `client/src/components/__tests__/DoseTracker.test.tsx`

- [ ] **Step 1: Escribir el test fallido para DoseTracker**

```typescript
// client/src/components/__tests__/DoseTracker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DoseTracker from '../DoseTracker'
import type { ScheduledDose } from '../../types'

vi.mock('../../hooks/useDoseLogs', () => ({
  useMarkDoseTaken: vi.fn(),
  useSkipDose: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({
  formatDoseTime: (t: string) => t,
}))

import { useMarkDoseTaken, useSkipDose } from '../../hooks/useDoseLogs'

const baseMed = {
  id: 'med-1',
  user_id: 'u1',
  name: 'Ibuprofeno',
  description: null,
  quantity_current: 10,
  quantity_minimum: 5,
  quantity_unit: 'pastillas',
  dose_amount: 1,
  dose_frequency: 'diaria',
  dose_times: ['08:00'],
  expiration_date: null,
  purchase_date: null,
  active: true,
  created_at: '2026-01-01',
}

const makeDose = (status: null | 'taken' | 'skipped' | 'missed'): ScheduledDose => ({
  medication: baseMed,
  scheduledTime: '08:00',
  scheduledAt: new Date('2026-03-15T08:00:00Z'),
  logEntry: status
    ? { id: 'log-1', medication_id: 'med-1', user_id: 'u1', status, scheduled_at: '2026-03-15T08:00:00Z', taken_at: null, notes: null, created_at: '2026-03-15' }
    : null,
})

describe('DoseTracker', () => {
  beforeEach(() => {
    vi.mocked(useMarkDoseTaken).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
    vi.mocked(useSkipDose).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  })

  it('shows Tomar and Omitir buttons when pending', () => {
    render(<DoseTracker scheduledDose={makeDose(null)} />)
    expect(screen.getByLabelText('Tomar Ibuprofeno')).toBeInTheDocument()
    expect(screen.getByLabelText('Omitir Ibuprofeno')).toBeInTheDocument()
  })

  it('hides action buttons when taken', () => {
    render(<DoseTracker scheduledDose={makeDose('taken')} />)
    expect(screen.queryByLabelText('Tomar Ibuprofeno')).not.toBeInTheDocument()
  })

  it('hides action buttons when skipped', () => {
    render(<DoseTracker scheduledDose={makeDose('skipped')} />)
    expect(screen.queryByLabelText('Tomar Ibuprofeno')).not.toBeInTheDocument()
  })

  it('calls markTaken.mutate when Tomar is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useMarkDoseTaken).mockReturnValue({ mutate, isPending: false } as any)
    render(<DoseTracker scheduledDose={makeDose(null)} />)
    fireEvent.click(screen.getByLabelText('Tomar Ibuprofeno'))
    expect(mutate).toHaveBeenCalledWith({
      medicationId: 'med-1',
      scheduledAt: expect.any(String),
    })
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/components/__tests__/DoseTracker.test.tsx
```
Expected: FAIL con "Cannot find module '../DoseTracker'"

- [ ] **Step 3: Crear MedicationCard**

```typescript
// client/src/components/MedicationCard.tsx
import { useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import Card from './ui/Card'
import StockBadge from './StockBadge'
import ExpirationBadge from './ExpirationBadge'
import RestockDateChip from './RestockDateChip'
import type { Medication } from '../types'
import { formatDoseTime } from '../utils/dates'

interface MedicationCardProps {
  medication: Medication
  marginDays?: number
}

export default function MedicationCard({ medication, marginDays = 5 }: MedicationCardProps) {
  const navigate = useNavigate()
  const nextDoseTime = medication.dose_times?.[0] ?? null

  return (
    <Card onClick={() => navigate(`/medicamentos/${medication.id}`)} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-health-50 flex items-center justify-center shrink-0">
            <Pill size={18} className="text-health-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate">{medication.name}</h3>
            {medication.description && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{medication.description}</p>
            )}
          </div>
        </div>
        {!medication.active && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            Inactivo
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <StockBadge medication={medication} />
        <ExpirationBadge expirationDate={medication.expiration_date} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <RestockDateChip medication={medication} marginDays={marginDays} />
        {nextDoseTime && (
          <span className="text-xs text-slate-400">
            Próxima: {formatDoseTime(nextDoseTime)}
          </span>
        )}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Crear DoseTracker con aria-labels en los botones de acción**

```typescript
// client/src/components/DoseTracker.tsx
import { CheckCircle2, Circle, SkipForward, Clock } from 'lucide-react'
import { useMarkDoseTaken, useSkipDose } from '../hooks/useDoseLogs'
import { formatDoseTime } from '../utils/dates'
import type { ScheduledDose } from '../types'

interface DoseTrackerProps {
  scheduledDose: ScheduledDose
}

export default function DoseTracker({ scheduledDose }: DoseTrackerProps) {
  const { medication, scheduledTime, scheduledAt, logEntry } = scheduledDose
  const markTaken = useMarkDoseTaken()
  const skipDose = useSkipDose()

  const scheduledAtISO = scheduledAt.toISOString()
  const isPending = logEntry === null
  const isTaken = logEntry?.status === 'taken'
  const isSkipped = logEntry?.status === 'skipped'
  const isMissed = logEntry?.status === 'missed'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isTaken   ? 'bg-health-50 border border-health-100'
      : isMissed  ? 'bg-red-50 border border-red-100'
      : isSkipped ? 'bg-slate-50 border border-slate-100'
      : 'bg-white border border-slate-100 hover:border-slate-200'
    }`}>
      {/* Status icon */}
      <div className="shrink-0">
        {isTaken   && <CheckCircle2 size={22} className="text-health-500" />}
        {isSkipped && <SkipForward  size={22} className="text-slate-400" />}
        {isMissed  && <Circle       size={22} className="text-red-400" />}
        {isPending && <Clock        size={22} className="text-slate-300" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{medication.name}</p>
        <p className="text-xs text-slate-500">
          {formatDoseTime(scheduledTime)} · {medication.dose_amount} {medication.quantity_unit}
        </p>
      </div>

      {/* Actions — only if pending */}
      {isPending && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => markTaken.mutate({ medicationId: medication.id, scheduledAt: scheduledAtISO })}
            disabled={markTaken.isPending}
            aria-label={`Tomar ${medication.name}`}
            className="px-3 py-1.5 bg-health-500 hover:bg-health-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            Tomar
          </button>
          <button
            onClick={() => skipDose.mutate({ medicationId: medication.id, scheduledAt: scheduledAtISO })}
            disabled={skipDose.isPending}
            aria-label={`Omitir ${medication.name}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            Omitir
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/components/__tests__/DoseTracker.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 6: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/MedicationCard.tsx client/src/components/DoseTracker.tsx client/src/components/__tests__/DoseTracker.test.tsx
git commit -m "feat: add MedicationCard and DoseTracker components"
```

---

### Task 18: MedicationForm

**Files:**
- Create: `client/src/components/MedicationForm.tsx`
- Test: `client/src/components/__tests__/MedicationForm.test.tsx`

- [ ] **Step 1: Escribir el test fallido para MedicationForm**

```typescript
// client/src/components/__tests__/MedicationForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MedicationForm from '../MedicationForm'

vi.mock('../../hooks/useMedications', () => ({
  useCreateMedication: vi.fn(),
  useUpdateMedication: vi.fn(),
}))

import { useCreateMedication, useUpdateMedication } from '../../hooks/useMedications'

const mockMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })

describe('MedicationForm', () => {
  beforeEach(() => {
    vi.mocked(useCreateMedication).mockReturnValue(mockMutation() as any)
    vi.mocked(useUpdateMedication).mockReturnValue(mockMutation() as any)
  })

  it('does not render when closed', () => {
    const { container } = render(
      <MedicationForm open={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows validation error when name is empty and form is submitted', async () => {
    render(<MedicationForm open onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Crear medicamento'))
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    })
  })

  it('calls createMutation when form is submitted with valid data', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateMedication).mockReturnValue({ mutateAsync, isPending: false } as any)

    render(<MedicationForm open onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Aspirina' } })
    fireEvent.click(screen.getByText('Crear medicamento'))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aspirina' }))
    })
  })

  it('pre-populates form in edit mode', () => {
    const medication = {
      id: 'med-1', user_id: 'u1', name: 'Paracetamol', description: null,
      quantity_current: 20, quantity_minimum: 5, quantity_unit: 'pastillas',
      dose_amount: 1, dose_frequency: 'diaria', dose_times: ['08:00'],
      expiration_date: null, purchase_date: null, active: true, created_at: '2026-01-01',
    }
    render(<MedicationForm open onClose={vi.fn()} medication={medication} />)
    expect(screen.getByDisplayValue('Paracetamol')).toBeInTheDocument()
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/components/__tests__/MedicationForm.test.tsx
```
Expected: FAIL con "Cannot find module '../MedicationForm'"

- [ ] **Step 3: Crear MedicationForm**

Notas de implementación:
- Todos los `<label>` tienen `htmlFor` apuntando al `id` del input correspondiente.
- El `useEffect` usa `[medication?.id, open]` para evitar re-populación innecesaria al cerrar con `medication` aún definido.

```typescript
// client/src/components/MedicationForm.tsx
import { useState, FormEvent, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useCreateMedication, useUpdateMedication } from '../hooks/useMedications'
import type { Medication, MedicationFormData } from '../types'

interface MedicationFormProps {
  open: boolean
  onClose: () => void
  medication?: Medication   // si existe → modo edición
}

const EMPTY_FORM: MedicationFormData = {
  name: '',
  description: '',
  quantity_current: 0,
  quantity_minimum: 5,
  quantity_unit: 'pastillas',
  dose_amount: 1,
  dose_frequency: 'diaria',
  dose_times: ['08:00'],
  expiration_date: null,
  purchase_date: null,
  active: true,
}

const UNIT_OPTIONS = ['pastillas', 'cápsulas', 'ml', 'gotas', 'comprimidos', 'sobres', 'unidades']

export default function MedicationForm({ open, onClose, medication }: MedicationFormProps) {
  const [form, setForm] = useState<MedicationFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateMedication()
  const updateMutation = useUpdateMedication()
  const isEditing = !!medication
  const isPending = createMutation.isPending || updateMutation.isPending

  // Poblar formulario cuando cambia el medicamento editado o cuando el modal se abre.
  // Se usa medication?.id (no el objeto completo) para evitar re-ejecución si el padre
  // mantiene la referencia en memoria mientras el modal se está cerrando.
  useEffect(() => {
    if (medication) {
      const { id, user_id, created_at, ...rest } = medication
      setForm({ ...rest, dose_times: medication.dose_times ?? ['08:00'] })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [medication?.id, open])

  function setField<K extends keyof MedicationFormData>(key: K, value: MedicationFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addDoseTime() {
    setForm(prev => ({ ...prev, dose_times: [...prev.dose_times, '12:00'] }))
  }

  function updateDoseTime(index: number, value: string) {
    const updated = [...form.dose_times]
    updated[index] = value
    setField('dose_times', updated)
  }

  function removeDoseTime(index: number) {
    setField('dose_times', form.dose_times.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (form.dose_times.length === 0) { setError('Agregá al menos un horario de dosis.'); return }
    setError(null)

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: medication!.id, payload: form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar medicamento' : 'Nuevo medicamento'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
        )}

        {/* Nombre */}
        <div>
          <label htmlFor="med-name" className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
          <input id="med-name" type="text" required value={form.name} onChange={e => setField('name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
            placeholder="Ej: Ibuprofeno 400mg" />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="med-description" className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
          <input id="med-description" type="text" value={form.description ?? ''} onChange={e => setField('description', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
            placeholder="Opcional" />
        </div>

        {/* Stock */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="med-qty-current" className="block text-sm font-medium text-slate-700 mb-1.5">Stock actual</label>
            <input id="med-qty-current" type="number" min="0" value={form.quantity_current}
              onChange={e => setField('quantity_current', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-qty-min" className="block text-sm font-medium text-slate-700 mb-1.5">Stock mínimo</label>
            <input id="med-qty-min" type="number" min="0" value={form.quantity_minimum}
              onChange={e => setField('quantity_minimum', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-qty-unit" className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
            <select id="med-qty-unit" value={form.quantity_unit} onChange={e => setField('quantity_unit', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm bg-white">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Dosis */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="med-dose-amount" className="block text-sm font-medium text-slate-700 mb-1.5">Dosis por toma</label>
            <input id="med-dose-amount" type="number" min="0.1" step="0.1" value={form.dose_amount}
              onChange={e => setField('dose_amount', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-dose-freq" className="block text-sm font-medium text-slate-700 mb-1.5">Frecuencia</label>
            <input id="med-dose-freq" type="text" value={form.dose_frequency ?? ''} onChange={e => setField('dose_frequency', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="Ej: diaria, cada 8 horas" />
          </div>
        </div>

        {/* Horarios */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-sm font-medium text-slate-700">Horarios de toma</span>
            <button type="button" onClick={addDoseTime}
              className="text-xs text-health-600 hover:text-health-700 flex items-center gap-1 font-medium">
              <Plus size={13} /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {form.dose_times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <label htmlFor={`med-dose-time-${i}`} className="sr-only">Horario {i + 1}</label>
                <input id={`med-dose-time-${i}`} type="time" value={t} onChange={e => updateDoseTime(i, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
                {form.dose_times.length > 1 && (
                  <button type="button" onClick={() => removeDoseTime(i)}
                    aria-label={`Eliminar horario ${i + 1}`}
                    className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="med-expiration" className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de vencimiento</label>
            <input id="med-expiration" type="date" value={form.expiration_date ?? ''}
              onChange={e => setField('expiration_date', e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-purchase" className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de compra</label>
            <input id="med-purchase" type="date" value={form.purchase_date ?? ''}
              onChange={e => setField('purchase_date', e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear medicamento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/components/__tests__/MedicationForm.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/MedicationForm.tsx client/src/components/__tests__/MedicationForm.test.tsx
git commit -m "feat: add MedicationForm modal/drawer component"
```

---
## Chunk 5: Páginas

### Task 19: Dashboard

**Files:**
- Create: `client/src/pages/Dashboard.tsx`
- Test: `client/src/pages/__tests__/Dashboard.test.tsx`

- [ ] **Step 1: Escribir el test fallido para Dashboard**

```typescript
// client/src/pages/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'

vi.mock('../../hooks/useMedications', () => ({ useMedications: vi.fn() }))
vi.mock('../../hooks/useDoseLogs', () => ({ useTodayDoseLogs: vi.fn() }))
vi.mock('../../hooks/useAlerts', () => ({ useUnreadAlertsCount: vi.fn() }))
vi.mock('../../services/doseLogs', () => ({ buildTodaySchedule: vi.fn() }))
vi.mock('../../utils/dates', () => ({ daysUntil: vi.fn(), formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))

import { useMedications } from '../../hooks/useMedications'
import { useTodayDoseLogs } from '../../hooks/useDoseLogs'
import { useUnreadAlertsCount } from '../../hooks/useAlerts'
import { buildTodaySchedule } from '../../services/doseLogs'
import { daysUntil } from '../../utils/dates'

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useMedications).mockReturnValue({ data: [] } as any)
    vi.mocked(useTodayDoseLogs).mockReturnValue({ data: [] } as any)
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    vi.mocked(buildTodaySchedule).mockReturnValue([])
    vi.mocked(daysUntil).mockReturnValue(60)
  })

  it('renders the "Dosis de hoy" section', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('Dosis de hoy')).toBeInTheDocument()
  })

  it('shows empty state when no doses scheduled', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('No hay dosis programadas para hoy.')).toBeInTheDocument()
  })

  it('shows stat cards', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('Medicamentos')).toBeInTheDocument()
    expect(screen.getByText('Alertas')).toBeInTheDocument()
    expect(screen.getByText('Dosis pendientes')).toBeInTheDocument()
  })

  it('shows "Stock bajo" section when low-stock medications exist', () => {
    const lowMed = {
      id: 'm1', name: 'Aspirina', quantity_current: 2, quantity_minimum: 5,
      quantity_unit: 'pastillas', dose_amount: 1, dose_times: ['08:00'],
      active: true, expiration_date: null, purchase_date: null,
      description: null, dose_frequency: 'diaria', user_id: 'u1', created_at: '2026-01-01',
    }
    vi.mocked(useMedications).mockReturnValue({ data: [lowMed] } as any)
    wrap(<Dashboard />)
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/Dashboard.test.tsx
```
Expected: FAIL con "Cannot find module '../Dashboard'"

- [ ] **Step 3: Crear Dashboard.tsx**

```typescript
// client/src/pages/Dashboard.tsx
import { useMemo } from 'react'
import type { ElementType } from 'react'
import { AlertTriangle, Pill, Bell, Clock } from 'lucide-react'
import { useMedications } from '../hooks/useMedications'
import { useTodayDoseLogs } from '../hooks/useDoseLogs'
import { useUnreadAlertsCount } from '../hooks/useAlerts'
import { buildTodaySchedule } from '../services/doseLogs'
import { daysUntil } from '../utils/dates'
import DoseTracker from '../components/DoseTracker'
import MedicationCard from '../components/MedicationCard'

export default function Dashboard() {
  const { data: medications = [] } = useMedications()
  const { data: todayLogs = [] } = useTodayDoseLogs()
  const { data: unreadCount = 0 } = useUnreadAlertsCount()

  const schedule = useMemo(
    () => buildTodaySchedule(medications, todayLogs),
    [medications, todayLogs]
  )

  const pendingDoses = schedule.filter(d => d.logEntry === null)
  const lowStock = medications.filter(m => m.quantity_current <= m.quantity_minimum)
  const expiringSoon = medications.filter(
    m => m.expiration_date != null &&
         daysUntil(m.expiration_date) >= 0 &&
         daysUntil(m.expiration_date) <= 30
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen de hoy</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Pill}          label="Medicamentos"    value={medications.length} color="green" />
        <StatCard icon={Bell}          label="Alertas"         value={unreadCount}        color={unreadCount > 0 ? 'red' : 'gray'} />
        <StatCard icon={Clock}         label="Dosis pendientes" value={pendingDoses.length} color={pendingDoses.length > 0 ? 'yellow' : 'gray'} />
      </div>

      {/* Today's doses */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Dosis de hoy</h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay dosis programadas para hoy.</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((dose, i) => (
              <DoseTracker key={`${dose.medication.id}-${i}`} scheduledDose={dose} />
            ))}
          </div>
        )}
      </section>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            Stock bajo
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {lowStock.map(m => <MedicationCard key={m.id} medication={m} />)}
          </div>
        </section>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            Próximos a vencer
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {expiringSoon.map(m => <MedicationCard key={m.id} medication={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: ElementType
  label: string
  value: number
  color: 'green' | 'red' | 'yellow' | 'gray'
}

const colorMap: Record<StatCardProps['color'], string> = {
  green:  'bg-health-50 text-health-600',
  red:    'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  gray:   'bg-slate-50 text-slate-400',
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/Dashboard.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Dashboard.tsx client/src/pages/__tests__/Dashboard.test.tsx
git commit -m "feat: add Dashboard page"
```

---

### Task 20: Inventario

**Files:**
- Create: `client/src/pages/Inventario.tsx`
- Test: `client/src/pages/__tests__/Inventario.test.tsx`

Nota: los botones de exportación PDF/Excel se cablearán en Task 25 (Chunk 6). Por ahora se deja un comentario de placeholder.

- [ ] **Step 1: Escribir el test fallido para Inventario**

```typescript
// client/src/pages/__tests__/Inventario.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Inventario from '../Inventario'

vi.mock('../../hooks/useMedications', () => ({ useMedications: vi.fn() }))
vi.mock('../../utils/dates', () => ({ daysUntil: vi.fn(() => 60) }))

import { useMedications } from '../../hooks/useMedications'

const makeMed = (id: string, name: string, active = true, current = 10, min = 5) => ({
  id, name, active, quantity_current: current, quantity_minimum: min,
  quantity_unit: 'pastillas', dose_amount: 1, dose_times: ['08:00'],
  expiration_date: null, purchase_date: null, description: null,
  dose_frequency: 'diaria', user_id: 'u1', created_at: '2026-01-01',
})

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Inventario', () => {
  beforeEach(() => {
    vi.mocked(useMedications).mockReturnValue({ data: [], isLoading: false } as any)
  })

  it('shows empty state when no medications', () => {
    wrap(<Inventario />)
    expect(screen.getByText('No hay medicamentos.')).toBeInTheDocument()
  })

  it('filters medications by search term', () => {
    vi.mocked(useMedications).mockReturnValue({
      data: [makeMed('1', 'Aspirina'), makeMed('2', 'Ibuprofeno')],
      isLoading: false,
    } as any)
    wrap(<Inventario />)
    fireEvent.change(screen.getByPlaceholderText('Buscar medicamento...'), { target: { value: 'Asp' } })
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
    expect(screen.queryByText('Ibuprofeno')).not.toBeInTheDocument()
  })

  it('shows only active medications on initial filter', () => {
    vi.mocked(useMedications).mockReturnValue({
      data: [makeMed('1', 'Aspirina', true), makeMed('2', 'Ibuprofeno', false)],
      isLoading: false,
    } as any)
    wrap(<Inventario />)
    // Default filter is 'active'
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
    expect(screen.queryByText('Ibuprofeno')).not.toBeInTheDocument()
  })

  it('shows FAB button to add medication', () => {
    wrap(<Inventario />)
    expect(screen.getByLabelText('Agregar medicamento')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/Inventario.test.tsx
```
Expected: FAIL con "Cannot find module '../Inventario'"

- [ ] **Step 3: Crear Inventario.tsx**

```typescript
// client/src/pages/Inventario.tsx
import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useMedications } from '../hooks/useMedications'
import { daysUntil } from '../utils/dates'
import MedicationCard from '../components/MedicationCard'
import MedicationForm from '../components/MedicationForm'

type FilterType = 'all' | 'active' | 'lowstock' | 'expiring'

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todos', active: 'Activos', lowstock: 'Stock bajo', expiring: 'Por vencer',
}

export default function Inventario() {
  const { data: medications = [], isLoading } = useMedications(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterType>('active')
  const [showForm, setShowForm] = useState(false)

  const filtered = medications.filter(m => {
    const matchesSearch  = m.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all'      ? true
      : filter === 'active'   ? m.active
      : filter === 'lowstock' ? m.quantity_current <= m.quantity_minimum
      : filter === 'expiring' ? (m.expiration_date != null && daysUntil(m.expiration_date) <= 30)
      : true
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Inventario</h1>
        {/* Botones de exportación — se agregan en Task 25 */}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar medicamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm bg-white"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-health-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Medication list */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">No hay medicamentos.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(m => <MedicationCard key={m.id} medication={m} />)}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        aria-label="Agregar medicamento"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-health-500 hover:bg-health-600 text-white rounded-full shadow-lg shadow-health-200 flex items-center justify-center transition-colors z-20"
      >
        <Plus size={24} />
      </button>

      <MedicationForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/Inventario.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Inventario.tsx client/src/pages/__tests__/Inventario.test.tsx
git commit -m "feat: add Inventario page with search and filters"
```

---

### Task 21: MedicamentoDetalle

**Files:**
- Modify: `client/src/hooks/useMedications.ts` (agregar `useMedicationById`)
- Modify: `client/src/hooks/useDoseLogs.ts` (agregar `useDoseLogsByMedicationId`)
- Create: `client/src/pages/MedicamentoDetalle.tsx`
- Test: `client/src/pages/__tests__/MedicamentoDetalle.test.tsx`

- [ ] **Step 0: Agregar hooks necesarios para el detalle**

Agregar al final de `client/src/hooks/useMedications.ts` (el servicio `fetchMedicationById` ya debería existir o añadir también a `services/medications.ts` si falta):

```typescript
// En services/medications.ts — agregar si no existe:
export async function fetchMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// En hooks/useMedications.ts — agregar al final:
import { fetchMedicationById } from '../services/medications'

export function useMedicationById(id: string) {
  return useQuery({
    queryKey: ['medications', id],
    queryFn: () => fetchMedicationById(id),
    enabled: !!id,
  })
}
```

Agregar al final de `client/src/hooks/useDoseLogs.ts`:

```typescript
// En services/doseLogs.ts — agregar si no existe:
export async function fetchDoseLogsByMedicationId(medicationId: string): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// En hooks/useDoseLogs.ts — agregar al final:
import { fetchDoseLogsByMedicationId } from '../services/doseLogs'

export function useDoseLogsByMedicationId(medicationId: string) {
  return useQuery({
    queryKey: ['dose_logs', 'by_medication', medicationId],
    queryFn: () => fetchDoseLogsByMedicationId(medicationId),
    enabled: !!medicationId,
  })
}
```

Verificar compilación:

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 1: Escribir el test fallido para MedicamentoDetalle**

```typescript
// client/src/pages/__tests__/MedicamentoDetalle.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MedicamentoDetalle from '../MedicamentoDetalle'

vi.mock('../../hooks/useMedications', () => ({
  useMedicationById: vi.fn(),
  useUpdateMedication: vi.fn(),
}))
vi.mock('../../hooks/useDoseLogs', () => ({
  useDoseLogsByMedicationId: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({
  formatDate: (d: string) => d,
  formatDoseTime: (t: string) => t,
}))

import { useMedicationById, useUpdateMedication } from '../../hooks/useMedications'
import { useDoseLogsByMedicationId } from '../../hooks/useDoseLogs'

const baseMed = {
  id: 'med-1', name: 'Aspirina', description: 'Para el dolor',
  quantity_current: 20, quantity_minimum: 5, quantity_unit: 'pastillas',
  dose_amount: 1, dose_times: ['08:00', '20:00'], dose_frequency: 'cada 12 horas',
  expiration_date: '2027-01-01', purchase_date: null,
  active: true, user_id: 'u1', created_at: '2026-01-01',
}

const wrap = () => render(
  <MemoryRouter initialEntries={['/medicamentos/med-1']}>
    <Routes>
      <Route path="/medicamentos/:id" element={<MedicamentoDetalle />} />
    </Routes>
  </MemoryRouter>
)

describe('MedicamentoDetalle', () => {
  beforeEach(() => {
    vi.mocked(useMedicationById).mockReturnValue({ data: baseMed, isLoading: false } as any)
    vi.mocked(useUpdateMedication).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useDoseLogsByMedicationId).mockReturnValue({ data: [] } as any)
  })

  it('shows the medication name', () => {
    wrap()
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
  })

  it('shows the description', () => {
    wrap()
    expect(screen.getByText('Para el dolor')).toBeInTheDocument()
  })

  it('shows "Historial de tomas" section', () => {
    wrap()
    expect(screen.getByText('Historial de tomas')).toBeInTheDocument()
  })

  it('shows empty state when no dose logs', () => {
    wrap()
    expect(screen.getByText('Sin historial de tomas.')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useMedicationById).mockReturnValue({ data: undefined, isLoading: true } as any)
    wrap()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/MedicamentoDetalle.test.tsx
```
Expected: FAIL con "Cannot find module '../MedicamentoDetalle'"

- [ ] **Step 3: Crear MedicamentoDetalle.tsx**

```typescript
// client/src/pages/MedicamentoDetalle.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, PowerOff } from 'lucide-react'
import { useMedicationById, useUpdateMedication } from '../hooks/useMedications'
import { useDoseLogsByMedicationId } from '../hooks/useDoseLogs'
import { formatDate, formatDoseTime } from '../utils/dates'
import StockBadge from '../components/StockBadge'
import ExpirationBadge from '../components/ExpirationBadge'
import RestockDateChip from '../components/RestockDateChip'
import MedicationForm from '../components/MedicationForm'
import Button from '../components/ui/Button'

const STATUS_LABEL: Record<string, string> = {
  taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
}
const STATUS_COLOR: Record<string, string> = {
  taken: 'text-health-600', skipped: 'text-slate-400', missed: 'text-red-500',
}

export default function MedicamentoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)

  const { data: medication, isLoading } = useMedicationById(id!)
  const { data: doseLogs = [] } = useDoseLogsByMedicationId(id!)
  const updateMutation = useUpdateMedication()

  if (isLoading) return <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
  if (!medication) return <p className="text-sm text-red-500 text-center py-12">Medicamento no encontrado.</p>

  async function handleDeactivate() {
    if (!confirm('¿Desactivar este medicamento? No se podrán marcar dosis nuevas.')) return
    await updateMutation.mutateAsync({ id: medication!.id, payload: { active: false } })
    navigate('/inventario')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{medication.name}</h1>
            {medication.description && (
              <p className="text-sm text-slate-500 mt-1">{medication.description}</p>
            )}
            {!medication.active && (
              <span className="inline-block mt-2 text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                Inactivo
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
              <Edit2 size={13} /> Editar
            </Button>
            {medication.active && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeactivate}
                loading={updateMutation.isPending}
              >
                <PowerOff size={13} /> Desactivar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <StockBadge medication={medication} />
          <ExpirationBadge expirationDate={medication.expiration_date} />
        </div>
        <div className="mt-3">
          <RestockDateChip medication={medication} />
        </div>

        {/* Dose schedule */}
        <div className="mt-5 pt-5 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Horarios de toma
          </p>
          <div className="flex flex-wrap gap-2">
            {(medication.dose_times ?? []).map((t, i) => (
              <span key={i} className="px-3 py-1 bg-health-50 text-health-700 rounded-full text-sm font-medium">
                {formatDoseTime(t)}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {medication.dose_amount} {medication.quantity_unit} por toma · {medication.dose_frequency}
          </p>
        </div>
      </div>

      {/* Dose history */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Historial de tomas</h2>
        {doseLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin historial de tomas.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Programada</th>
                  <th className="text-left px-4 py-3">Tomada</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {doseLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(log.scheduled_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDoseTime(log.scheduled_at.slice(11, 16))}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.taken_at ? formatDoseTime(log.taken_at.slice(11, 16)) : '—'}
                    </td>
                    <td className={`px-4 py-3 font-medium ${STATUS_COLOR[log.status] ?? ''}`}>
                      {STATUS_LABEL[log.status] ?? log.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MedicationForm open={showEdit} onClose={() => setShowEdit(false)} medication={medication} />
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/MedicamentoDetalle.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/MedicamentoDetalle.tsx client/src/pages/__tests__/MedicamentoDetalle.test.tsx
git commit -m "feat: add MedicamentoDetalle page"
```

---

### Task 22: Historial

**Files:**
- Modify: `client/src/services/doseLogs.ts` (agregar `fetchAllDoseLogs` + tipo `DoseLogWithMedication`)
- Modify: `client/src/hooks/useDoseLogs.ts` (agregar `useAllDoseLogs`)
- Create: `client/src/pages/Historial.tsx`
- Test: `client/src/pages/__tests__/Historial.test.tsx`

Nota: los botones de exportación Excel se cablearán en Task 25.

- [ ] **Step 1: Agregar `fetchAllDoseLogs` a services/doseLogs.ts**

Agregar al final del archivo `client/src/services/doseLogs.ts`:

```typescript
// Tipo extendido con nombre del medicamento (join)
export interface DoseLogWithMedication extends DoseLog {
  medication: { name: string }
}

export async function fetchAllDoseLogs(): Promise<DoseLogWithMedication[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*, medication:medications(name)')
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data as DoseLogWithMedication[]
}
```

- [ ] **Step 2: Agregar `useAllDoseLogs` a hooks/useDoseLogs.ts**

En el archivo `client/src/hooks/useDoseLogs.ts`, agregar `fetchAllDoseLogs` a la línea de import existente de `'../services/doseLogs'` (que ya importa `fetchDoseLogs`, `fetchTodayDoseLogs`, etc.), y luego agregar la función al final del archivo:

```typescript
// 1. En la línea import existente, agregar fetchAllDoseLogs:
//    import { ..., fetchAllDoseLogs } from '../services/doseLogs'

// 2. Agregar al final del archivo:
export function useAllDoseLogs() {
  return useQuery({
    queryKey: ['dose_logs', 'all'],
    queryFn: fetchAllDoseLogs,
  })
}
```

- [ ] **Step 3: Escribir el test fallido para Historial**

```typescript
// client/src/pages/__tests__/Historial.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Historial from '../Historial'

vi.mock('../../hooks/useDoseLogs', () => ({ useAllDoseLogs: vi.fn() }))
vi.mock('../../hooks/useMedications', () => ({ useMedications: vi.fn() }))
vi.mock('../../utils/dates', () => ({ formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))

import { useAllDoseLogs } from '../../hooks/useDoseLogs'
import { useMedications } from '../../hooks/useMedications'

const makeLog = (id: string, status: string, medName = 'Aspirina') => ({
  id,
  medication_id: 'med-1',
  user_id: 'u1',
  status,
  scheduled_at: '2026-03-15T08:00:00Z',
  taken_at: status === 'taken' ? '2026-03-15T08:05:00Z' : null,
  notes: null,
  created_at: '2026-03-15',
  medication: { name: medName },
})

const wrap = () => render(<MemoryRouter><Historial /></MemoryRouter>)

describe('Historial', () => {
  beforeEach(() => {
    vi.mocked(useAllDoseLogs).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useMedications).mockReturnValue({ data: [] } as any)
  })

  it('renders table headers', () => {
    wrap()
    expect(screen.getByText('Medicamento')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    wrap()
    expect(screen.getByText('Sin registros.')).toBeInTheDocument()
  })

  it('shows all logs initially', () => {
    vi.mocked(useAllDoseLogs).mockReturnValue({
      data: [makeLog('1', 'taken'), makeLog('2', 'missed')],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getAllByRole('row').length).toBe(3) // header + 2 data rows
  })

  it('filters by status', () => {
    vi.mocked(useAllDoseLogs).mockReturnValue({
      data: [makeLog('1', 'taken'), makeLog('2', 'missed')],
      isLoading: false,
    } as any)
    wrap()
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'taken' } })
    expect(screen.getAllByRole('row').length).toBe(2) // header + 1 data row
  })
})
```

- [ ] **Step 4: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/Historial.test.tsx
```
Expected: FAIL con "Cannot find module '../Historial'"

- [ ] **Step 5: Crear Historial.tsx**

```typescript
// client/src/pages/Historial.tsx
import { useState, useMemo } from 'react'
import { useAllDoseLogs } from '../hooks/useDoseLogs'
import { useMedications } from '../hooks/useMedications'
import { formatDate, formatDoseTime } from '../utils/dates'

type StatusFilter = 'all' | 'taken' | 'skipped' | 'missed'

const STATUS_LABEL: Record<string, string> = {
  taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
}
const STATUS_COLOR: Record<string, string> = {
  taken: 'text-health-600', skipped: 'text-slate-400', missed: 'text-red-500',
}

export default function Historial() {
  const { data: logs = [], isLoading } = useAllDoseLogs()
  const { data: medications = [] } = useMedications(false)

  const [medFilter, setMedFilter]       = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const filtered = useMemo(() => logs.filter(log => {
    if (medFilter !== 'all'    && log.medication_id !== medFilter) return false
    if (statusFilter !== 'all' && log.status        !== statusFilter) return false
    if (dateFrom && log.scheduled_at < dateFrom)              return false
    if (dateTo   && log.scheduled_at > dateTo + 'T23:59:59') return false
    return true
  }), [logs, medFilter, statusFilter, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Historial de tomas</h1>
        {/* Botón exportar Excel — se agrega en Task 25 */}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="hist-med" className="block text-xs font-medium text-slate-500 mb-1">
            Medicamento
          </label>
          <select
            id="hist-med"
            value={medFilter}
            onChange={e => setMedFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-health-400"
          >
            <option value="all">Todos</option>
            {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-status" className="block text-xs font-medium text-slate-500 mb-1">
            Estado
          </label>
          <select
            id="hist-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-health-400"
          >
            <option value="all">Todos</option>
            <option value="taken">Tomada</option>
            <option value="skipped">Omitida</option>
            <option value="missed">Perdida</option>
          </select>
        </div>
        <div>
          <label htmlFor="hist-from" className="block text-xs font-medium text-slate-500 mb-1">
            Desde
          </label>
          <input
            id="hist-from"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-health-400"
          />
        </div>
        <div>
          <label htmlFor="hist-to" className="block text-xs font-medium text-slate-500 mb-1">
            Hasta
          </label>
          <input
            id="hist-to"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-health-400"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Sin registros.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Medicamento</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Programada</th>
                <th className="text-left px-4 py-3">Tomada</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.medication.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(log.scheduled_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDoseTime(log.scheduled_at.slice(11, 16))}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {log.taken_at ? formatDoseTime(log.taken_at.slice(11, 16)) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${STATUS_COLOR[log.status] ?? ''}`}>
                    {STATUS_LABEL[log.status] ?? log.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/Historial.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 7: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add client/src/services/doseLogs.ts client/src/hooks/useDoseLogs.ts client/src/pages/Historial.tsx client/src/pages/__tests__/Historial.test.tsx
git commit -m "feat: add Historial page with filters and fetchAllDoseLogs hook"
```

---

### Task 23: Notificaciones

**Files:**
- Create: `client/src/pages/Notificaciones.tsx`
- Test: `client/src/pages/__tests__/Notificaciones.test.tsx`

- [ ] **Step 1: Escribir el test fallido para Notificaciones**

```typescript
// client/src/pages/__tests__/Notificaciones.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Notificaciones from '../Notificaciones'

vi.mock('../../hooks/useAlerts', () => ({
  useAlerts: vi.fn(),
  useMarkAlertRead: vi.fn(),
  useMarkAllAlertsRead: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({ formatDate: (d: string) => d }))

import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../../hooks/useAlerts'

const makeAlert = (id: string, isRead: boolean) => ({
  id,
  user_id: 'u1',
  medication_id: null,
  type: 'low_stock',
  message: `Alerta ${id}`,
  is_read: isRead,
  triggered_at: '2026-03-15T10:00:00Z',
  created_at: '2026-03-15',
})

const wrap = () => render(<MemoryRouter><Notificaciones /></MemoryRouter>)

describe('Notificaciones', () => {
  beforeEach(() => {
    vi.mocked(useAlerts).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useMarkAlertRead).mockReturnValue({ mutate: vi.fn() } as any)
    vi.mocked(useMarkAllAlertsRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  })

  it('shows empty state when no alerts', () => {
    wrap()
    expect(screen.getByText('Sin notificaciones.')).toBeInTheDocument()
  })

  it('shows "Marcar todas como leídas" when unread alerts exist', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', false)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getByText('Marcar todas como leídas')).toBeInTheDocument()
  })

  it('hides "Marcar todas" button when all alerts are read', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', true)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.queryByText('Marcar todas como leídas')).not.toBeInTheDocument()
  })

  it('shows individual "Leer" button for unread alerts', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', false)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getByText('Leer')).toBeInTheDocument()
  })

  it('calls markRead.mutate when "Leer" is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useMarkAlertRead).mockReturnValue({ mutate } as any)
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('alert-42', false)],
      isLoading: false,
    } as any)
    wrap()
    fireEvent.click(screen.getByText('Leer'))
    expect(mutate).toHaveBeenCalledWith('alert-42')
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/Notificaciones.test.tsx
```
Expected: FAIL con "Cannot find module '../Notificaciones'"

- [ ] **Step 3: Crear Notificaciones.tsx**

```typescript
// client/src/pages/Notificaciones.tsx
import type { ElementType } from 'react'
import { Bell, Package, Clock, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../hooks/useAlerts'
import { formatDate } from '../utils/dates'
import Button from '../components/ui/Button'

const TYPE_ICON: Record<string, ElementType> = {
  low_stock:     Package,
  expiration:    AlertTriangle,
  dose_reminder: Clock,
  restock_date:  ShoppingCart,
}
const TYPE_COLOR: Record<string, string> = {
  low_stock:     'text-yellow-500',
  expiration:    'text-red-500',
  dose_reminder: 'text-blue-500',
  restock_date:  'text-health-500',
}

export default function Notificaciones() {
  const { data: alerts = [], isLoading } = useAlerts()
  const markRead = useMarkAlertRead()
  const markAll  = useMarkAllAlertsRead()

  const unread = alerts.filter(a => !a.is_read)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Notificaciones</h1>
        {unread.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">Sin notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const Icon  = TYPE_ICON[alert.type]  ?? Bell
            const color = TYPE_COLOR[alert.type] ?? 'text-slate-400'
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-opacity ${
                  alert.is_read ? 'border-slate-100 opacity-60' : 'border-health-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(alert.triggered_at)}</p>
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markRead.mutate(alert.id)}
                    className="text-xs text-health-600 hover:text-health-700 font-medium shrink-0 mt-0.5"
                  >
                    Leer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/Notificaciones.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Notificaciones.tsx client/src/pages/__tests__/Notificaciones.test.tsx
git commit -m "feat: add Notificaciones page"
```

---

### Task 24: Configuración

**Files:**
- Create: `client/src/pages/Configuracion.tsx`
- Test: `client/src/pages/__tests__/Configuracion.test.tsx`

- [ ] **Step 1: Escribir el test fallido para Configuración**

```typescript
// client/src/pages/__tests__/Configuracion.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Configuracion from '../Configuracion'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../hooks/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
}))

import { useAuth } from '../../context/AuthContext'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'

const wrap = () => render(<MemoryRouter><Configuracion /></MemoryRouter>)

describe('Configuracion', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'test@example.com' },
      resetPassword: vi.fn(),
    } as any)
    vi.mocked(useProfile).mockReturnValue({
      data: {
        full_name: 'Juan',
        notification_email: '',
        restock_margin_days: 5,
        daily_summary_enabled: true,
      },
    } as any)
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any)
  })

  it('renders the page title', () => {
    wrap()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('pre-populates name from profile', () => {
    wrap()
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument()
  })

  it('shows user email (read-only)', () => {
    wrap()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('calls updateProfile on submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync, isPending: false } as any)
    wrap()
    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Juan' }))
    })
  })

  it('shows "Cambiar contraseña" button', () => {
    wrap()
    expect(screen.getByText('Cambiar contraseña')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/pages/__tests__/Configuracion.test.tsx
```
Expected: FAIL con "Cannot find module '../Configuracion'"

- [ ] **Step 3: Crear Configuracion.tsx**

```typescript
// client/src/pages/Configuracion.tsx
import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import Button from '../components/ui/Button'

export default function Configuracion() {
  const { user, resetPassword } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  const [name, setName]               = useState('')
  const [notifEmail, setNotifEmail]   = useState('')
  const [marginDays, setMarginDays]   = useState(5)
  const [dailySummary, setDailySummary] = useState(true)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [pwSent, setPwSent]           = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '')
      setNotifEmail(profile.notification_email ?? '')
      setMarginDays(profile.restock_margin_days ?? 5)
      setDailySummary(profile.daily_summary_enabled ?? true)
    }
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      await updateProfile.mutateAsync({
        full_name: name,
        notification_email: notifEmail || null,
        restock_margin_days: marginDays,
        daily_summary_enabled: dailySummary,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return
    await resetPassword(user.email)
    setPwSent(true)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Configuración</h1>

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Perfil</h2>

        {success && (
          <div className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-200">
            Cambios guardados correctamente.
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cfg-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nombre
          </label>
          <input
            id="cfg-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
        </div>

        <div>
          <label htmlFor="cfg-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email (cuenta)
          </label>
          <input
            id="cfg-email"
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="cfg-notif-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email para notificaciones
          </label>
          <input
            id="cfg-notif-email"
            type="email"
            value={notifEmail}
            onChange={e => setNotifEmail(e.target.value)}
            placeholder={user?.email ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">
            Si está vacío, se usará el email de la cuenta.
          </p>
        </div>

        <div>
          <label htmlFor="cfg-margin" className="block text-sm font-medium text-slate-700 mb-1.5">
            Días de margen para recompra
          </label>
          <input
            id="cfg-margin"
            type="number"
            min="1"
            max="30"
            value={marginDays}
            onChange={e => setMarginDays(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="cfg-summary"
            type="checkbox"
            checked={dailySummary}
            onChange={e => setDailySummary(e.target.checked)}
            className="w-4 h-4 rounded text-health-500 border-slate-300 focus:ring-health-400"
          />
          <label htmlFor="cfg-summary" className="text-sm text-slate-700">
            Recibir resumen diario por email
          </label>
        </div>

        <Button type="submit" loading={updateProfile.isPending} className="w-full">
          Guardar cambios
        </Button>
      </form>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Seguridad</h2>
        {pwSent ? (
          <p className="text-sm text-health-600">
            Email de restablecimiento enviado. Revisá tu bandeja de entrada.
          </p>
        ) : (
          <Button variant="secondary" onClick={handleResetPassword} className="w-full">
            Cambiar contraseña
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/pages/__tests__/Configuracion.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Configuracion.tsx client/src/pages/__tests__/Configuracion.test.tsx
git commit -m "feat: add Configuracion page"
```

---
## Chunk 6: Exportación + Edge Functions

### Task 25: services/export.ts + botones de exportación

**Files:**
- Create: `client/src/services/export.ts`
- Test: `client/src/services/__tests__/export.test.ts`
- Modify: `client/src/pages/Inventario.tsx` (agregar botones PDF + Excel)
- Modify: `client/src/pages/Historial.tsx` (agregar botón Excel completo)

- [ ] **Step 1: Escribir el test fallido para export.ts**

```typescript
// client/src/services/__tests__/export.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF y jspdf-autotable
vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  }
  return { default: vi.fn(() => mockDoc) }
})
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

// Mock SheetJS
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

// Mock utils — paths son relativos al archivo de test (src/services/__tests__/),
// por eso se sube dos niveles para llegar a src/utils/
vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null) }))
vi.mock('../../utils/dates',   () => ({ formatDate: (d: string) => d }))

import { exportInventoryPDF, exportInventoryExcel, exportHistorialExcel } from '../export'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const makeMed = (id: string) => ({
  id, name: 'Aspirina', description: null,
  quantity_current: 10, quantity_minimum: 5, quantity_unit: 'pastillas',
  dose_amount: 1, dose_times: ['08:00'], dose_frequency: 'diaria',
  expiration_date: null, purchase_date: null, active: true,
  user_id: 'u1', created_at: '2026-01-01',
})

const makeLog = (id: string) => ({
  id, medication_id: 'med-1', user_id: 'u1', status: 'taken',
  scheduled_at: '2026-03-15T08:00:00Z', taken_at: '2026-03-15T08:05:00Z',
  notes: null, created_at: '2026-03-15',
  medication: { name: 'Aspirina' },
})

describe('exportInventoryPDF', () => {
  it('creates a jsPDF instance and calls save', () => {
    exportInventoryPDF([makeMed('1')])
    expect(jsPDF).toHaveBeenCalled()
    const doc = vi.mocked(jsPDF).mock.results[0].value
    expect(doc.save).toHaveBeenCalledWith('medistock-inventario.pdf')
  })

  it('calls autoTable with correct headers', () => {
    exportInventoryPDF([makeMed('1')])
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        head: [['Nombre', 'Descripción', 'Stock', 'Unidad', 'Vencimiento', 'Recomprar', 'Estado']],
      })
    )
  })
})

describe('exportInventoryExcel', () => {
  it('creates workbook with "Inventario" sheet', () => {
    exportInventoryExcel([makeMed('1')])
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'Inventario'
    )
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'medistock-inventario.xlsx')
  })
})

describe('exportHistorialExcel', () => {
  it('creates workbook with "Inventario" and "Historial de Tomas" sheets', () => {
    exportHistorialExcel([makeMed('1')], [makeLog('1')])
    const calls = vi.mocked(XLSX.utils.book_append_sheet).mock.calls
    const sheetNames = calls.map(c => c[2])
    expect(sheetNames).toContain('Inventario')
    expect(sheetNames).toContain('Historial de Tomas')
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'medistock-historial.xlsx')
  })
})
```

- [ ] **Step 2: Ejecutar el test — esperar que falle**

```bash
cd client && npx vitest run src/services/__tests__/export.test.ts
```
Expected: FAIL con "Cannot find module '../export'"

- [ ] **Step 3: Crear services/export.ts**

```typescript
// client/src/services/export.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { calcRestockDate } from '../utils/restock'
import { formatDate } from '../utils/dates'
import type { Medication } from '../types'
import type { DoseLogWithMedication } from './doseLogs'

// ─── PDF ────────────────────────────────────────────────────────────────────

export function exportInventoryPDF(medications: Medication[]): void {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(34, 197, 94) // health-500
  doc.text('MediStock', 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, 14, 30)

  autoTable(doc, {
    startY: 38,
    head: [['Nombre', 'Descripción', 'Stock', 'Unidad', 'Vencimiento', 'Recomprar', 'Estado']],
    body: medications.map(m => {
      const restock = calcRestockDate(
        m.quantity_current,
        m.dose_amount,
        m.dose_times?.length ?? 0
      )
      return [
        m.name,
        m.description ?? '',
        m.quantity_current.toString(),
        m.quantity_unit,
        m.expiration_date ? formatDate(m.expiration_date) : '—',
        restock ? formatDate(restock.toISOString()) : '—',
        m.active ? 'Activo' : 'Inactivo',
      ]
    }),
    styles:     { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  doc.save('medistock-inventario.pdf')
}

// ─── Excel ───────────────────────────────────────────────────────────────────

function buildInventoryRows(medications: Medication[]) {
  return medications.map(m => ({
    Nombre:         m.name,
    'Descripción':  m.description ?? '',
    'Stock actual': m.quantity_current,
    Unidad:         m.quantity_unit,
    Vencimiento:    m.expiration_date ?? '',
    Estado:         m.active ? 'Activo' : 'Inactivo',
  }))
}

export function exportInventoryExcel(medications: Medication[]): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(buildInventoryRows(medications))
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  XLSX.writeFile(wb, 'medistock-inventario.xlsx')
}

export function exportHistorialExcel(
  medications: Medication[],
  doseLogs: DoseLogWithMedication[]
): void {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Inventory
  const ws1 = XLSX.utils.json_to_sheet(buildInventoryRows(medications))
  XLSX.utils.book_append_sheet(wb, ws1, 'Inventario')

  // Sheet 2: Dose history
  const STATUS_ES: Record<string, string> = {
    taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
  }
  const historialRows = doseLogs.map(log => ({
    Medicamento:        log.medication.name,
    Fecha:              formatDate(log.scheduled_at),
    'Hora programada':  log.scheduled_at.slice(11, 16),
    'Hora tomada':      log.taken_at ? log.taken_at.slice(11, 16) : '',
    Estado:             STATUS_ES[log.status] ?? log.status,
    Notas:              log.notes ?? '',
  }))
  const ws2 = XLSX.utils.json_to_sheet(historialRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Historial de Tomas')

  XLSX.writeFile(wb, 'medistock-historial.xlsx')
}
```

- [ ] **Step 4: Ejecutar el test — esperar que pase**

```bash
cd client && npx vitest run src/services/__tests__/export.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 5: Agregar botones de exportación en Inventario.tsx**

Reemplazar el comentario `{/* Botones de exportación — se agregan en Task 25 */}` en `Inventario.tsx`:

```typescript
// Agregar imports al tope del archivo:
import { FileText, FileSpreadsheet } from 'lucide-react'
import { exportInventoryPDF, exportInventoryExcel } from '../services/export'

// Reemplazar el bloque de botones vacío:
<div className="flex gap-2">
  <button
    onClick={() => exportInventoryPDF(medications.filter(m => m.active))}
    title="Exportar PDF"
    aria-label="Exportar PDF"
    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
  >
    <FileText size={16} />
  </button>
  <button
    onClick={() => exportInventoryExcel(medications.filter(m => m.active))}
    title="Exportar Excel"
    aria-label="Exportar Excel"
    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
  >
    <FileSpreadsheet size={16} />
  </button>
</div>
```

- [ ] **Step 6: Agregar botón de exportación en Historial.tsx**

Reemplazar el comentario `{/* Botón exportar Excel — se agrega en Task 25 */}` en `Historial.tsx`:

```typescript
// Agregar imports al tope del archivo:
import { FileSpreadsheet } from 'lucide-react'
import { exportHistorialExcel } from '../services/export'

// En el componente, agregar after los hooks existentes.
// useMedications(false) pasa activeOnly=false para incluir todos los medicamentos
// (activos e inactivos) en la hoja "Inventario" del Excel. Firma definida en Task 10.
const { data: allMedications = [] } = useMedications(false)

// Reemplazar el comentario con:
<button
  onClick={() => exportHistorialExcel(allMedications, logs)}
  title="Exportar Excel"
  aria-label="Exportar Excel"
  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
>
  <FileSpreadsheet size={16} />
</button>
```

- [ ] **Step 7: Verificar que TypeScript compila**

```bash
cd client && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add client/src/services/export.ts client/src/services/__tests__/export.test.ts client/src/pages/Inventario.tsx client/src/pages/Historial.tsx
git commit -m "feat: add PDF/Excel export service and wire export buttons"
```

---

### Task 26: Edge Function check-stock

**Files:**
- Create: `supabase/functions/check-stock/index.ts`

- [ ] **Step 1: Crear check-stock/index.ts**

```typescript
// supabase/functions/check-stock/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Fetch all active medications
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, quantity_current, quantity_minimum')
      .eq('active', true)
    if (medsErr) throw medsErr

    const lowStockMeds = (meds ?? []).filter(
      m => m.quantity_current <= m.quantity_minimum
    )

    let processed = 0

    for (const med of lowStockMeds) {
      // 2. Dedup: skip if unread low_stock alert already exists
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('medication_id', med.id)
        .eq('type', 'low_stock')
        .eq('is_read', false)
      if (count !== null && count > 0) continue

      // 3. Create alert
      await supabase.from('alerts').insert({
        user_id:       med.user_id,
        medication_id: med.id,
        type:          'low_stock',
        message:       `Stock bajo en ${med.name}: ${med.quantity_current} unidades restantes.`,
      })

      // 4. Get notification email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_email')
        .eq('id', med.user_id)
        .single()

      const to = profile?.notification_email
      if (!to) { processed++; continue }

      // 5. Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <alertas@medistock.app>',
          to:      [to],
          subject: `⚠️ Stock bajo: ${med.name}`,
          html:    `<p>Tu medicamento <strong>${med.name}</strong> tiene stock bajo ` +
                   `(${med.quantity_current} unidades). Recordá reabastecerte pronto.</p>`,
        }),
      })

      processed++
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Desplegar la función**

```bash
supabase functions deploy check-stock --no-verify-jwt
```
Expected: "Deployed: check-stock"

- [ ] **Step 3: Probar manualmente con invoke**

```bash
supabase functions invoke check-stock
```
Expected: `{"ok":true,"processed":N}` donde N es el número de alertas creadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-stock/
git commit -m "feat: add check-stock edge function"
```

---

### Task 27: Edge Function check-expiration

**Files:**
- Create: `supabase/functions/check-expiration/index.ts`

- [ ] **Step 1: Crear check-expiration/index.ts**

```typescript
// supabase/functions/check-expiration/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now           = new Date()
    const todayStr      = now.toISOString().slice(0, 10)
    const sevenDaysStr  = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const tomorrowStr   = new Date(now.getTime() + 1  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dedup24h      = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Medications expiring within 7 days (and not already expired)
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, expiration_date')
      .eq('active', true)
      .not('expiration_date', 'is', null)
      .gte('expiration_date', todayStr)
      .lte('expiration_date', sevenDaysStr)
    if (medsErr) throw medsErr

    let processed = 0

    for (const med of meds ?? []) {
      // Dedup: skip if unread expiration alert created in last 24 hours
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('medication_id', med.id)
        .eq('type', 'expiration')
        .eq('is_read', false)
        .gte('triggered_at', dedup24h)
      if (count !== null && count > 0) continue

      const daysLeft = Math.ceil(
        (new Date(med.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isUrgent = med.expiration_date === tomorrowStr

      // Create alert
      await supabase.from('alerts').insert({
        user_id:       med.user_id,
        medication_id: med.id,
        type:          'expiration',
        message:       `${med.name} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`,
      })

      // Get notification email
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_email')
        .eq('id', med.user_id)
        .single()

      const to = profile?.notification_email
      if (!to) { processed++; continue }

      const subject = isUrgent
        ? `🚨 ¡${med.name} vence mañana!`
        : `⚠️ ${med.name} vence en ${daysLeft} días`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <alertas@medistock.app>',
          to:      [to],
          subject,
          html:    `<p>Tu medicamento <strong>${med.name}</strong> vence el ` +
                   `${med.expiration_date} (en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}).</p>`,
        }),
      })

      processed++
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Desplegar la función**

```bash
supabase functions deploy check-expiration --no-verify-jwt
```
Expected: "Deployed: check-expiration"

- [ ] **Step 3: Probar manualmente**

```bash
supabase functions invoke check-expiration
```
Expected: `{"ok":true,"processed":N}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-expiration/
git commit -m "feat: add check-expiration edge function"
```

---

### Task 28: Edge Function send-daily-summary

**Files:**
- Create: `supabase/functions/send-daily-summary/index.ts`

- [ ] **Step 1: Crear send-daily-summary/index.ts**

```typescript
// supabase/functions/send-daily-summary/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const nowUTC = new Date()

    // Fetch profiles with daily summary enabled and a notification email
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, notification_email, timezone')
      .eq('daily_summary_enabled', true)
      .not('notification_email', 'is', null)
    if (profErr) throw profErr

    let sent = 0

    for (const profile of profiles ?? []) {
      // Filter: only send if user's local time is between 6 AM and 8 AM
      const tz = profile.timezone ?? 'America/Argentina/Buenos_Aires'
      const localHour = parseInt(
        new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(nowUTC),
        10
      )
      if (localHour < 6 || localHour > 8) continue

      // Get user's active medications with dose times
      const { data: meds } = await supabase
        .from('medications')
        .select('name, dose_times, dose_amount, quantity_unit')
        .eq('user_id', profile.id)
        .eq('active', true)

      const doseItems = (meds ?? [])
        .filter(m => m.dose_times?.length > 0)
        .flatMap(m =>
          (m.dose_times as string[]).map(t =>
            `<li>${m.name} — ${t} (${m.dose_amount} ${m.quantity_unit})</li>`
          )
        )

      if (doseItems.length === 0) continue

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <resumen@medistock.app>',
          to:      [profile.notification_email],
          subject: '💊 Tu resumen de dosis de hoy',
          html:    `<h2>Tus dosis de hoy</h2><ul>${doseItems.join('')}</ul>` +
                   `<p>¡Que tengas un buen día!</p>`,
        }),
      })

      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Desplegar la función**

```bash
supabase functions deploy send-daily-summary --no-verify-jwt
```
Expected: "Deployed: send-daily-summary"

- [ ] **Step 3: Probar manualmente (ajustar timezone si es necesario)**

```bash
supabase functions invoke send-daily-summary
```
Expected: `{"ok":true,"sent":N}`

Si `sent=0` porque la hora local no está en la ventana 6–8 AM, se puede invocar directamente via cURL con el header correcto para bypasear la verificación de JWT.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-daily-summary/
git commit -m "feat: add send-daily-summary edge function"
```

---

### Task 29: Edge Function check-doses

**Files:**
- Create: `supabase/functions/check-doses/index.ts`

- [ ] **Step 1: Crear check-doses/index.ts**

```typescript
// supabase/functions/check-doses/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOLERANCE_MS    = 5 * 60 * 1000   // 5 minutes

serve(async (_req) => {
  try {
    const supabase   = createClient(supabaseUrl, serviceRoleKey)
    const now        = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Fetch all active medications with dose times
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, dose_times')
      .eq('active', true)
    if (medsErr) throw medsErr

    let missedCount = 0

    for (const med of meds ?? []) {
      for (const timeStr of (med.dose_times ?? []) as string[]) {
        const [hh, mm] = timeStr.split(':').map(Number)

        // Build the scheduled Date for today at this time
        const scheduledAt = new Date(now)
        scheduledAt.setHours(hh, mm, 0, 0)

        // Only process doses that were scheduled in the last hour
        if (scheduledAt < oneHourAgo || scheduledAt >= now) continue

        const windowStart = new Date(scheduledAt.getTime() - TOLERANCE_MS).toISOString()
        const windowEnd   = new Date(scheduledAt.getTime() + TOLERANCE_MS).toISOString()

        // Check if a dose log already exists within the tolerance window
        const { count } = await supabase
          .from('dose_logs')
          .select('*', { count: 'exact', head: true })
          .eq('medication_id', med.id)
          .gte('scheduled_at', windowStart)
          .lte('scheduled_at', windowEnd)
        if (count !== null && count > 0) continue

        const scheduledAtISO = scheduledAt.toISOString()

        // Insert missed dose log
        await supabase.from('dose_logs').insert({
          user_id:       med.user_id,
          medication_id: med.id,
          status:        'missed',
          scheduled_at:  scheduledAtISO,
          taken_at:      null,
        })

        // Create dose_reminder alert
        await supabase.from('alerts').insert({
          user_id:       med.user_id,
          medication_id: med.id,
          type:          'dose_reminder',
          message:       `Dosis perdida de ${med.name} a las ${timeStr}.`,
        })

        missedCount++
      }
    }

    return new Response(JSON.stringify({ ok: true, missed: missedCount }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Desplegar la función**

```bash
supabase functions deploy check-doses --no-verify-jwt
```
Expected: "Deployed: check-doses"

- [ ] **Step 3: Probar manualmente**

```bash
supabase functions invoke check-doses
```
Expected: `{"ok":true,"missed":N}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-doses/
git commit -m "feat: add check-doses edge function"
```

---

### Task 30: pg_cron + Despliegue final

**Files:**
- Create: `supabase/migrations/002_pg_cron.sql`
- Create: `DEPLOY.md`

- [ ] **Step 1: Crear migración pg_cron**

```sql
-- supabase/migrations/002_pg_cron.sql
-- Configura los cron jobs para invocar las Edge Functions via pg_net.
-- Reemplazar <PROJECT_REF> con el ref de tu proyecto Supabase (ej: abcdefghijklmnop).
-- El SERVICE_ROLE_KEY está disponible en Supabase Dashboard → Settings → API.

-- Medianoche: check-stock
SELECT cron.schedule(
  'check-stock-midnight',
  '0 0 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-stock',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- Medianoche: check-expiration
SELECT cron.schedule(
  'check-expiration-midnight',
  '0 0 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-expiration',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- 7:00 AM UTC: send-daily-summary
SELECT cron.schedule(
  'send-daily-summary-morning',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-summary',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- Cada hora: check-doses
SELECT cron.schedule(
  'check-doses-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-doses',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    )
  $$
);
```

- [ ] **Step 2: Aplicar la migración**

```bash
# Opción A — Supabase CLI (proyecto vinculado):
supabase db push

# Opción B — SQL Editor en Dashboard de Supabase:
# Pegar el contenido de 002_pg_cron.sql después de reemplazar <PROJECT_REF> y <SERVICE_ROLE_KEY>
```
Expected: sin errores. Verificar en Dashboard → Database → Extensions que `pg_cron` y `pg_net` están habilitadas.

- [ ] **Step 3: Configurar secret RESEND_API_KEY**

```bash
supabase secrets set RESEND_API_KEY=<tu_api_key_de_resend>
```
Expected: "Secret set: RESEND_API_KEY"

- [ ] **Step 4: Verificar variables de entorno del cliente**

Crear `client/.env.local` (no commitear):
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

- [ ] **Step 5: Build de producción y deploy**

```bash
cd client && npm run build
```
Expected: directorio `client/dist/` generado sin errores.

Deploy en Vercel:
```bash
# Si tienes Vercel CLI:
vercel --prod
# O bien: conectar el repo en vercel.com y configurar:
#   Build Command: npm run build
#   Output Directory: dist
#   Root Directory: client
#   Environment Variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

- [ ] **Step 6: Ejecutar suite de tests completa**

```bash
cd client && npx vitest run
```
Expected: todos los tests PASS (sin fallos).

- [ ] **Step 7: Crear DEPLOY.md con instrucciones de despliegue**

```markdown
# MediStock — Guía de Despliegue

## Requisitos previos
- Proyecto Supabase creado (free tier es suficiente)
- Cuenta Resend (free tier: 3 000 emails/mes)
- Cuenta Vercel o Netlify

## 1. Base de datos

Aplicar migraciones en orden:

\`\`\`bash
supabase db push
# o pegar manualmente en SQL Editor:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_pg_cron.sql  (reemplazar PROJECT_REF y SERVICE_ROLE_KEY)
\`\`\`

Habilitar extensiones en Dashboard → Database → Extensions:
- `pg_cron`
- `pg_net`

## 2. Edge Functions

\`\`\`bash
supabase functions deploy check-stock
supabase functions deploy check-expiration
supabase functions deploy send-daily-summary
supabase functions deploy check-doses
\`\`\`

## 3. Secrets

\`\`\`bash
supabase secrets set RESEND_API_KEY=<tu_api_key>
\`\`\`

## 4. Frontend

Crear `client/.env.local`:
\`\`\`
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
\`\`\`

Build y deploy:
\`\`\`bash
cd client && npm run build
vercel --prod
\`\`\`

## 5. Verificación post-deploy

- [ ] Registrar usuario y verificar email
- [ ] Crear medicamento y ver en Dashboard
- [ ] Marcar dosis como tomada — verificar stock se descuenta
- [ ] Invocar Edge Function manualmente: `supabase functions invoke check-stock`
- [ ] Verificar alerta en `/notificaciones`
```

- [ ] **Step 8: Commit final**

```bash
git add supabase/migrations/002_pg_cron.sql DEPLOY.md
git commit -m "feat: add pg_cron migration, deploy guide, and complete MediStock implementation"
```

---
