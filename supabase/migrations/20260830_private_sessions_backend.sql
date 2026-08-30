-- =============================================================================
-- STRIKING CAMP — MIGRATION ÉTAPE 1 : BACKEND COURS PRIVÉS & RÈGLE DES 24H
-- VERSION MINIMALE STRICTEMENT SÉCURISÉE (MOINDRE PRIVILÈGE)
-- =============================================================================

-- 1. COMPATIBILITÉ DE L'ENUM (Ajout strict de la valeur 'private')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    BEGIN
      ALTER TYPE public.session_type ADD VALUE IF NOT EXISTS 'private';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. EXTENSION NON DESTRUCTIVE DE LA TABLE PUBLIC.BOOKINGS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS is_late_cancellation BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexation ciblée pour accélérer les requêtes de quota
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_class
  ON public.bookings (user_id, status, class_session_id);

CREATE INDEX IF NOT EXISTS idx_class_sessions_type_starts
  ON public.class_sessions (type, starts_at);


-- =============================================================================
-- 3. RPC 1 : CALCUL DU STATUT DU QUOTA PRIVÉ DU MEMBRE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_member_private_quota_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_sub RECORD;
  v_cycle_start TIMESTAMPTZ;
  v_cycle_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_quota_total INT := 8;
  v_sessions_consumed INT := 0;
  v_sessions_remaining INT := 0;
  v_months_elapsed INT;
