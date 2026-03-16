# MediStock — Documento de Diseño
**Fecha:** 2026-03-15
**Estado:** Aprobado

---

## 1. Resumen

MediStock es una aplicación web para gestión de inventario de medicamentos de uso personal/familiar. Permite registrar medicamentos, configurar horarios de toma, recibir alertas de stock bajo y vencimiento, exportar reportes y llevar un historial de dosis tomadas.

**Idioma de la interfaz:** Español
**Estilo visual:** Consumer health app moderno (Apple Health / Headspace), gradientes sutiles, íconos redondeados, paleta neutra con acentos en verde salud (#22c55e)

---

## 2. Stack Tecnológico

### Frontend
- **React 18 + Vite + TypeScript**
- **TailwindCSS** — estilos responsive, mobile-first
- **TanStack Query (React Query v5)** — fetching y caché de datos
- **Supabase JS Client** — auth + acceso a DB
- **date-fns** con locale `es` — formateo de fechas
- **jsPDF + jspdf-autotable** — exportación PDF
- **SheetJS (xlsx)** — exportación Excel
- **React Router v6** — navegación SPA
- **Deploy:** Vercel o Netlify

### Backend (Supabase — sin servidor propio)
- **Supabase Auth** — registro/login email + contraseña, persistencia de sesión
- **PostgreSQL** — base de datos con Row Level Security
- **Supabase Edge Functions** (Deno/TypeScript) — lógica server-side
- **pg_cron** — tareas programadas
- **Realtime** — suscripciones para alertas en tiempo real

### Servicios externos
- **Resend** — envío de emails (tier gratuito: 3000 emails/mes)

---

## 3. Arquitectura

```
┌─────────────────────────────┐
│   Frontend (React/Vite)     │
│   Vercel / Netlify          │
└─────────────┬───────────────┘
              │ Supabase JS SDK (HTTPS)
┌─────────────▼───────────────────────────────┐
│              Supabase                        │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Auth   │  │PostgreSQL│  │  Realtime │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │         Edge Functions (Deno)           │ │
│  │  check-stock · check-expiration         │ │
│  │  send-daily-summary · check-doses       │ │
│  └──────────────────┬──────────────────────┘ │
│                     │                        │
│  ┌──────────────────▼──────────────────────┐ │
│  │         pg_cron (scheduler)             │ │
│  │  00:00 · 07:00 · cada hora             │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────┘
                       │ API HTTP
              ┌────────▼────────┐
              │     Resend      │
              │    (emails)     │
              └─────────────────┘
```

**Flujo principal:** El frontend se comunica directamente con Supabase via SDK. Las Edge Functions acceden a la DB internamente y llaman a Resend para emails. pg_cron dispara las Edge Functions según horario.

---

## 4. Base de Datos

### Tabla: `profiles`
```sql
id                     uuid  PK, FK → auth.users
full_name              text
email                  text
notification_email     text
restock_margin_days    integer  DEFAULT 5
timezone               text  DEFAULT 'America/Argentina/Buenos_Aires'
daily_summary_enabled  boolean  DEFAULT true
created_at             timestamptz  DEFAULT now()
```

### Tabla: `medications`
```sql
id               uuid  PK  DEFAULT gen_random_uuid()
user_id          uuid  FK → profiles
name             text  NOT NULL
description      text
quantity_current numeric
quantity_minimum numeric
quantity_unit    text   -- "pastillas", "ml", "cápsulas"
dose_amount      numeric
dose_frequency   text   -- "diaria", "cada N horas", etc.
dose_times       jsonb  -- ["08:00", "14:00", "20:00"]
expiration_date  date
purchase_date    date
active           boolean  DEFAULT true
created_at       timestamptz  DEFAULT now()
```

### Tabla: `dose_logs`
```sql
id             uuid  PK  DEFAULT gen_random_uuid()
user_id        uuid  FK → profiles
medication_id  uuid  FK → medications
taken_at       timestamptz
scheduled_at   timestamptz
status         text  CHECK IN ('taken', 'skipped', 'missed')
notes          text
created_at     timestamptz  DEFAULT now()
```

### Tabla: `alerts`
```sql
id             uuid  PK  DEFAULT gen_random_uuid()
user_id        uuid  FK → profiles
medication_id  uuid  FK → medications
type           text  CHECK IN ('low_stock', 'expiration', 'dose_reminder', 'restock_date')
message        text
is_read        boolean  DEFAULT false
triggered_at   timestamptz  DEFAULT now()
```

### Soft-delete y cascadas
- `active = false` significa **desactivar** (ocultar de vistas activas, conservar historial). El botón "Desactivar" en `/medicamentos/:id` usa este flag.
- **Eliminar** (hard-delete) solo está disponible para medicamentos sin `dose_logs` asociados. Si existen registros, solo se permite desactivar. FK `dose_logs.medication_id` y `alerts.medication_id` usan `ON DELETE RESTRICT`.

### Row Level Security
Todas las tablas tienen RLS activado. Las políticas permiten acceso solo al `user_id` dueño del registro:
```sql
-- Aplica igual para profiles, medications, dose_logs, alerts
CREATE POLICY "users_own_data" ON medications
  FOR ALL USING (auth.uid() = user_id);
```
> **Nota:** Las Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY` (disponible automáticamente en el runtime de Supabase), lo que bypassa RLS. Esto es intencional y necesario para que los cron jobs puedan insertar alertas y dose_logs para todos los usuarios.

---

## 5. Rutas y Navegación

### Layout
Navbar horizontal fijo con:
- Logo + nombre "MediStock"
- Links: Dashboard · Inventario · Historial · Configuración
- `NotificationBell` con badge de alertas no leídas
- Avatar de usuario con menú logout

### Rutas públicas
| Ruta | Descripción |
|------|-------------|
| `/login` | Formulario de inicio de sesión |
| `/register` | Formulario de registro |
| `/reset-password` | Página de nueva contraseña — destino del link que envía Supabase Auth al email del usuario. Lee el token de la URL y permite cambiar la contraseña. |

### Rutas protegidas (requieren sesión)
| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Resumen + dosis del día |
| `/inventario` | Lista CRUD de medicamentos |
| `/medicamentos/:id` | Detalle + historial + dosis |
| `/historial` | Historial completo de tomas |
| `/notificaciones` | Panel de alertas |
| `/configuracion` | Perfil + preferencias |

---

## 6. Páginas — Detalle Funcional

### `/dashboard`
- **Widgets de resumen:** total medicamentos activos, alertas sin leer, próximas dosis hoy
- **Lista de dosis hoy:** medicamentos con hora programada + botón "Marcar como tomada" (descuenta stock automáticamente)
- **Stock bajo:** tarjetas de medicamentos bajo el mínimo
- **Próximos a vencer:** medicamentos con vencimiento ≤ 30 días

### `/inventario`
- Buscador por nombre
- Filtros: Todos / Activos / Stock bajo / Próximos a vencer
- `MedicationCard` por cada medicamento
- FAB (Floating Action Button) para agregar nuevo medicamento
- Botón exportar PDF (inventario completo) y botón exportar Excel (solo hoja "Inventario", sin historial de tomas)

### `/medicamentos/:id`
- Datos completos del medicamento
- Configuración de horarios de dosis
- Historial de tomas: tabla con fecha, hora programada, hora real, estado
- Botón editar y botón desactivar/eliminar

### `/historial`
- Tabla completa de todos los dose_logs
- Filtros: por medicamento, por rango de fecha, por estado
- Exportación Excel

### `/notificaciones`
- Lista de alertas ordenadas por fecha (más recientes primero)
- Botón "Marcar todas como leídas"
- Marcar individual como leída
- Íconos por tipo: stock bajo, vencimiento, recordatorio, recompra

### `/configuracion`
- Nombre y email del perfil
- Email para notificaciones (puede diferir del email de login)
- Margen de días para alerta de recompra (default: 5)
- Información de cuenta (cambio de contraseña vía Supabase Auth)

---

## 7. Componentes Clave

| Componente | Descripción |
|-----------|-------------|
| `MedicationCard` | Tarjeta con nombre, `StockBadge`, `ExpirationBadge`, `RestockDateChip`, próxima dosis |
| `DoseTracker` | Ítem de dosis diaria con checkbox, hora programada y nombre del medicamento |
| `StockBadge` | Verde (ok) / Amarillo (bajo) / Rojo (crítico = 0) |
| `ExpirationBadge` | Verde (>30d) / Amarillo (≤30d) / Rojo (≤7d) |
| `NotificationBell` | Ícono campana con badge numérico, suscripción Realtime |
| `RestockDateChip` | Chip con fecha calculada de recompra |
| `MedicationForm` | Modal en desktop, drawer en mobile — crear/editar medicamento |
| `AuthGuard` | HOC que redirige a `/login` si no hay sesión |

---

## 8. Lógica de Negocio

### Cálculo de fecha de recompra
```typescript
// utils/restock.ts
export function calcRestockDate(
  stockCurrent: number,
  doseAmount: number,
  doseTimesPerDay: number,
  marginDays: number = 5
): Date | null {
  const dosesPerDay = doseAmount * doseTimesPerDay;
  // Guard: si no hay dosis configuradas, no se puede calcular
  if (!dosesPerDay || dosesPerDay <= 0) return null;
  const daysRemaining = stockCurrent / dosesPerDay;
  const restockDate = addDays(new Date(), daysRemaining - marginDays);
  return restockDate;
}
```
Si retorna `null`, el `RestockDateChip` muestra "Sin dosis configuradas" en lugar de una fecha.

### Marcar dosis como tomada
Implementado como una Supabase RPC (función PostgreSQL) para garantizar atomicidad:
```sql
-- rpc: mark_dose_taken(p_medication_id, p_scheduled_at)
BEGIN
  INSERT INTO dose_logs (user_id, medication_id, taken_at, scheduled_at, status)
  VALUES (auth.uid(), p_medication_id, now(), p_scheduled_at, 'taken');

  UPDATE medications
  SET quantity_current = quantity_current - dose_amount
  WHERE id = p_medication_id AND user_id = auth.uid();

  -- Si stock resultante ≤ mínimo y no existe alerta low_stock no leída, crear alerta
  INSERT INTO alerts (user_id, medication_id, type, message)
  SELECT user_id, id, 'low_stock', 'Stock bajo en ' || name
  FROM medications
  WHERE id = p_medication_id
    AND quantity_current <= quantity_minimum
    AND NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE medication_id = p_medication_id AND type = 'low_stock' AND is_read = false
    );
