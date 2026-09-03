-- =============================================================================
-- STRIKING CAMP — ARCHITECTURE DU PLANNING DYNAMIQUE
-- FICHIER : 20260903_dynamic_planning_architecture.sql
-- =============================================================================
-- Objectif :
-- 1. Créer la table public.recurring_schedule_templates (semaine type officielle).
-- 2. Ajouter template_id dans public.class_sessions.
-- 3. Initialiser les 23 créneaux Small Group et 3 créneaux Collectifs validés.
-- 4. Rendre public.generate_recurring_schedule() dynamique en lisant cette table.
-- 5. Configurer RLS et permissions sécurisées.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CRÉATION DE LA TABLE DES MODÈLES RÉCURRENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lundi, 1=Mardi ... 5=Samedi, 6=Dimanche
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  type public.session_type NOT NULL, -- 'small_group', 'collective'
  discipline TEXT NOT NULL,
  level TEXT NOT NULL,
  max_capacity INT NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recurring_template UNIQUE (day_of_week, start_time, type, discipline)
);

-- Index pour accélérer le filtrage des templates actifs par jour
CREATE INDEX IF NOT EXISTS idx_recurring_templates_active_day
  ON public.recurring_schedule_templates (day_of_week, start_time)
  WHERE is_active = TRUE;

-- =============================================================================
-- 2. LIAISON DANS CLASS_SESSIONS
-- =============================================================================
ALTER TABLE public.class_sessions 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.recurring_schedule_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_sessions_template_id
  ON public.class_sessions (template_id)
  WHERE template_id IS NOT NULL;

-- =============================================================================
-- 3. PEUPLEMENT INITIAL (SEED IDEMPOTENT DE LA SEMAINE TYPE OFFICIELLE)
-- =============================================================================
INSERT INTO public.recurring_schedule_templates (
  day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active
) VALUES
  -- ─────────────────────────────────────────────────────────────
  -- A. SMALL GROUP (23 créneaux)
  -- ─────────────────────────────────────────────────────────────
  -- Lundi (day_of_week = 0)
  (0, TIME '07:00:00', TIME '07:50:00', 'small_group', 'Boxing Bag', 'Fondamentaux', 20, TRUE),
  (0, TIME '11:00:00', TIME '11:50:00', 'small_group', 'Boxing', 'Fondamentaux', 20, TRUE),
  (0, TIME '12:15:00', TIME '13:05:00', 'small_group', 'Boxing Shred', 'Performance', 20, TRUE),

  -- Mardi (day_of_week = 1)
  (1, TIME '11:00:00', TIME '11:50:00', 'small_group', 'Boxing Shred', 'Cardio', 20, TRUE),
  (1, TIME '12:15:00', TIME '13:05:00', 'small_group', 'Boxing Bag', 'Cardio', 20, TRUE),
  (1, TIME '17:00:00', TIME '17:50:00', 'small_group', 'Lady Striking', 'Cours féminin', 20, TRUE),
  (1, TIME '18:00:00', TIME '18:50:00', 'small_group', 'Kick Boxing', 'Fondamentaux', 20, TRUE),

  -- Mercredi (day_of_week = 2)
  (2, TIME '07:00:00', TIME '07:50:00', 'small_group', 'Boxing Bag', 'Performance', 20, TRUE),
  (2, TIME '11:00:00', TIME '11:50:00', 'small_group', 'Kick Boxing', 'Fondamentaux', 20, TRUE),
  (2, TIME '12:15:00', TIME '13:05:00', 'small_group', 'Boxing Shred', 'Performance', 20, TRUE),
  (2, TIME '17:30:00', TIME '18:20:00', 'small_group', 'Striking', 'Performance', 20, TRUE),
  (2, TIME '19:30:00', TIME '20:20:00', 'small_group', 'Boxe Thaï', 'Fondamentaux', 20, TRUE),
  (2, TIME '20:30:00', TIME '21:20:00', 'small_group', 'Kick Boxing', 'Performance', 20, TRUE),

  -- Jeudi (day_of_week = 3)
  (3, TIME '11:00:00', TIME '11:50:00', 'small_group', 'Boxing Shred', 'Performance', 20, TRUE),
  (3, TIME '12:15:00', TIME '13:05:00', 'small_group', 'Striking', 'Performance', 20, TRUE),
  (3, TIME '17:30:00', TIME '18:20:00', 'small_group', 'Lady Striking', 'Cours féminin', 20, TRUE),
  (3, TIME '19:30:00', TIME '20:20:00', 'small_group', 'Kick Boxing', 'Fondamentaux', 20, TRUE),
  (3, TIME '20:30:00', TIME '21:20:00', 'small_group', 'Boxe Thaï', 'Élite', 20, TRUE),

  -- Vendredi (day_of_week = 4)
  (4, TIME '07:00:00', TIME '07:50:00', 'small_group', 'Boxing Bag', 'Fondamentaux', 20, TRUE),
  (4, TIME '17:00:00', TIME '17:50:00', 'small_group', 'Boxe Thaï', 'Fondamentaux', 20, TRUE),
  (4, TIME '19:30:00', TIME '20:20:00', 'small_group', 'Striking', 'Performance', 20, TRUE),

  -- Samedi (day_of_week = 5)
  (5, TIME '11:00:00', TIME '11:50:00', 'small_group', 'Kick Boxing', 'Élite', 20, TRUE),
  (5, TIME '12:00:00', TIME '12:50:00', 'small_group', 'Lady Striking', 'Élite', 20, TRUE),

  -- ─────────────────────────────────────────────────────────────
  -- B. COURS COLLECTIFS (3 créneaux)
  -- ─────────────────────────────────────────────────────────────
  (1, TIME '18:00:00', TIME '19:00:00', 'collective', 'Kick Boxing', 'Tous niveaux (Accès libre)', 35, TRUE),
  (4, TIME '18:00:00', TIME '19:00:00', 'collective', 'Kick Boxing', 'Tous niveaux (Accès libre)', 35, TRUE),
  (5, TIME '10:00:00', TIME '11:00:00', 'collective', 'Kick Boxing', 'Tous niveaux (Accès libre)', 35, TRUE)
