-- =============================================================================
-- STRIKING CAMP — PHASE 1 : PLANNING OFFICIEL (QUALITÉ PRODUCTION STRICTE)
-- FICHIER : 20260830_phase1_official_schedule.sql
-- =============================================================================
-- SPÉCIFICATIONS STRICTES :
--   1. ZÉRO suppression dans public.bookings et ZÉRO suppression de séance réservée.
--   2. Désactivation préalable des séances existantes du trimestre pour archiver les
--      anciennes séances hors grille sans perdre leur historique/réservations.
--   3. Réactivation automatique (is_active = TRUE) et mise en conformité de 100% des
--      créneaux officiels via ON CONFLICT DO UPDATE.
--   4. Index uniques partiels anti-doublons.
--   5. Génération matricielle ensembliste (generate_series + VALUES + ON CONFLICT).
--   6. maintain_schedule_horizon() par sous-lots séquentiels de 13 semaines max.
--   7. Contrôle qualité matriciel strict :
--      - 468 créneaux privés actifs
--      - 299 séances Small Group actives
--      - 39 séances collectives actives
--      - 806 séances actives au total sur le trimestre
--      - Rollback automatique si le moindre créneau est manquant ou non conforme.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. PERMISSIONS D'ACCÈS SUR CLASS_SESSIONS
-- =============================================================================
GRANT SELECT ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO service_role;

-- =============================================================================
-- 2. PROTECTION PHYSIQUE CONTRE LES DOUBLONS (INDEX UNIQUES PARTIELS)
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_sessions_private_slot
  ON public.class_sessions (starts_at)
  WHERE type = 'private';

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_sessions_group_slot
  ON public.class_sessions (type, discipline, starts_at)
  WHERE type IN ('small_group', 'collective');

