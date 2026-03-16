-- supabase/migrations/002_pg_cron.sql
-- Configura los cron jobs para invocar las Edge Functions via pg_net.
-- Reemplazar <PROJECT_REF> con el ref de tu proyecto Supabase (ej: rciwjlumhcspitcribsr).
-- El SERVICE_ROLE_KEY está disponible en Supabase Dashboard → Settings → API.
-- IMPORTANTE: ejecutar DESPUÉS de desplegar las Edge Functions (Tasks 26-29).

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
