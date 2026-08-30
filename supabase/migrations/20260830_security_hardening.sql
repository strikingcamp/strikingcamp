-- =============================================================================
-- STRIKING CAMP — ARCHITECTURE DE SÉCURITÉ GLOBALE & HARDENING SUPABASE
-- Migration : 20260830_security_hardening.sql
-- =============================================================================
-- SPÉCIFICATIONS :
--   1. Configuration stricte et exclusive sur 8 séances privées par cycle.
--   2. Verrous pessimistes (FOR UPDATE) pour sérialiser tout accès concurrent.
--   3. Application rigoureuse de la règle d'annulation des 24 heures.
--   4. Contrôle d'accès ADMIN sécurisé côté base de données (is_admin).
--   5. Idempotence, RLS et attribution des privilèges minimaux (GRANT/REVOKE).
-- =============================================================================

BEGIN;

-- 0. EXTENSIONS ET PRIVILÈGES PAR DÉFAUT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Révocation globale des privilèges par défaut pour PUBLIC sur les futures fonctions
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


-- =============================================================================
-- 1. HELPERS DE SÉCURITÉ CENTRALISÉS
-- =============================================================================

-- Helper 1.1 : Vérification universelle et étanche du rôle Administrateur
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role', ''))
  INTO v_role
  FROM auth.users
  WHERE id = v_user_id;

  RETURN (UPPER(v_role) = 'ADMIN');
END;
$$;

-- Helper 1.2 : Récupération sécurisée de l'ID utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT auth.uid();
$$;


-- =============================================================================
-- 2. EXTENSION DE SCHEMA & INDEX DE PERFORMANCE SUR PUBLIC.BOOKINGS
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS is_late_cancellation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ NULL;

-- Index de performance pour les calculs de quota et de cycle
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_class
  ON public.bookings (user_id, status, class_session_id);

CREATE INDEX IF NOT EXISTS idx_class_sessions_type_starts
  ON public.class_sessions (type, starts_at);

-- Index unique anti-doublon pour les réservations actives confirmées
CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_session_active_idx
  ON public.bookings (user_id, class_session_id)
  WHERE status = 'confirmed';


-- =============================================================================
-- 3. RPC SMALL GROUP : CREATE & CANCEL
-- =============================================================================

-- 3.1 Réservation sécurisée Small Group (anti-surcapacité & anti-race condition)
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
  v_has_access BOOLEAN := FALSE;
  v_current_bookings_count INT := 0;
  v_new_booking_id UUID;
BEGIN
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour réserver une séance.'
    );
  END IF;

  -- 2. Verrouillage exclusif du créneau cible
  SELECT id, discipline, type, starts_at, max_capacity, is_active
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

  IF v_session.starts_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_STARTED', 'message', 'Cette séance est déjà commencée.');
  END IF;

  -- 3. Vérification des droits d'accès Small Group via abonnement actif
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at >= NOW())
      AND (
        p.allows_small_group = TRUE 
        OR p.allows_private = TRUE 
        OR p.type IN ('small_group', 'private')
        OR LOWER(p.name) LIKE '%small group%'
        OR LOWER(p.name) LIKE '%privé%'
        OR LOWER(p.name) LIKE '%prive%'
      )
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_PLAN', 'message', 'Votre abonnement actuel ne permet pas de réserver des séances Small Group.');
  END IF;

  -- 4. Vérification anti-doublon
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_session_id = p_class_session_id
      AND user_id = v_user_id
      AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_BOOKED', 'message', 'Vous êtes déjà inscrit à cette séance.');
  END IF;

  -- 5. Vérification de la capacité maximale (défaut 20)
  SELECT COUNT(id) INTO v_current_bookings_count
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  IF v_current_bookings_count >= COALESCE(v_session.max_capacity, 20) THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_FULL', 'message', 'Cette séance est complète (capacité maximale atteinte).');
  END IF;

  -- 6. Insertion sécurisée de la réservation
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
    NOW()
  )
  RETURNING id INTO v_new_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'message', 'Réservation confirmée avec succès.'
  );