-- =============================================================================
-- 3. GÉNÉRATEUR DU PLANNING HEBDOMADAIRE (MATRICIEL ENSEMBLISTE & IDEMPOTENT)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_recurring_schedule(
  p_start_date DATE DEFAULT DATE '2026-08-31',
  p_weeks_count INT DEFAULT 13
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inserted_sg INT := 0;
  v_inserted_col INT := 0;
  v_inserted_priv INT := 0;
BEGIN
  IF p_weeks_count < 1 OR p_weeks_count > 13 THEN
    RAISE EXCEPTION 'p_weeks_count doit être compris entre 1 et 13';
  END IF;

  IF EXTRACT(ISODOW FROM p_start_date)::INT <> 1 THEN
    RAISE EXCEPTION 'p_start_date doit être un lundi (date reçue: %)', p_start_date;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- A. GÉNÉRATION DES SMALL GROUP (23 créneaux × N semaines = 299 sur 13 sem.)
  -- ─────────────────────────────────────────────────────────────────────────
  WITH official_sg AS (
    SELECT 
      s.discipline,
      'small_group'::public.session_type AS type,
      s.level,
      (((p_start_date + (w.week_num * 7 + s.d_off))::DATE + s.t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS starts_at,
      (((p_start_date + (w.week_num * 7 + s.d_off))::DATE + s.t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS ends_at,
      20 AS max_capacity
    FROM generate_series(0, p_weeks_count - 1) AS w(week_num)
    CROSS JOIN (
      VALUES
        -- Lundi (d_off = 0)
        (0, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Fondamentaux'),
        (0, TIME '11:00:00', TIME '11:50:00', 'Boxing', 'Fondamentaux'),
        (0, TIME '12:15:00', TIME '13:05:00', 'Boxing Shred', 'Performance'),
        -- Mardi (d_off = 1)
        (1, TIME '11:00:00', TIME '11:50:00', 'Boxing Shred', 'Cardio'),
        (1, TIME '12:15:00', TIME '13:05:00', 'Boxing Bag', 'Cardio'),
        (1, TIME '17:00:00', TIME '17:50:00', 'Lady Striking', 'Cours féminin'),
        (1, TIME '18:00:00', TIME '18:50:00', 'Kick Boxing', 'Fondamentaux'),
        -- Mercredi (d_off = 2)
        (2, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Performance'),
        (2, TIME '11:00:00', TIME '11:50:00', 'Kick Boxing', 'Fondamentaux'),
        (2, TIME '12:15:00', TIME '13:05:00', 'Boxing Shred', 'Performance'),
        (2, TIME '17:30:00', TIME '18:20:00', 'Striking', 'Performance'),
        (2, TIME '19:30:00', TIME '20:20:00', 'Boxe Thaï', 'Fondamentaux'),
        (2, TIME '20:30:00', TIME '21:20:00', 'Kick Boxing', 'Performance'),
        -- Jeudi (d_off = 3)
        (3, TIME '11:00:00', TIME '11:50:00', 'Boxing Shred', 'Performance'),
        (3, TIME '12:15:00', TIME '13:05:00', 'Striking', 'Performance'),
        (3, TIME '17:30:00', TIME '18:20:00', 'Lady Striking', 'Cours féminin'),
        (3, TIME '19:30:00', TIME '20:20:00', 'Kick Boxing', 'Fondamentaux'),
        (3, TIME '20:30:00', TIME '21:20:00', 'Boxe Thaï', 'Élite'),
        -- Vendredi (d_off = 4)
        (4, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Fondamentaux'),
        (4, TIME '17:00:00', TIME '17:50:00', 'Boxe Thaï', 'Fondamentaux'),
        (4, TIME '19:30:00', TIME '20:20:00', 'Striking', 'Performance'),
        -- Samedi (d_off = 5)
        (5, TIME '11:00:00', TIME '11:50:00', 'Kick Boxing', 'Élite'),
        (5, TIME '12:00:00', TIME '12:50:00', 'Lady Striking', 'Élite')
    ) AS s(d_off, t_start, t_end, discipline, level)
  ),
  ins_sg AS (
    INSERT INTO public.class_sessions (discipline, type, level, starts_at, ends_at, max_capacity, is_active)
    SELECT discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM official_sg
    ON CONFLICT (type, discipline, starts_at) WHERE type IN ('small_group', 'collective')
    DO UPDATE SET
      level = EXCLUDED.level,
      ends_at = EXCLUDED.ends_at,
      max_capacity = EXCLUDED.max_capacity,
      is_active = TRUE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_sg FROM ins_sg;

  -- ─────────────────────────────────────────────────────────────────────────
  -- B. GÉNÉRATION DES COLLECTIFS (3 créneaux × N semaines = 39 sur 13 sem.)
  -- ─────────────────────────────────────────────────────────────────────────
  WITH official_col AS (
    SELECT 
      s.discipline,
      'collective'::public.session_type AS type,
      s.level,
      (((p_start_date + (w.week_num * 7 + s.d_off))::DATE + s.t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS starts_at,
      (((p_start_date + (w.week_num * 7 + s.d_off))::DATE + s.t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS ends_at,
      35 AS max_capacity
    FROM generate_series(0, p_weeks_count - 1) AS w(week_num)
    CROSS JOIN (
      VALUES
        (1, TIME '18:00:00', TIME '19:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)'),
        (4, TIME '18:00:00', TIME '19:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)'),
        (5, TIME '10:00:00', TIME '11:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)')
    ) AS s(d_off, t_start, t_end, discipline, level)
  ),
  ins_col AS (
    INSERT INTO public.class_sessions (discipline, type, level, starts_at, ends_at, max_capacity, is_active)
    SELECT discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM official_col
    ON CONFLICT (type, discipline, starts_at) WHERE type IN ('small_group', 'collective')
    DO UPDATE SET
      level = EXCLUDED.level,
      ends_at = EXCLUDED.ends_at,
      max_capacity = EXCLUDED.max_capacity,
      is_active = TRUE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_col FROM ins_col;

  -- ─────────────────────────────────────────────────────────────────────────
  -- C. GÉNÉRATION DES COURS PRIVÉS (36 créneaux × N semaines = 468 sur 13 sem.)
  -- ─────────────────────────────────────────────────────────────────────────
  WITH official_priv AS (
    SELECT 
      'Cours Privé'::TEXT AS discipline,
      'private'::public.session_type AS type,
      'Individuel'::TEXT AS level,
      (((p_start_date + (w.week_num * 7 + d.d_off))::DATE + t.t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS starts_at,
      (((p_start_date + (w.week_num * 7 + d.d_off))::DATE + t.t_start + INTERVAL '50 minutes')::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS ends_at,
      1 AS max_capacity
    FROM generate_series(0, p_weeks_count - 1) AS w(week_num)
    CROSS JOIN generate_series(0, 5) AS d(d_off)
    CROSS JOIN (
      VALUES 
        (TIME '08:00:00'), (TIME '09:00:00'), (TIME '10:00:00'),
        (TIME '14:00:00'), (TIME '15:00:00'), (TIME '16:00:00')
    ) AS t(t_start)
  ),
  ins_priv AS (
    INSERT INTO public.class_sessions (discipline, type, level, starts_at, ends_at, max_capacity, is_active)
    SELECT discipline, type, level, starts_at, ends_at, max_capacity, TRUE
    FROM official_priv
    ON CONFLICT (starts_at) WHERE type = 'private'
    DO UPDATE SET
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
    'small_group_processed', v_inserted_sg,
    'collective_processed', v_inserted_col,
    'private_processed', v_inserted_priv,
    'total_processed', v_inserted_sg + v_inserted_col + v_inserted_priv
  );
END;
$$;

-- =============================================================================
-- 4. FONCTION DE MAINTENANCE SUR HORIZON GLISSANT (SOUS-LOTS DE MAX 13 SEMAINES)
-- =============================================================================
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
  v_collective_latest DATE;
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

  SELECT MAX(starts_at)::DATE INTO v_private_latest FROM public.class_sessions WHERE type = 'private' AND is_active = TRUE;
  SELECT MAX(starts_at)::DATE INTO v_sg_latest FROM public.class_sessions WHERE type = 'small_group' AND is_active = TRUE;
  SELECT MAX(starts_at)::DATE INTO v_collective_latest FROM public.class_sessions WHERE type = 'collective' AND is_active = TRUE;

  SELECT MIN(x.latest_date) INTO v_reference_latest
  FROM (
    SELECT v_private_latest AS latest_date
    UNION ALL SELECT v_sg_latest
    UNION ALL SELECT v_collective_latest
  ) x WHERE x.latest_date IS NOT NULL;

  IF v_reference_latest IS NULL THEN
    v_next_monday := (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::INT - 1))::DATE;
    v_missing_weeks := p_target_weeks_ahead;
  ELSIF v_reference_latest < v_target_end_date THEN
    v_next_monday := (v_reference_latest - (EXTRACT(ISODOW FROM v_reference_latest)::INT - 1) + 7)::DATE;
    v_missing_weeks := CEIL((v_target_end_date - v_next_monday + 1)::NUMERIC / 7.0)::INT;
  ELSE
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'UP_TO_DATE',
      'latest_private_date', v_private_latest,
      'latest_small_group_date', v_sg_latest,
      'latest_collective_date', v_collective_latest,
      'target_horizon_date', v_target_end_date,
      'missing_weeks_generated', 0,
      'message', 'Le planning couvre déjà l''horizon cible.'
    );
  END IF;

  -- Découpage sécurisé par sous-lots de maximum 13 semaines
  IF v_missing_weeks > 0 THEN
    v_remaining_weeks := v_missing_weeks;
    v_chunk_monday := v_next_monday;

    WHILE v_remaining_weeks > 0 LOOP
      v_chunk_weeks := LEAST(v_remaining_weeks, 13);
      v_last_gen_result := public.generate_recurring_schedule(v_chunk_monday, v_chunk_weeks);
      
      v_batches_count := v_batches_count + 1;
      v_remaining_weeks := v_remaining_weeks - v_chunk_weeks;
      v_chunk_monday := (v_chunk_monday + (v_chunk_weeks * 7))::DATE;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'EXTENDED',
    'previous_reference_date', v_reference_latest,
    'generated_from_monday', v_next_monday,
    'missing_weeks_generated', v_missing_weeks,
    'batches_executed', v_batches_count,
    'last_batch_details', v_last_gen_result
  );
END;
$$;

-- =============================================================================
-- 5. SÉCURISATION DES FONCTIONS (ACCÈS SERVICE_ROLE STRICT)
-- =============================================================================
REVOKE ALL ON FUNCTION public.generate_recurring_schedule(DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maintain_schedule_horizon(INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_recurring_schedule(DATE, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.maintain_schedule_horizon(INT) TO service_role;

-- =============================================================================
-- 6. TÂCHE CRON OPTIONNELLE (SI PG_CRON EST DÉJÀ ACTIVÉ DANS SUPABASE)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'strikingcamp-maintain-schedule';
      PERFORM cron.schedule(
        'strikingcamp-maintain-schedule',
        '0 3 * * 0',
        'SELECT public.maintain_schedule_horizon(12);'
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron détecté mais non accessible en écriture : %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron non installé : le planning est maintenu via la route API de relais.';
  END IF;
END;
$$;

-- =============================================================================
-- 7. DÉSACTIVATION PRÉALABLE DES SÉANCES DU TRIMESTRE (PRÉSERVATION HISTORIQUE)
-- =============================================================================
-- Passe is_active = FALSE sur la période. Le générateur réactivera (is_active = TRUE)
-- uniquement et strictement les 806 créneaux officiels de la grille.
UPDATE public.class_sessions
SET is_active = FALSE
WHERE starts_at >= TIMESTAMPTZ '2026-08-31 00:00:00+02'
  AND starts_at <= TIMESTAMPTZ '2026-11-29 23:59:59+01';

-- =============================================================================
-- 8. GÉNÉRATION INITIALE OFFICIELLE (13 SEMAINES : 31/08/2026 -> 29/11/2026)
-- =============================================================================
SELECT public.generate_recurring_schedule(DATE '2026-08-31', 13);

-- =============================================================================
-- 9. CONTRÔLE MATRICIEL STRICT SUR TOUS LES CRITÈRES QUALITÉ DU PLANNING
-- (ROLLBACK IMMÉDIAT EN CAS D''INCOHÉRENCE QUALITÉ OU DE CRÉNEAU MANQUANT)
-- =============================================================================
DO $$
DECLARE
  v_valid_priv_count INT;
  v_valid_sg_count INT;
  v_valid_col_count INT;
  v_total_active_count INT;
BEGIN
  -- A. VÉRIFICATION DES 468 COURS PRIVÉS OFFICIELS ACTIFS
  SELECT COUNT(DISTINCT cs.id) INTO v_valid_priv_count
  FROM (
    SELECT (((DATE '2026-08-31' + (w * 7 + d))::DATE + t)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS expected_starts_at
    FROM generate_series(0, 12) AS w
    CROSS JOIN generate_series(0, 5) AS d
    CROSS JOIN (VALUES (TIME '08:00:00'), (TIME '09:00:00'), (TIME '10:00:00'), (TIME '14:00:00'), (TIME '15:00:00'), (TIME '16:00:00')) AS times(t)
  ) m
  JOIN public.class_sessions cs
    ON cs.type = 'private'
   AND cs.starts_at = m.expected_starts_at
   AND cs.ends_at = m.expected_starts_at + INTERVAL '50 minutes'
   AND cs.max_capacity = 1
   AND cs.is_active = TRUE;

  IF v_valid_priv_count <> 468 THEN
    RAISE EXCEPTION 'ÉCHEC QUALITÉ : % créneaux privés officiels valides (attendu strictement: 468)', v_valid_priv_count;
  END IF;

  -- B. VÉRIFICATION DES 299 SMALL GROUP OFFICIELS ACTIFS
  SELECT COUNT(DISTINCT cs.id) INTO v_valid_sg_count
  FROM (
    SELECT 
      (((DATE '2026-08-31' + (w * 7 + d_off))::DATE + t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS exp_start,
      (((DATE '2026-08-31' + (w * 7 + d_off))::DATE + t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS exp_end,
      disc,
      lvl
    FROM generate_series(0, 12) AS w
    CROSS JOIN (
      VALUES
        -- Lundi (d_off = 0)
        (0, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Fondamentaux'),
        (0, TIME '11:00:00', TIME '11:50:00', 'Boxing', 'Fondamentaux'),
        (0, TIME '12:15:00', TIME '13:05:00', 'Boxing Shred', 'Performance'),
        -- Mardi (d_off = 1)
        (1, TIME '11:00:00', TIME '11:50:00', 'Boxing Shred', 'Cardio'),
        (1, TIME '12:15:00', TIME '13:05:00', 'Boxing Bag', 'Cardio'),
        (1, TIME '17:00:00', TIME '17:50:00', 'Lady Striking', 'Cours féminin'),
        (1, TIME '18:00:00', TIME '18:50:00', 'Kick Boxing', 'Fondamentaux'),
        -- Mercredi (d_off = 2)
        (2, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Performance'),
        (2, TIME '11:00:00', TIME '11:50:00', 'Kick Boxing', 'Fondamentaux'),
        (2, TIME '12:15:00', TIME '13:05:00', 'Boxing Shred', 'Performance'),
        (2, TIME '17:30:00', TIME '18:20:00', 'Striking', 'Performance'),
        (2, TIME '19:30:00', TIME '20:20:00', 'Boxe Thaï', 'Fondamentaux'),
        (2, TIME '20:30:00', TIME '21:20:00', 'Kick Boxing', 'Performance'),
        -- Jeudi (d_off = 3)
        (3, TIME '11:00:00', TIME '11:50:00', 'Boxing Shred', 'Performance'),
        (3, TIME '12:15:00', TIME '13:05:00', 'Striking', 'Performance'),
        (3, TIME '17:30:00', TIME '18:20:00', 'Lady Striking', 'Cours féminin'),
        (3, TIME '19:30:00', TIME '20:20:00', 'Kick Boxing', 'Fondamentaux'),
        (3, TIME '20:30:00', TIME '21:20:00', 'Boxe Thaï', 'Élite'),
        -- Vendredi (d_off = 4)
        (4, TIME '07:00:00', TIME '07:50:00', 'Boxing Bag', 'Fondamentaux'),
        (4, TIME '17:00:00', TIME '17:50:00', 'Boxe Thaï', 'Fondamentaux'),
        (4, TIME '19:30:00', TIME '20:20:00', 'Striking', 'Performance'),
        -- Samedi (d_off = 5)
        (5, TIME '11:00:00', TIME '11:50:00', 'Kick Boxing', 'Élite'),
        (5, TIME '12:00:00', TIME '12:50:00', 'Lady Striking', 'Élite')
    ) AS s(d_off, t_start, t_end, disc, lvl)
  ) m
  JOIN public.class_sessions cs
    ON cs.type = 'small_group'
   AND cs.discipline = m.disc
   AND cs.level = m.lvl
   AND cs.starts_at = m.exp_start
   AND cs.ends_at = m.exp_end
   AND cs.max_capacity = 20
   AND cs.is_active = TRUE;

  IF v_valid_sg_count <> 299 THEN
    RAISE EXCEPTION 'ÉCHEC QUALITÉ : % séances Small Group valides (attendu strictement: 299)', v_valid_sg_count;
  END IF;

  -- C. VÉRIFICATION DES 39 COLLECTIFS OFFICIELS ACTIFS
  SELECT COUNT(DISTINCT cs.id) INTO v_valid_col_count
  FROM (
    SELECT 
      (((DATE '2026-08-31' + (w * 7 + d_off))::DATE + t_start)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS exp_start,
      (((DATE '2026-08-31' + (w * 7 + d_off))::DATE + t_end)::TIMESTAMP AT TIME ZONE 'Europe/Paris') AS exp_end,
      disc,
      lvl
    FROM generate_series(0, 12) AS w
    CROSS JOIN (
      VALUES
        (1, TIME '18:00:00', TIME '19:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)'),
        (4, TIME '18:00:00', TIME '19:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)'),
        (5, TIME '10:00:00', TIME '11:00:00', 'Kick Boxing', 'Tous niveaux (Accès libre)')
    ) AS c(d_off, t_start, t_end, disc, lvl)
  ) m
  JOIN public.class_sessions cs
    ON cs.type = 'collective'
   AND cs.discipline = m.disc
   AND cs.level = m.lvl
   AND cs.starts_at = m.exp_start
   AND cs.ends_at = m.exp_end
   AND cs.max_capacity = 35
   AND cs.is_active = TRUE;

  IF v_valid_col_count <> 39 THEN
    RAISE EXCEPTION 'ÉCHEC QUALITÉ : % séances collectives valides (attendu strictement: 39)', v_valid_col_count;
  END IF;

  -- D. VÉRIFICATION DU NOMBRE TOTAL STRICT DE SÉANCES ACTIVES (ZÉRO SÉANCE PARASITE)
  SELECT COUNT(*) INTO v_total_active_count
  FROM public.class_sessions
  WHERE is_active = TRUE
    AND starts_at >= TIMESTAMPTZ '2026-08-31 00:00:00+02'
    AND starts_at <= TIMESTAMPTZ '2026-11-29 23:59:59+01';

  IF v_total_active_count <> 806 THEN
    RAISE EXCEPTION 'ÉCHEC : % séances actives au total sur le trimestre (attendu strictement: 806)', v_total_active_count;
  END IF;

  RAISE NOTICE 'Validation de production réussie : 468 privés + 299 Small Group + 39 Collectifs = exactement 806 séances actives.';
END;
$$;

COMMIT;
