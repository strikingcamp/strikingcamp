-- =============================================================================
-- Migration: Verrouillage strict des séances Small Group terminées (ends_at)
-- Fichier: supabase/migrations/20260903_lock_finished_small_group_sessions.sql
-- Description:
--   1. create_small_group_booking : Refuse la réservation si NOW() >= session.ends_at
--   2. cancel_small_group_booking : Refuse l'annulation si NOW() >= session.ends_at
--   3. Maintient intégralement la règle des 24h et toutes les règles métier existantes
-- =============================================================================

-- 1. Redéfinition sécurisée de create_small_group_booking
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
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 0. Vérification du statut global du service Small Group
  IF NOT public.is_service_active('small_group') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service Small Group est actuellement désactivé et indisponible à la réservation.'
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

  -- 2. Verrouillage exclusif du créneau cible (avec ends_at)
  SELECT id, discipline, type, starts_at, ends_at, max_capacity, is_active
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

  -- Règle absolue ends_at : refus immédiat si la séance est terminée
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée et ne peut plus être réservée.'
    );
  END IF;

  -- Règle starts_at : refus si la séance est déjà commencée
  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_STARTED',
      'message', 'Cette séance est déjà commencée.'
    );
  END IF;

  -- 3. Vérification des droits d'accès Small Group via abonnement actif
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at >= v_now)
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


-- 2. Redéfinition sécurisée de cancel_small_group_booking
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
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  -- 2. Verrouillage de la réservation
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

  -- 3. Récupération de la séance associée (avec ends_at)
  SELECT id, discipline, type, starts_at, ends_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance associée introuvable.');
  END IF;

  -- 4. Règle absolue ends_at : refus immédiat si la séance est terminée
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée. Sa réservation ne peut plus être modifiée ou annulée.'
    );
  END IF;

  -- 5. Règle stricte des 24 heures : refus si la séance commence dans moins de 24h
  IF v_session.starts_at < v_now + INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CANCELLATION_DEADLINE_PASSED',
      'message', 'Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures. Pour toute demande exceptionnelle, veuillez contacter votre coach.'
    );
  END IF;

  -- 6. Annulation effective de la réservation
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      cancellation_reason = 'member_cancelled'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'message', 'Réservation annulée avec succès.');
END;
$$;
