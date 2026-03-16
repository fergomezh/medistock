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