ON CONFLICT (day_of_week, start_time, type, discipline)
DO UPDATE SET
  end_time = EXCLUDED.end_time,
  level = EXCLUDED.level,
  max_capacity = EXCLUDED.max_capacity,
  is_active = TRUE,
  updated_at = NOW();

-- =============================================================================
-- 4. REFONTE DYNAMIQUE DE GENERATE_RECURRING_SCHEDULE()
-- =============================================================================
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
  --    Depuis la table public.recurring_schedule_templates
  -- ─────────────────────────────────────────────────────────────────────────
  WITH active_templates AS (
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
    CROSS JOIN active_templates tmpl
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
  -- B. GÉNÉRATION DES COURS PRIVÉS (36 créneaux × N semaines)
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
    INSERT INTO public.class_sessions (
      discipline, type, level, starts_at, ends_at, max_capacity, is_active
    )
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
    'dynamic_group_sessions_processed', v_inserted_group,
    'private_sessions_processed', v_inserted_priv,
    'total_processed', v_inserted_group + v_inserted_priv
  );
END;
$$;

-- =============================================================================
-- 5. MATRICE DE SÉCURITÉ & PERMISSIONS (RLS)
-- =============================================================================
GRANT ALL ON TABLE public.recurring_schedule_templates TO postgres, service_role;
GRANT SELECT ON TABLE public.recurring_schedule_templates TO authenticated, anon;

ALTER TABLE public.recurring_schedule_templates ENABLE ROW LEVEL SECURITY;

-- Les visiteurs et membres peuvent lire les modèles récurrents actifs
DROP POLICY IF EXISTS "Public read active recurring templates" ON public.recurring_schedule_templates;
CREATE POLICY "Public read active recurring templates"
  ON public.recurring_schedule_templates
  FOR SELECT
  TO PUBLIC
  USING (is_active = TRUE OR public.is_admin());

-- Les administrateurs peuvent tout faire sur les modèles récurrents
DROP POLICY IF EXISTS "Admin manage recurring templates" ON public.recurring_schedule_templates;
CREATE POLICY "Admin manage recurring templates"
  ON public.recurring_schedule_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Accès étendu de lecture publique pour class_sessions actives
DROP POLICY IF EXISTS "Public read active class sessions" ON public.class_sessions;
CREATE POLICY "Public read active class sessions"
  ON public.class_sessions
  FOR SELECT
  TO PUBLIC
  USING (is_active = TRUE OR public.is_admin());

-- Exécution immédiate de la génération pour instancier et lier les 13 semaines
SELECT public.generate_recurring_schedule((DATE_TRUNC('week', CURRENT_DATE)::DATE), 13);

COMMIT;

