-- =============================================================================
-- STRIKING CAMP — UNIFIED PLANNING ENGINE & STRICT ACCESS CONTROL
-- Fichier : 20261001_unified_planning_access_control.sql
-- =============================================================================
-- Objectifs :
-- 1. Ajouter les colonnes category et target_age_group sur recurring_schedule_templates et class_sessions
-- 2. Ajouter la colonne birth_date sur profiles
-- 3. Ajouter la colonne selected_discipline sur subscriptions et membership_requests
-- 4. Créer la table dédiée public.subscription_discipline_choices pour l'historique et la robustesse
-- 5. Mettre à jour maintain_schedule_horizon et generate_recurring_schedule pour propager category et target_age_group
-- 6. Mettre à jour admin_approve_membership_request pour propager selected_discipline
-- 7. Redéfinir de manière ultra-sécurisée create_small_group_booking :
--    - Adulte Essentiel : 1 discipline choisie, max 3 séances/semaine (timezone Europe/Paris)
--    - Adulte All Access : Tous les cours de catégorie 'cours_adulte'
--    - Lady Striking : Uniquement catégorie 'lady_striking'
--    - Kid Boxing : Uniquement catégorie 'kid_boxing' avec vérification stricte de l'âge (5-8 ans / 9-13 ans)
--    - Préservation stricte de la capacité (12 max), du verrouillage FOR UPDATE, anti-doublon et règle 24h
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENRICHISSEMENT DU SCHÉMA PLANNING
-- =============================================================================

-- A. Table recurring_schedule_templates
ALTER TABLE public.recurring_schedule_templates
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'cours_adulte'
  CHECK (category IN ('cours_adulte', 'lady_striking', 'kid_boxing'));

ALTER TABLE public.recurring_schedule_templates
  ADD COLUMN IF NOT EXISTS target_age_group TEXT NOT NULL DEFAULT 'all'
  CHECK (target_age_group IN ('all', '5_8', '9_13'));

CREATE INDEX IF NOT EXISTS idx_recurring_templates_category_active
  ON public.recurring_schedule_templates (category, is_active);

-- B. Table class_sessions
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'cours_adulte'
  CHECK (category IN ('cours_adulte', 'lady_striking', 'kid_boxing'));

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS target_age_group TEXT NOT NULL DEFAULT 'all'
  CHECK (target_age_group IN ('all', '5_8', '9_13'));

CREATE INDEX IF NOT EXISTS idx_class_sessions_category_starts_at
  ON public.class_sessions (category, starts_at);