END;
$$;

-- 3.2 Annulation sécurisée Small Group avec règle stricte des 24 heures
CREATE OR REPLACE FUNCTION public.cancel_small_group_booking(
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  SELECT b.id, b.user_id, b.class_session_id, b.status
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'Réservation introuvable.');
  END IF;

  IF v_booking.user_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Vous ne pouvez pas annuler la réservation d''un autre membre.');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CANCELLED', 'message', 'Cette réservation n''est plus active.');
  END IF;

  SELECT id, discipline, type, starts_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance associée introuvable.');
  END IF;

  -- Règle stricte des 24 heures (NOW() < starts_at - 24h)
  IF v_session.starts_at < v_now + INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CANCELLATION_DEADLINE_PASSED',
      'message', 'Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures. Pour toute demande exceptionnelle, veuillez contacter votre coach.'
    );
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      cancellation_reason = 'member_cancelled'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'message', 'Réservation annulée avec succès.');
END;
$$;


-- =============================================================================
-- 4. RPC COURS PRIVÉS : QUOTA STRICT 8, CREATE & CANCEL (RÈGLE DES 24H)
-- =============================================================================

-- 4.1 Calcul dynamique du quota mensuel (Strictement 8 séances)
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  SELECT s.id, s.started_at, s.ends_at, s.private_sessions_quota, p.name AS plan_name, p.type AS plan_type, p.allows_private
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = v_user_id
    AND s.status = 'active'
    AND (s.ends_at IS NULL OR s.ends_at >= v_now)
    AND (p.allows_private = TRUE OR p.type = 'private' OR LOWER(p.name) LIKE '%privé%' OR LOWER(p.name) LIKE '%prive%')
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
    AND cs.type = 'private'
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

-- 4.2 Réservation d'un cours privé (Verrouillage pessimiste & Quota strict 8)
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Veuillez vous connecter pour réserver une séance privée.');
  END IF;

  -- 1. Verrouillage exclusif de la ligne d'abonnement du membre
  SELECT s.id, s.started_at, s.ends_at, s.private_sessions_quota, p.name AS plan_name, p.type AS plan_type, p.allows_private
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = v_user_id
    AND s.status = 'active'
    AND (s.ends_at IS NULL OR s.ends_at >= v_now)
    AND (p.allows_private = TRUE OR p.type = 'private' OR LOWER(p.name) LIKE '%privé%' OR LOWER(p.name) LIKE '%prive%')
  ORDER BY s.started_at DESC
  LIMIT 1
  FOR UPDATE OF s;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_PRIVATE_PLAN', 'message', 'Vous devez posséder une formule Cours Privé active pour réserver.');
  END IF;

  -- 2. Verrouillage exclusif du créneau cible
  SELECT id, discipline, type, starts_at, ends_at, max_capacity, is_active
  INTO v_session
  FROM public.class_sessions
  WHERE id = p_class_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Créneau privé introuvable.');
  END IF;

  IF v_session.is_active = FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_INACTIVE', 'message', 'Ce créneau n''est plus disponible.');
  END IF;

  IF v_session.type <> 'private' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_TYPE', 'message', 'Ce créneau n''est pas un cours privé.');
  END IF;

  IF v_session.max_capacity <> 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PRIVATE_CAPACITY', 'message', 'La capacité d''un cours privé doit être strictement de 1 personne.');
  END IF;

  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_STARTED', 'message', 'Impossible de réserver un créneau déjà commencé ou passé.');
  END IF;

  -- 3. Vérification de l'occupation du créneau sous verrou
  SELECT id, user_id
  INTO v_existing_booking
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed'
  LIMIT 1
  FOR UPDATE;

  IF v_existing_booking IS NOT NULL THEN
    IF v_existing_booking.user_id = v_user_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_BOOKED', 'message', 'Vous avez déjà réservé ce créneau.');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'SESSION_FULL', 'message', 'Ce créneau est déjà réservé par un autre membre.');
    END IF;
  END IF;

  -- 4. Calcul du solde de quota sous verrou
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
    AND cs.type = 'private'
    AND cs.starts_at >= v_cycle_start
    AND cs.starts_at < v_cycle_end
    AND (
      b.status = 'confirmed'
      OR (b.status = 'cancelled' AND b.is_late_cancellation = TRUE)
    );

  v_sessions_remaining := GREATEST(0, v_quota_total - v_sessions_consumed);

  -- 5. Blocage strict si quota épuisé
  IF v_sessions_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRIVATE_QUOTA_EXHAUSTED', 'message', 'Vous avez utilisé toutes vos séances privées pour le cycle en cours (8/8).');
  END IF;

  -- 6. Insertion sécurisée
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

