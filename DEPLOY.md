# MediStock — Guía de Despliegue

## Requisitos previos
- Proyecto Supabase creado (free tier es suficiente)
- Node.js 18+ instalado
- Supabase CLI instalado (`npm install -g supabase`)
- Cuenta en Resend (para emails)
- Cuenta en Vercel (para hosting del frontend)

---

## 1. Configurar Supabase

### 1.1 Crear proyecto
1. Ir a https://supabase.com/dashboard → New Project
2. Nombre: `medistock`, región: South America (São Paulo)
3. Esperar provisioning (~2 minutos)
4. Ir a **Settings → API** y copiar:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` → para los cron jobs

### 1.2 Aplicar migración inicial
En **Dashboard → SQL Editor**, ejecutar el contenido de:
```
supabase/migrations/001_initial_schema.sql
```

### 1.3 Habilitar extensiones
En **Dashboard → Database → Extensions**, habilitar:
- `pg_cron`
- `pg_net`

---

## 2. Configurar variables de entorno del cliente

Crear `client/.env.local` (no subir a git):
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## 3. Desplegar Edge Functions

```bash
# Vincular proyecto local (una vez)
supabase link --project-ref <PROJECT_REF>

# Desplegar las 4 funciones
supabase functions deploy check-stock --no-verify-jwt
supabase functions deploy check-expiration --no-verify-jwt
supabase functions deploy send-daily-summary --no-verify-jwt
supabase functions deploy check-doses --no-verify-jwt

# Configurar el secret de Resend
supabase secrets set RESEND_API_KEY=<tu_api_key_de_resend>
```

### Verificar despliegue
```bash
supabase functions invoke check-stock
# Esperado: {"ok":true,"processed":0}
```

---

## 4. Configurar pg_cron

Editar `supabase/migrations/002_pg_cron.sql` reemplazando:
- `<PROJECT_REF>` con tu project ref (ej: `rciwjlumhcspitcribsr`)
- `<SERVICE_ROLE_KEY>` con tu service role key

Ejecutar el SQL en **Dashboard → SQL Editor**.

---

## 5. Build y deploy del frontend

```bash
cd client
npm install
npm run build
```

### Desplegar en Vercel
```bash
# Con Vercel CLI:
vercel --prod

# O configurar en vercel.com:
#   Root Directory: client
#   Build Command: npm run build
#   Output Directory: dist
#   Environment Variables:
#     VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
#     VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## 6. Verificación final

```bash
cd client
npm run test -- run
```

Todos los tests deben pasar.

---

## Referencia rápida

| Recurso              | Descripción                                    |
|---------------------|------------------------------------------------|
| `client/`           | Frontend React/Vite                            |
| `supabase/migrations/001_initial_schema.sql` | Schema completo con RLS, RPC e índices |
| `supabase/migrations/002_pg_cron.sql` | Cron jobs para Edge Functions         |
| `supabase/functions/check-stock/`     | Alerta de stock bajo (diario)         |
| `supabase/functions/check-expiration/`| Alerta de vencimiento (diario)        |
| `supabase/functions/send-daily-summary/` | Resumen diario por email           |
| `supabase/functions/check-doses/`    | Registra dosis perdidas (cada hora)   |