BEGIN
  -- Étape 1 : Identification de l'utilisateur connecté
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Utilisateur non authentifié.'
    );
  END IF;

  -- Étape 2 : Récupération de l'abonnement privé actif du membre
  SELECT s.id, s.started_at, s.ends_at, s.private_sessions_quota, p.name AS plan_name, p.type AS plan_type, p.allows_private
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = v_user_id
    AND s.status = 'active'
    AND (s.ends_at IS NULL OR s.ends_at >= v_now)
    AND (p.allows_private = TRUE OR p.type::text = 'private' OR LOWER(p.name) LIKE '%privé%' OR LOWER(p.name) LIKE '%prive%')
  ORDER BY s.started_at DESC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'has_active_private_plan', false,
      'quota_total', 0,
      'sessions_consumed', 0,
      'sessions_remaining', 0,
      'cycle_start', NULL,
      'cycle_end', NULL
    );
  END IF;

  -- Quota total mensuel configuré (défaut : 8)
  v_quota_total := COALESCE(v_sub.private_sessions_quota, 8);

  -- Étape 3 : Calcul déterministe du cycle mensuel basé sur started_at
  IF v_now >= v_sub.started_at THEN
    v_months_elapsed := (
      (EXTRACT(YEAR FROM v_now) - EXTRACT(YEAR FROM v_sub.started_at)) * 12 +
      (EXTRACT(MONTH FROM v_now) - EXTRACT(MONTH FROM v_sub.started_at))
    );
    
    v_cycle_start := v_sub.started_at + (v_months_elapsed || ' months')::INTERVAL;
    IF v_cycle_start > v_now THEN
      v_months_elapsed := v_months_elapsed - 1;
      v_cycle_start := v_sub.started_at + (v_months_elapsed || ' months')::INTERVAL;
    END IF;
    
    v_cycle_end := v_cycle_start + INTERVAL '1 month';
  ELSE
    v_cycle_start := v_sub.started_at;
    v_cycle_end := v_sub.started_at + INTERVAL '1 month';
  END IF;

  -- Étape 4 : Comptage des séances consommées dans le cycle actuel
  SELECT COUNT(b.id)
  INTO v_sessions_consumed
  FROM public.bookings b
  JOIN public.class_sessions cs ON b.class_session_id = cs.id
  WHERE b.user_id = v_user_id
    AND cs.type::text = 'private'
    AND cs.starts_at >= v_cycle_start
    AND cs.starts_at < v_cycle_end
    AND (
      b.status = 'confirmed'
      OR (b.status = 'cancelled' AND b.is_late_cancellation = TRUE)
    );

  v_sessions_remaining := GREATEST(0, v_quota_total - v_sessions_consumed);

  RETURN jsonb_build_object(
    'success', true,
    'has_active_private_plan', true,
    'quota_total', v_quota_total,
    'sessions_consumed', v_sessions_consumed,
    'sessions_remaining', v_sessions_remaining,
    'cycle_start', to_char(v_cycle_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'cycle_end', to_char(v_cycle_end, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;


-- =============================================================================
-- 4. RPC 2 : RÉSERVATION D'UN COURS PRIVÉ (AVEC VERROU ANTI-RACE CONDITION)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_private_booking(
  p_class_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_sub RECORD;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_cycle_start TIMESTAMPTZ;
  v_cycle_end TIMESTAMPTZ;
  v_months_elapsed INT;
  v_quota_total INT := 8;
  v_sessions_consumed INT := 0;
  v_sessions_remaining INT := 0;
  v_existing_booking RECORD;
  v_new_booking_id UUID;
BEGIN
  -- Étape 1 : Identifier l'utilisateur connecté
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour réserver une séance privée.'
    );
  END IF;

  -- Étape 2 : VERROUILLAGE DE L'ABONNEMENT DU MEMBRE (Anti-Race Condition Quota)
  SELECT s.id, s.started_at, s.ends_at, s.private_sessions_quota, p.name AS plan_name, p.type AS plan_type, p.allows_private
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = v_user_id
    AND s.status = 'active'
    AND (s.ends_at IS NULL OR s.ends_at >= v_now)
    AND (p.allows_private = TRUE OR p.type::text = 'private' OR LOWER(p.name) LIKE '%privé%' OR LOWER(p.name) LIKE '%prive%')
  ORDER BY s.started_at DESC
  LIMIT 1
  FOR UPDATE OF s;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ACTIVE_PRIVATE_PLAN',
      'message', 'Vous devez posséder une formule Cours Privé active pour réserver.'
    );
  END IF;

  -- Étape 3 : Verrouiller et inspecter le créneau cible
  SELECT id, discipline, type, starts_at, ends_at, max_capacity, is_active
  INTO v_session
  FROM public.class_sessions
  WHERE id = p_class_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_NOT_FOUND',
      'message', 'Créneau privé introuvable.'
    );
  END IF;

  IF v_session.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_INACTIVE',
      'message', 'Ce créneau n''est plus disponible.'
    );
  END IF;

  -- Étape 4 : Vérifier type = 'private'
  IF v_session.type::text <> 'private' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SESSION_TYPE',
      'message', 'Ce créneau n''est pas un cours privé.'
    );
  END IF;

  -- Étape 5 : Vérifier max_capacity = 1 (Règle stricte des cours privés)
  IF v_session.max_capacity <> 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PRIVATE_CAPACITY',
      'message', 'La capacité d''un cours privé doit être strictement de 1 personne.'
    );
  END IF;

  -- Étape 6 : Blocage créneau déjà commencé ou passé
  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_STARTED',
      'message', 'Impossible de réserver un créneau déjà commencé ou passé.'
    );
  END IF;

  -- Étape 7 : Vérifier collision de réservation
  SELECT id, user_id
  INTO v_existing_booking
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed'
  LIMIT 1
  FOR UPDATE;

  IF v_existing_booking IS NOT NULL THEN
    IF v_existing_booking.user_id = v_user_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'ALREADY_BOOKED',
        'message', 'Vous avez déjà réservé ce créneau.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'SESSION_FULL',
        'message', 'Ce créneau est déjà réservé par un autre membre.'
      );
    END IF;
  END IF;

  -- Étape 8 : Calcul du solde de quota sous verrou actif
  v_quota_total := COALESCE(v_sub.private_sessions_quota, 8);

  IF v_now >= v_sub.started_at THEN
    v_months_elapsed := (
      (EXTRACT(YEAR FROM v_now) - EXTRACT(YEAR FROM v_sub.started_at)) * 12 +
      (EXTRACT(MONTH FROM v_now) - EXTRACT(MONTH FROM v_sub.started_at))
    );
    
    v_cycle_start := v_sub.started_at + (v_months_elapsed || ' months')::INTERVAL;
    IF v_cycle_start > v_now THEN
      v_months_elapsed := v_months_elapsed - 1;
      v_cycle_start := v_sub.started_at + (v_months_elapsed || ' months')::INTERVAL;
    END IF;
    
    v_cycle_end := v_cycle_start + INTERVAL '1 month';
  ELSE
    v_cycle_start := v_sub.started_at;
    v_cycle_end := v_sub.started_at + INTERVAL '1 month';
  END IF;

  SELECT COUNT(b.id)
  INTO v_sessions_consumed
  FROM public.bookings b
  JOIN public.class_sessions cs ON b.class_session_id = cs.id
  WHERE b.user_id = v_user_id
    AND cs.type::text = 'private'
    AND cs.starts_at >= v_cycle_start
    AND cs.starts_at < v_cycle_end
    AND (
      b.status = 'confirmed'
      OR (b.status = 'cancelled' AND b.is_late_cancellation = TRUE)
    );

  v_sessions_remaining := GREATEST(0, v_quota_total - v_sessions_consumed);

  IF v_sessions_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRIVATE_QUOTA_EXHAUSTED',
      'message', 'Vous avez utilisé toutes vos séances privées pour le cycle en cours (8/8).'
    );
  END IF;

  -- Étape 9 : Insertion sécurisée de la réservation
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
    'remaining_sessions', v_sessions_remaining - 1,
    'message', 'Réservation de votre cours privé confirmée avec succès.'
  );
END;
$$;