-- C. Table profiles (Date de naissance pour contrôle d'âge Kid Boxing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL;

-- D. Table subscriptions & membership_requests (Discipline choisie pour Essentiel)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS selected_discipline TEXT NULL;

ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS selected_discipline TEXT NULL;

-- E. Table dédiée subscription_discipline_choices
CREATE TABLE IF NOT EXISTS public.subscription_discipline_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sub_discipline_choice UNIQUE (subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_discipline_choices_user
  ON public.subscription_discipline_choices (user_id);

ALTER TABLE public.subscription_discipline_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own discipline choice"
  ON public.subscription_discipline_choices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage discipline choices"
  ON public.subscription_discipline_choices
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 2. CLASSIFICATION INITIALE IDEMPOTENTE DES TEMPLATES EXISTANTS
-- =============================================================================

-- Lady Striking
UPDATE public.recurring_schedule_templates
SET category = 'lady_striking', target_age_group = 'all'
WHERE LOWER(discipline) LIKE '%lady%';

-- Kid Boxing
UPDATE public.recurring_schedule_templates
SET category = 'kid_boxing',
    target_age_group = CASE
      WHEN level LIKE '%5-8%' OR level LIKE '%5_8%' THEN '5_8'
      WHEN level LIKE '%9-13%' OR level LIKE '%9_13%' THEN '9_13'
      ELSE 'all'
    END
WHERE LOWER(discipline) LIKE '%kid%';

-- Cours Adulte (Défaut pour Boxe anglaise, Kick Boxing, Boxe Thaï, Striking, Boxing Bag, KB Shred)
UPDATE public.recurring_schedule_templates
SET category = 'cours_adulte', target_age_group = 'all'
WHERE category IS NULL OR (category NOT IN ('lady_striking', 'kid_boxing') AND LOWER(discipline) NOT LIKE '%lady%' AND LOWER(discipline) NOT LIKE '%kid%');

-- Propagation vers class_sessions existantes
UPDATE public.class_sessions s
SET category = t.category,
    target_age_group = t.target_age_group
FROM public.recurring_schedule_templates t
WHERE s.template_id = t.id;

-- =============================================================================
-- 3. MISE À JOUR DE LA GÉNÉRATION DU PLANNING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_recurring_schedule(
  p_start_date DATE,
  p_days_count INT DEFAULT 28
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inserted_count INT := 0;
  v_skipped_count INT := 0;
  v_day_offset INT;
  v_current_date DATE;
  v_day_of_week INT;
  v_tmpl RECORD;
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
BEGIN
  -- 1. Contrôle administrateur ou tâche de fond interne
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  -- 2. Itération sur l'horizon temporel
  FOR v_day_offset IN 0..(p_days_count - 1) LOOP
    v_current_date := p_start_date + v_day_offset;
    -- Conversion Postgres (0=Dimanche ... 6=Samedi) vers format Striking Camp (0=Lundi ... 5=Samedi, 6=Dimanche)
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INT;
    v_day_of_week := (v_day_of_week + 6) % 7;

    -- Parcourir tous les templates actifs pour ce jour
    FOR v_tmpl IN
      SELECT id, start_time, end_time, type, discipline, level, max_capacity, category, target_age_group
      FROM public.recurring_schedule_templates
      WHERE day_of_week = v_day_of_week
        AND is_active = TRUE
      ORDER BY start_time ASC
    LOOP
      v_starts_at := (v_current_date || ' ' || v_tmpl.start_time)::TIMESTAMP AT TIME ZONE 'Europe/Paris';
      v_ends_at := (v_current_date || ' ' || v_tmpl.end_time)::TIMESTAMP AT TIME ZONE 'Europe/Paris';

      -- Insérer uniquement si la session n'existe pas déjà
      IF NOT EXISTS (
        SELECT 1 FROM public.class_sessions
        WHERE template_id = v_tmpl.id
          AND starts_at = v_starts_at
      ) THEN
        INSERT INTO public.class_sessions (
          template_id,
          type,
          discipline,
          level,
          category,
          target_age_group,
          starts_at,
          ends_at,
          max_capacity,
          is_active,
          created_at
        ) VALUES (
          v_tmpl.id,
          v_tmpl.type,
          v_tmpl.discipline,
          v_tmpl.level,
          v_tmpl.category,
          v_tmpl.target_age_group,
          v_starts_at,
          v_ends_at,
          COALESCE(v_tmpl.max_capacity, 12),
          TRUE,
          NOW()
        );
        v_inserted_count := v_inserted_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count,
    'skipped_count', v_skipped_count,
    'horizon_days', p_days_count,
    'message', 'Génération dynamique du planning terminée avec succès.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_recurring_schedule(DATE, INT) TO authenticated, service_role;

-- =============================================================================
-- 4. MISE À JOUR DE LA VALIDATION D'ADHÉSION ADMIN
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_membership_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id UUID;
  v_req RECORD;
  v_plan RECORD;
  v_started_at TIMESTAMPTZ := NOW();
  v_ends_at TIMESTAMPTZ;
  v_quota INT;
  v_sub_id UUID;
BEGIN
  -- A. Vérification des droits administrateur
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  v_admin_id := auth.uid();

  -- B. Récupération et verrouillage de la demande
  SELECT id, user_id, plan_id, status, commitment_type, selected_discipline
  INTO v_req
  FROM public.membership_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_FOUND',
      'message', 'Demande d''adhésion introuvable.'
    );
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_PENDING',
      'message', 'Cette demande n''est plus en attente (statut actuel: ' || v_req.status || ').'
    );
  END IF;

  -- C. Récupération de la formule
  SELECT id, name, code, type, private_sessions_per_period
  INTO v_plan
  FROM public.plans
  WHERE id = v_req.plan_id;

  -- D. Calcul des dates de validité selon l'engagement
  IF v_req.commitment_type = 'annual' THEN
    v_ends_at := v_started_at + INTERVAL '12 months';
  ELSE
    v_ends_at := v_started_at + INTERVAL '1 month';
  END IF;

  v_quota := COALESCE(v_plan.private_sessions_per_period, 8);

  -- E. Création de l'abonnement actif dans public.subscriptions
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    ends_at,
    private_sessions_quota,
    selected_discipline,
    created_at,
    updated_at
  ) VALUES (
    v_req.user_id,
    v_req.plan_id,
    'active',
    v_started_at,
    v_ends_at,
    v_quota,
    v_req.selected_discipline,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_sub_id;

  -- F. Enregistrement dans subscription_discipline_choices si discipline renseignée
  IF v_req.selected_discipline IS NOT NULL AND TRIM(v_req.selected_discipline) <> '' THEN
    INSERT INTO public.subscription_discipline_choices (
      subscription_id,
      user_id,
      discipline,
      created_at,
      updated_at
    ) VALUES (
      v_sub_id,
      v_req.user_id,
      TRIM(v_req.selected_discipline),
      NOW(),
      NOW()
    )
    ON CONFLICT (subscription_id) DO UPDATE SET
      discipline = EXCLUDED.discipline,
      updated_at = NOW();
  END IF;

  -- G. Mise à jour de la demande d'adhésion
  UPDATE public.membership_requests
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = v_admin_id,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'message', 'Demande d''adhésion validée avec succès. Abonnement activé.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role, postgres;

-- =============================================================================
-- 5. REDÉFINITION SÉCURISÉE DE CREATE_SMALL_GROUP_BOOKING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_small_group_booking(
  p_class_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_member_bookings_count INT := 0;
  v_trial_bookings_count INT := 0;
  v_total_occupied INT := 0;
  v_new_booking_id UUID;
  v_now TIMESTAMPTZ := NOW();

  -- Informations d'abonnement & plan
  v_has_valid_sub BOOLEAN := FALSE;
  v_sub RECORD;
  v_plan_code TEXT;
  v_user_birth_date DATE;
  v_member_age INT;
  v_chosen_discipline TEXT;
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_weekly_bookings_count INT := 0;
  v_authorized BOOLEAN := FALSE;
  v_rejection_reason TEXT := 'Votre abonnement actuel ne permet pas de réserver cette séance.';
BEGIN
  -- 0. Vérification du statut global du service Small Group
  IF NOT public.is_service_active('small_group') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service de cours collectifs est actuellement désactivé.'
    );
  END IF;

  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour réserver une séance.'
    );
  END IF;

  -- 2. Verrouillage exclusif de la séance
  SELECT id, discipline, type, category, target_age_group, starts_at, ends_at, max_capacity, is_active
  INTO v_session
  FROM public.class_sessions
  WHERE id = p_class_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance introuvable.');
  END IF;

  IF v_session.is_active = FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_INACTIVE', 'message', 'Cette séance n''est plus active.');
  END IF;

  -- Règle temporelle stricte : fin de séance
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée et ne peut plus être réservée.'
    );
  END IF;

  -- Règle temporelle stricte : début de séance
  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_STARTED',
      'message', 'Cette séance est déjà commencée.'
    );
  END IF;

  -- 3. Vérification anti-doublon
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_session_id = p_class_session_id
      AND user_id = v_user_id
      AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_BOOKED', 'message', 'Vous êtes déjà inscrit à cette séance.');
  END IF;

  -- 4. Récupération du profil utilisateur (notamment date de naissance)
  SELECT birth_date INTO v_user_birth_date
  FROM public.profiles
  WHERE id = v_user_id;

  -- 5. Évaluation stricte des droits d'accès selon le(s) plan(s) actif(s)
  FOR v_sub IN
    SELECT s.id AS sub_id, s.selected_discipline, p.id AS plan_id, p.code AS plan_code, p.name AS plan_name,
           p.type AS plan_type, p.allows_small_group, p.allows_private
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at >= v_now)
  LOOP
    v_has_valid_sub := TRUE;
    v_plan_code := LOWER(COALESCE(v_sub.plan_code, ''));

    -- =========================================================================
    -- CAS 1 : ADULTE ESSENTIEL ('adult_essential')
    -- =========================================================================
    IF v_plan_code = 'adult_essential' THEN
      -- Vérification 1 : La séance doit appartenir à la catégorie 'cours_adulte'
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        -- Récupérer la discipline choisie par le membre
        v_chosen_discipline := COALESCE(v_sub.selected_discipline, '');
        IF v_chosen_discipline = '' THEN
          SELECT discipline INTO v_chosen_discipline
          FROM public.subscription_discipline_choices
          WHERE subscription_id = v_sub.sub_id;
        END IF;

        -- Normalisation et comparaison de la discipline
        IF v_chosen_discipline IS NOT NULL AND TRIM(v_chosen_discipline) <> '' THEN
          IF LOWER(TRIM(v_session.discipline)) = LOWER(TRIM(v_chosen_discipline)) THEN
            -- Vérification 2 : Quota hebdomadaire strict de 3 séances (Timezone Europe/Paris)
            -- La semaine commence le Lundi 00:00:00 (Europe/Paris)
            v_week_start := date_trunc('week', v_session.starts_at AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';
            v_week_end := v_week_start + INTERVAL '7 days';

            SELECT COUNT(b.id) INTO v_weekly_bookings_count
            FROM public.bookings b
            JOIN public.class_sessions cs ON b.class_session_id = cs.id
            WHERE b.user_id = v_user_id
              AND b.status = 'confirmed'
              AND cs.starts_at >= v_week_start
              AND cs.starts_at < v_week_end;

            IF v_weekly_bookings_count >= 3 THEN
              RETURN jsonb_build_object(
                'success', false,
                'error', 'WEEKLY_LIMIT_REACHED',
                'message', 'Vous avez atteint la limite de 3 séances par semaine pour votre formule Essentiel.'
              );
            ELSE
              v_authorized := TRUE;
              EXIT; -- Accès validé
            END IF;
          ELSE
            v_rejection_reason := 'Votre formule Essentiel est restreinte à la discipline ' || v_chosen_discipline || '.';
          END IF;
        ELSE
          v_rejection_reason := 'Veuillez sélectionner votre discipline dans votre espace adhésion pour activer vos réservations.';
        END IF;
      ELSE
        v_rejection_reason := 'La formule Cours Adulte Essentiel ne donne pas accès à cette catégorie de cours.';
      END IF;

    -- =========================================================================
    -- CAS 2 : ADULTE ALL ACCESS ('adult_all_access' ou formules legacy adultes)
    -- =========================================================================
    ELSIF v_plan_code = 'adult_all_access' OR v_plan_code IN ('col_annual', 'sg_annual') THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_authorized := TRUE;
        EXIT; -- Accès validé sans limite hebdo
      ELSE
        v_rejection_reason := 'Votre formule Cours Adulte All Access ne donne pas accès à cette catégorie.';
      END IF;

    -- =========================================================================
    -- CAS 3 : LADY STRIKING ('lady_striking_annual')
    -- =========================================================================
    ELSIF v_plan_code = 'lady_striking_annual' OR LOWER(v_sub.plan_name) LIKE '%lady%' THEN
      IF v_session.category = 'lady_striking' OR LOWER(v_session.discipline) LIKE '%lady%' THEN
        v_authorized := TRUE;
        EXIT; -- Accès validé
      ELSE
        v_rejection_reason := 'Votre formule Lady Striking donne accès exclusivement aux créneaux Lady Striking.';
      END IF;

    -- =========================================================================
    -- CAS 4 : KID BOXING ('kid_boxing_season')
    -- =========================================================================
    ELSIF v_plan_code = 'kid_boxing_season' OR LOWER(v_sub.plan_name) LIKE '%kid%' THEN
      IF v_session.category = 'kid_boxing' OR LOWER(v_session.discipline) LIKE '%kid%' THEN
        -- Contrôle d'âge si date de naissance renseignée
        IF v_user_birth_date IS NOT NULL THEN
          v_member_age := EXTRACT(YEAR FROM age(v_session.starts_at::date, v_user_birth_date))::INT;

          IF v_session.target_age_group = '5_8' AND (v_member_age < 5 OR v_member_age > 8) THEN
            RETURN jsonb_build_object(
              'success', false,
              'error', 'AGE_RESTRICTION_ERROR',
              'message', 'Ce créneau est réservé aux enfants de 5 à 8 ans (Âge actuel : ' || v_member_age || ' ans).'
            );
          ELSIF v_session.target_age_group = '9_13' AND (v_member_age < 9 OR v_member_age > 13) THEN
            RETURN jsonb_build_object(
              'success', false,
              'error', 'AGE_RESTRICTION_ERROR',
              'message', 'Ce créneau est réservé aux enfants de 9 à 13 ans (Âge actuel : ' || v_member_age || ' ans).'
            );
          ELSE
            v_authorized := TRUE;
            EXIT;
          END IF;
        ELSE
          -- Si pas de date de naissance, autoriser temporairement sur la catégorie kid
          v_authorized := TRUE;
          EXIT;
        END IF;
      ELSE
        v_rejection_reason := 'Votre formule Kid Boxing donne accès exclusivement aux cours Kid Boxing.';
      END IF;

    -- =========================================================================
    -- CAS 5 : COURS PRIVÉS (priv_monthly_8, priv_annual_8 avec accès small group)
    -- =========================================================================
    ELSIF v_sub.allows_small_group = TRUE OR v_sub.allows_private = TRUE THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_authorized := TRUE;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_has_valid_sub THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ACTIVE_PLAN',
      'message', 'Aucun abonnement actif trouvé. Veuillez souscrire à une formule pour réserver.'
    );
  END IF;

  IF NOT v_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_AUTHORIZED',
      'message', v_rejection_reason
    );
  END IF;

  -- 6. Vérification de la capacité maximale (12 places)
  SELECT COUNT(id) INTO v_member_bookings_count
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  SELECT COUNT(id) INTO v_trial_bookings_count
  FROM public.trial_bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  v_total_occupied := v_member_bookings_count + v_trial_bookings_count;

  IF v_total_occupied >= COALESCE(v_session.max_capacity, 12) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_FULL',
      'message', 'Cette séance est complète (capacité maximale de ' || COALESCE(v_session.max_capacity, 12) || ' places atteinte).'
    );
  END IF;

  -- 7. Insertion de la réservation
  INSERT INTO public.bookings (
    user_id,
    class_session_id,
    status,
    attendance_status,
    is_late_cancellation,
    created_at
  ) VALUES (
    v_user_id,
    p_class_session_id,
    'confirmed',
    'pending',
    FALSE,
    v_now
  )
  RETURNING id INTO v_new_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'message', 'Réservation confirmée avec succès.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

COMMIT;