END;
```
Si cualquier paso falla, toda la transacción se revierte.

### Generación de dosis del día
- Al cargar `/dashboard`, calcular las dosis programadas para hoy basándose en `dose_times` de cada medicamento activo
- Cruzar con `dose_logs` del día para saber cuáles ya fueron tomadas

---

## 9. Edge Functions (Supabase)

### `check-stock` — trigger: medianoche (pg_cron)
- Para cada medicamento activo: si `quantity_current ≤ quantity_minimum` y no existe alerta `low_stock` no leída → crear alerta + enviar email via Resend

### `check-expiration` — trigger: medianoche (pg_cron)
- **UI (ExpirationBadge/dashboard):** muestra alerta visual cuando `expiration_date ≤ hoy + 30 días` — solo color en badge, no genera alert record ni email.
- **Alerta + email:** solo cuando `expiration_date ≤ hoy + 7 días`.
- **Deduplicación:** no crear nueva alerta si ya existe una alerta `expiration` no leída para ese medicamento creada en las últimas 24 horas.
- Email adicional cuando `expiration_date = hoy + 1 día` (urgente).
- Lógica de dedup:
  ```sql
  AND NOT EXISTS (
    SELECT 1 FROM alerts
    WHERE medication_id = m.id
      AND type = 'expiration'
      AND is_read = false
      AND triggered_at > now() - interval '24 hours'
  )
  ```

### `send-daily-summary` — trigger: 7:00 AM UTC (pg_cron)
- El cron dispara a las 7:00 AM UTC. La función filtra usuarios cuyo `profiles.timezone` corresponde a una hora local entre 6:00 AM y 8:00 AM al momento de ejecución (ventana de ±1 hora para cubrir timezones). Default timezone: `America/Argentina/Buenos_Aires` (UTC-3, recibirán el email a las 10:00 AM UTC = 7:00 AM local).
- Para cada usuario elegible: construir lista de dosis del día → enviar email resumen con Resend.
- El usuario puede desactivar el resumen diario desde `/configuracion` (campo `daily_summary_enabled boolean DEFAULT true` en `profiles`).

### `check-doses` — trigger: cada hora (pg_cron)
- Verificar dosis programadas de la última hora sin registro en `dose_logs`.
- Para cada dosis no registrada:
  1. Insertar registro en `dose_logs` con `status: 'missed'` y `scheduled_at` correspondiente.
  2. Crear alerta `dose_reminder` con mensaje "Dosis perdida de {nombre}".
- Esto garantiza que el historial siempre refleja dosis missed y que los filtros de `/historial` funcionan correctamente.

---

## 10. Notificaciones

### Alertas visuales en app (Realtime)
- `NotificationBell` suscribe al canal `alerts` filtrado por `user_id`
- Al recibir un nuevo registro, incrementa el badge
- Panel `/notificaciones` lista y permite marcar como leídas

### Email (Resend)
- Stock bajo → email inmediato al detectar
- Vencimiento 7 días / 1 día → email al detectar
- Resumen diario → 7:00 AM todos los días con la lista de dosis

> **Web Push (fase 2):** Documentado para implementación futura. Requiere VAPID keys y service worker.

---

## 11. Exportación

### PDF (jsPDF + autoTable)
- Inventario completo: nombre, descripción, stock actual, unidad, vencimiento, fecha recompra, estado
- Encabezado con logo textual "MediStock" y fecha de generación
- Disponible en `/inventario`

### Excel (SheetJS)
- Hoja 1 "Inventario": todos los campos de medications activos
- Hoja 2 "Historial de Tomas": dose_logs con medicamento, fechas, estado, notas
- Disponible en `/inventario` (solo inventario) y `/historial` (ambas hojas)

---

## 12. Variables de Entorno

### `client/.env`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Supabase Edge Functions (secrets)
```
RESEND_API_KEY=
SUPABASE_URL=        # auto-disponible en Edge Functions
SUPABASE_SERVICE_ROLE_KEY=  # auto-disponible en Edge Functions
```

---

## 13. Estructura de Carpetas

```
medicine-tracker/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Primitivos: Badge, Button, Card, Modal
│   │   │   ├── MedicationCard.tsx
│   │   │   ├── DoseTracker.tsx
│   │   │   ├── StockBadge.tsx
│   │   │   ├── ExpirationBadge.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── RestockDateChip.tsx
│   │   │   └── MedicationForm.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inventario.tsx
│   │   │   ├── MedicamentoDetalle.tsx
│   │   │   ├── Historial.tsx
│   │   │   ├── Notificaciones.tsx
│   │   │   └── Configuracion.tsx
│   │   ├── hooks/
│   │   │   ├── useMedications.ts
│   │   │   ├── useDoseLogs.ts
│   │   │   ├── useAlerts.ts
│   │   │   └── useProfile.ts
│   │   ├── services/
│   │   │   ├── medications.ts
│   │   │   ├── doseLogs.ts
│   │   │   ├── alerts.ts
│   │   │   └── export.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── utils/
│   │   │   ├── restock.ts
│   │   │   └── dates.ts
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   └── types/
│   │       └── index.ts
│   └── public/
├── supabase/
│   ├── functions/
│   │   ├── check-stock/
│   │   ├── check-expiration/
│   │   ├── send-daily-summary/
│   │   └── check-doses/
│   └── migrations/
│       └── 001_initial_schema.sql
└── docs/
    └── superpowers/
        └── specs/
```

---

## 14. Criterios de Éxito

- [ ] Usuario puede registrarse, iniciar sesión y ver solo sus datos
- [ ] CRUD completo de medicamentos funcional
- [ ] Dashboard muestra dosis del día y permite marcarlas como tomadas (descuenta stock)
- [ ] Alertas de stock bajo y vencimiento se crean automáticamente
- [ ] Emails enviados por Resend en los eventos configurados
- [ ] Fecha de recompra calculada y visible en cada tarjeta
- [ ] Exportación PDF y Excel funcionando
- [ ] Diseño responsive en mobile y desktop
- [ ] RLS activo — un usuario no puede ver datos de otro
