-- =============================================================================
-- Migration : 20260924_remove_collective_courses_system.sql
-- Description : Suppression complète du format "Cours Collectifs" (collective)
--               Striking Camp ne gère plus que deux types : Small Group & Cours Privés.
-- =============================================================================

BEGIN;

-- 1. Nettoyage des templates récurrents de type collectif
DELETE FROM public.recurring_schedule_templates
WHERE type = 'collective';

-- 2. Nettoyage des futures séances collectives sans aucune réservation (membres ou essais)
DELETE FROM public.class_sessions cs
WHERE cs.type = 'collective'
  AND cs.starts_at >= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.class_session_id = cs.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.trial_bookings tb WHERE tb.class_session_id = cs.id
  );

-- 3. Désactivation stricte des plans collectifs historiques pour préserver les clés étrangères
UPDATE public.plans
SET is_active = FALSE,
    updated_at = NOW()
WHERE type = 'collective';

-- 4. Désactivation du service_key 'collective' dans service_settings
UPDATE public.service_settings
SET is_active = FALSE,
    updated_at = NOW()
WHERE service_key = 'collective';

-- 5. Refonte de generate_recurring_schedule() : Ne génère que Small Group & Cours Privés
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
  -- A. GÉNÉRATION DES CRÉNEAUX SMALL GROUP DYNAMIQUES
  -- ─────────────────────────────────────────────────────────────────────────
  WITH active_sg_templates AS (
    SELECT 
      t.id AS template_id,
      t.discipline,
      t.type,
      t.level,
      t.day_of_week AS d_off,
      t.start_time AS t_start,
      t.end_time AS t_end,
      COALESCE(t.max_capacity, 12) AS max_capacity
    FROM public.recurring_schedule_templates t
    WHERE t.is_active = TRUE
      AND t.type = 'small_group'
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
    CROSS JOIN active_sg_templates tmpl
  ),
  ins_group AS (
    INSERT INTO public.class_sessions (
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, is_active
    )
    SELECT 
      template_id, discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM instantiated_group
    ON CONFLICT (type, discipline, starts_at) WHERE type = 'small_group'
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
  -- B. GÉNÉRATION DES COURS PRIVÉS DYNAMIQUES
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
      COALESCE(t.max_capacity, 1) AS max_capacity
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
      tmpl.max_capacity
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
      max_capacity = EXCLUDED.max_capacity,
      is_active = TRUE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_priv FROM ins_priv;

  RETURN jsonb_build_object(
    'success', TRUE,
    'start_date', p_start_date,
    'weeks_generated', p_weeks_count,
    'small_group_processed', v_inserted_group,
    'private_processed', v_inserted_priv,
    'generated_at', NOW()
  );
END;
$$;

-- 6. Refonte de maintain_schedule_horizon() : Horizon Small Group + Privé uniquement
CREATE OR REPLACE FUNCTION public.maintain_schedule_horizon(
  p_target_weeks_ahead INT DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_end_date DATE;
  v_reference_latest DATE;
  v_private_latest DATE;
  v_sg_latest DATE;
  v_next_monday DATE;
  v_missing_weeks INT := 0;
  v_remaining_weeks INT;
  v_chunk_weeks INT;
  v_chunk_monday DATE;
  v_batches_count INT := 0;
  v_last_gen_result JSONB;
BEGIN
  IF p_target_weeks_ahead < 1 THEN
    RAISE EXCEPTION 'p_target_weeks_ahead doit être supérieur ou égal à 1';
  END IF;

  v_target_end_date := (CURRENT_DATE + (p_target_weeks_ahead * 7))::DATE;

  SELECT MAX(starts_at)::DATE
  INTO v_private_latest
  FROM public.class_sessions
  WHERE type = 'private'
    AND is_active = TRUE;

  SELECT MAX(starts_at)::DATE
  INTO v_sg_latest
  FROM public.class_sessions
  WHERE type = 'small_group'
    AND is_active = TRUE;

  SELECT MIN(x.latest_date)
  INTO v_reference_latest
  FROM (
    SELECT v_private_latest AS latest_date
    UNION ALL
    SELECT v_sg_latest
  ) x
  WHERE x.latest_date IS NOT NULL;

  IF v_reference_latest IS NULL THEN
    v_next_monday :=
      (
        CURRENT_DATE
        - (EXTRACT(ISODOW FROM CURRENT_DATE)::INT - 1)
      )::DATE;
    v_missing_weeks := p_target_weeks_ahead;
  ELSIF v_reference_latest < v_target_end_date THEN
    v_next_monday :=
      (
        v_reference_latest
        - (EXTRACT(ISODOW FROM v_reference_latest)::INT - 1)
        + 7
      )::DATE;
    v_missing_weeks :=
      CEIL(
        (v_target_end_date - v_next_monday + 1)::NUMERIC / 7.0
      )::INT;
  ELSE
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'UP_TO_DATE',
      'latest_private_date', v_private_latest,
      'latest_small_group_date', v_sg_latest,
      'target_horizon_date', v_target_end_date,
      'missing_weeks_generated', 0,
      'message', 'Le planning couvre déjà l''horizon cible.'
    );
  END IF;

  v_remaining_weeks := v_missing_weeks;
  v_chunk_monday := v_next_monday;

  WHILE v_remaining_weeks > 0 LOOP
    v_chunk_weeks := LEAST(v_remaining_weeks, 13);

    v_last_gen_result := public.generate_recurring_schedule(v_chunk_monday, v_chunk_weeks);

    v_batches_count := v_batches_count + 1;
    v_remaining_weeks := v_remaining_weeks - v_chunk_weeks;
    v_chunk_monday := (v_chunk_monday + (v_chunk_weeks * 7))::DATE;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'HORIZON_MAINTAINED',
    'batches_executed', v_batches_count,
    'missing_weeks_generated', v_missing_weeks,
    'target_horizon_date', v_target_end_date,
    'last_batch_result', v_last_gen_result,
    'maintained_at', NOW()
  );
END;
$$;

COMMIT;
