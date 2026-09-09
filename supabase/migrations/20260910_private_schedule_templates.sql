-- =============================================================================
-- STRIKING CAMP — MIGRATION : 20260910_private_schedule_templates.sql
-- Description : Intégration des cours privés dans recurring_schedule_templates
--               comme source de vérité unique et dynamique.
-- =============================================================================

BEGIN;

-- 1. Peuplement initial (Seed) idempotent des 36 créneaux privés dans recurring_schedule_templates
INSERT INTO public.recurring_schedule_templates (
  day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active
)
SELECT 
  d.day_num,
  t.t_start,
  (t.t_start + INTERVAL '50 minutes')::TIME,
  'private'::public.session_type,
  'Cours Privé',
  'Individuel (50 min)',
  1,
  TRUE
FROM generate_series(0, 5) AS d(day_num)
CROSS JOIN (
  VALUES 
    (TIME '08:00:00'),
    (TIME '09:00:00'),
    (TIME '10:00:00'),
    (TIME '14:00:00'),
    (TIME '15:00:00'),
    (TIME '16:00:00')
) AS t(t_start)
ON CONFLICT (day_of_week, start_time, type, discipline)
DO UPDATE SET
  end_time = EXCLUDED.end_time,
  level = EXCLUDED.level,
  max_capacity = 1,
  is_active = TRUE,
  updated_at = NOW();

-- 2. Refonte dynamique de generate_recurring_schedule() pour lire TOUS les templates
CREATE OR REPLACE FUNCTION public.generate_recurring_schedule(
  p_start_date DATE DEFAULT (DATE_TRUNC('week', CURRENT_DATE)::DATE),
  p_weeks_count INT DEFAULT 13
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inserted_group INT := 0;
  v_inserted_priv INT := 0;
BEGIN
  IF p_weeks_count < 1 OR p_weeks_count > 13 THEN
    RAISE EXCEPTION 'p_weeks_count doit être compris entre 1 et 13';
  END IF;

  IF EXTRACT(ISODOW FROM p_start_date)::INT <> 1 THEN
    RAISE EXCEPTION 'p_start_date doit être un lundi (date reçue: %)', p_start_date;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- A. GÉNÉRATION DES CRÉNEAUX DE GROUPE DYNAMIQUES (SMALL GROUP + COLLECTIFS)
  -- ─────────────────────────────────────────────────────────────────────────
  WITH active_group_templates AS (
    SELECT 
      t.id AS template_id,
      t.discipline,
      t.type,
      t.level,
      t.day_of_week AS d_off,
      t.start_time AS t_start,
      t.end_time AS t_end,
      t.max_capacity
    FROM public.recurring_schedule_templates t
    WHERE t.is_active = TRUE
      AND t.type IN ('small_group', 'collective')
  ),
  instantiated_group AS (
    SELECT 
      tmpl.template_id,
      tmpl.discipline,
      tmpl.type,
      tmpl.level,
      (((p_start_date + (w.week_num * 7 + tmpl.d_off))::DATE + tmpl.t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS starts_at,
      (((p_start_date + (w.week_num * 7 + tmpl.d_off))::DATE + tmpl.t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS ends_at,
      tmpl.max_capacity
    FROM generate_series(0, p_weeks_count - 1) AS w(week_num)
    CROSS JOIN active_group_templates tmpl
  ),
  ins_group AS (
    INSERT INTO public.class_sessions (
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, is_active
    )
    SELECT 
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM instantiated_group
    ON CONFLICT (type, discipline, starts_at) WHERE type IN ('small_group', 'collective')
    DO UPDATE SET
      template_id = EXCLUDED.template_id,
      level = EXCLUDED.level,
      ends_at = EXCLUDED.ends_at,
      max_capacity = EXCLUDED.max_capacity,
      is_active = TRUE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_group FROM ins_group;

  -- ─────────────────────────────────────────────────────────────────────────
  -- B. GÉNÉRATION DES COURS PRIVÉS DYNAMIQUES (DEPUIS LES TEMPLATES ACTIFS)
  -- ─────────────────────────────────────────────────────────────────────────
  WITH active_priv_templates AS (
    SELECT 
      t.id AS template_id,
      t.discipline,
      t.type,
      t.level,
      t.day_of_week AS d_off,
      t.start_time AS t_start,
      t.end_time AS t_end,
      t.max_capacity
    FROM public.recurring_schedule_templates t
    WHERE t.is_active = TRUE
      AND t.type = 'private'
  ),
  instantiated_priv AS (
    SELECT 
      tmpl.template_id,
      tmpl.discipline,
      tmpl.type,
      tmpl.level,
      (((p_start_date + (w.week_num * 7 + tmpl.d_off))::DATE + tmpl.t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS starts_at,
      (((p_start_date + (w.week_num * 7 + tmpl.d_off))::DATE + tmpl.t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS ends_at,
      1 AS max_capacity
    FROM generate_series(0, p_weeks_count - 1) AS w(week_num)
    CROSS JOIN active_priv_templates tmpl
  ),
  ins_priv AS (
    INSERT INTO public.class_sessions (
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, is_active
    )
    SELECT 
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM instantiated_priv
    ON CONFLICT (starts_at) WHERE type = 'private'
    DO UPDATE SET
      template_id = EXCLUDED.template_id,
      discipline = EXCLUDED.discipline,
      level = EXCLUDED.level,
      ends_at = EXCLUDED.ends_at,
      max_capacity = 1,
      is_active = TRUE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_priv FROM ins_priv;

  RETURN jsonb_build_object(
    'success', TRUE,
    'weeks_requested', p_weeks_count,
    'start_date', p_start_date,
    'end_date', p_start_date + (p_weeks_count * 7) - 1,
    'dynamic_group_sessions_processed', v_inserted_group,
    'dynamic_private_sessions_processed', v_inserted_priv,
    'total_processed', v_inserted_group + v_inserted_priv
  );
END;
$$;

-- 3. Permissions et rechargement schéma
REVOKE ALL ON FUNCTION public.generate_recurring_schedule(DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_recurring_schedule(DATE, INT) TO service_role, postgres;

-- 4. Instanciation immédiate pour synchroniser les templates récurrents
SELECT public.generate_recurring_schedule((DATE_TRUNC('week', CURRENT_DATE)::DATE), 13);

NOTIFY pgrst, 'reload schema';

COMMIT;