-- 4.3 Annulation d'un cours privé avec règle stricte des 24 heures
-- 4.3 Annulation d'un cours privé avec règle stricte des 24 heures
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  -- 1. Verrouillage de la réservation
  SELECT b.id, b.user_id, b.class_session_id, b.status
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'Réservation introuvable.');
  END IF;

  -- 2. Contrôle de propriété
  IF v_booking.user_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Vous ne pouvez pas annuler la réservation d''un autre membre.');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CANCELLED', 'message', 'Cette réservation n''est plus active.');
  END IF;

  SELECT id, discipline, type, starts_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance associée introuvable.');
  END IF;

  IF v_session.type <> 'private' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_TYPE', 'message', 'Cette fonction est réservée aux cours privés.');
  END IF;

  -- 3. Application stricte de la règle des 24 heures : refus si moins de 24h
  IF v_session.starts_at < v_now + INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CANCELLATION_DEADLINE_PASSED',
      'message', 'Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures. Pour toute demande exceptionnelle, veuillez contacter votre coach.'
    );
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      cancellation_reason = 'member_cancelled',
      is_late_cancellation = FALSE
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'isLateCancellation', false,
    'message', 'La séance est annulée et votre quota est restitué.'
  );
END;
$$;


-- =============================================================================
-- 5. RPC ADMIN : ÉMARGEMENT & GÉNÉRATION DE CRÉNEAUX
-- =============================================================================

-- 5.1 Émargement sécurisé par l'administrateur
CREATE OR REPLACE FUNCTION public.admin_mark_attendance(
  p_booking_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_attended_at TIMESTAMPTZ := NULL;
BEGIN
  -- Vérification centralisée du rôle Admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Action réservée aux administrateurs.');
  END IF;

  -- Validation stricte du statut
  IF p_status NOT IN ('pending', 'present', 'absent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Statut d''émargement invalide.');
  END IF;

  IF p_status = 'present' THEN
    v_attended_at := NOW();
  END IF;

  UPDATE public.bookings
  SET attendance_status = p_status,
      attended_at = v_attended_at
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'Réservation introuvable.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'attendance_status', p_status,
    'attended_at', v_attended_at,
    'message', 'Émargement enregistré.'
  );
END;
$$;

-- 5.2 Génération standard des 6 créneaux journaliers de 50 min
CREATE OR REPLACE FUNCTION public.admin_generate_daily_private_slots(
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count INT := 0;
  v_slots RECORD;
BEGIN
  -- Vérification centralisée du rôle Admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Action réservée aux administrateurs.');
  END IF;

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
      WHERE type = 'private'
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
-- 6. MATRICE DE PERMISSIONS & PRIVILÈGES DE SÉCURITÉ (GRANT / REVOKE)
-- =============================================================================

-- 6.1 Révocation stricte pour le rôle public (anon/non-authentifié)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_small_group_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_private_quota_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_private_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_private_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_mark_attendance(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_generate_daily_private_slots(DATE) FROM PUBLIC;

-- 6.2 Attribution des privilèges minimaux nécessaires
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_small_group_booking(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_member_private_quota_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_private_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_private_booking(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_mark_attendance(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_generate_daily_private_slots(DATE) TO authenticated, service_role;

-- 6.3 Droits de lecture sur les tables du planning et réservations
GRANT SELECT ON public.class_sessions TO authenticated, anon;
GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.class_sessions, public.bookings TO service_role;

COMMIT;