-- =============================================================================
-- 5. RPC 3 : ANNULATION D'UN COURS PRIVÉ AVEC RÈGLE DES 24H
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cancel_private_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_booking RECORD;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_time_diff INTERVAL;
  v_is_late BOOLEAN := FALSE;
  v_reason TEXT;
  v_message TEXT;
BEGIN
  -- Étape 1 : Vérifier l'utilisateur connecté
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Utilisateur non authentifié.'
    );
  END IF;

  -- Étape 2 : Verrouiller et vérifier la réservation
  SELECT b.id, b.user_id, b.class_session_id, b.status
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Réservation introuvable.'
    );
  END IF;

  IF v_booking.user_id <> v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Vous ne pouvez pas annuler la réservation d''un autre membre.'
    );
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_CANCELLED',
      'message', 'Cette réservation n''est plus active.'
    );
  END IF;

  -- Étape 3 : Vérification du créneau
  SELECT id, discipline, type, starts_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  IF v_session.type::text <> 'private' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SESSION_TYPE',
      'message', 'Cette fonction est réservée aux cours privés.'
    );
  END IF;

  -- Étape 4 : RÈGLE DES 24 HEURES
  v_time_diff := v_session.starts_at - v_now;

  IF v_time_diff >= INTERVAL '24 hours' THEN
    v_is_late := FALSE;
    v_reason := 'member_cancelled';
    v_message := 'La séance est annulée et votre quota est restitué.';
  ELSE
    v_is_late := TRUE;
    v_reason := 'member_cancelled_late';
    v_message := 'La séance est annulée mais reste décomptée du quota (délai inférieur à 24h).';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      cancellation_reason = v_reason,
      is_late_cancellation = v_is_late
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'isLateCancellation', v_is_late,
    'message', v_message
  );
END;
$$;


-- =============================================================================
-- 6. RPC 4 : GÉNÉRATION DES 6 CRÉNEAUX PRIVÉS DU JOUR (ADMIN)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_generate_daily_private_slots(
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_count INT := 0;
  v_slots RECORD;
BEGIN
  -- Étape 1 : Vérification stricte d'authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Utilisateur non authentifié.'
    );
  END IF;

  -- Étape 2 : Vérification stricte du rôle Administrateur
  SELECT (COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role', ''))
  INTO v_role
  FROM auth.users
  WHERE id = v_user_id;
  
  IF UPPER(v_role) <> 'ADMIN' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  -- Étape 3 : Boucle sur les 6 créneaux de 50 min
  FOR v_slots IN
    SELECT 
      (p_date + TIME '08:00:00') AT TIME ZONE 'Europe/Paris' AS start_time,
      (p_date + TIME '08:50:00') AT TIME ZONE 'Europe/Paris' AS end_time
    UNION ALL
    SELECT 
      (p_date + TIME '09:00:00') AT TIME ZONE 'Europe/Paris',
      (p_date + TIME '09:50:00') AT TIME ZONE 'Europe/Paris'
    UNION ALL
    SELECT 
      (p_date + TIME '10:00:00') AT TIME ZONE 'Europe/Paris',
      (p_date + TIME '10:50:00') AT TIME ZONE 'Europe/Paris'
    UNION ALL
    SELECT 
      (p_date + TIME '14:00:00') AT TIME ZONE 'Europe/Paris',
      (p_date + TIME '14:50:00') AT TIME ZONE 'Europe/Paris'
    UNION ALL
    SELECT 
      (p_date + TIME '15:00:00') AT TIME ZONE 'Europe/Paris',
      (p_date + TIME '15:50:00') AT TIME ZONE 'Europe/Paris'
    UNION ALL
    SELECT 
      (p_date + TIME '16:00:00') AT TIME ZONE 'Europe/Paris',
      (p_date + TIME '16:50:00') AT TIME ZONE 'Europe/Paris'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.class_sessions
      WHERE type::text = 'private'
        AND starts_at = v_slots.start_time
    ) THEN
      INSERT INTO public.class_sessions (
        discipline,
        type,
        level,
        starts_at,
        ends_at,
        max_capacity,
        is_active
      ) VALUES (
        'Cours Privé',
        'private',
        'Individuel',
        v_slots.start_time,
        v_slots.end_time,
        1,
        TRUE
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'slots_created', v_count,
    'target_date', p_date,
    'message', format('%s créneaux privés ont été générés pour le %s.', v_count, p_date)
  );
END;
$$;


-- =============================================================================
-- 7. MATRICE DE SÉCURITÉ MINIMALE (STRICTEMENT CIBLÉE)
-- =============================================================================
-- Révocation de tout accès public non autorisé
REVOKE ALL ON FUNCTION public.get_member_private_quota_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_private_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_private_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_generate_daily_private_slots(DATE) FROM PUBLIC;

-- Attribution strictement limitée aux rôles habilités
GRANT EXECUTE ON FUNCTION public.get_member_private_quota_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_private_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_private_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_daily_private_slots(DATE) TO authenticated, service_role;
