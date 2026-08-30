-- =============================================================================
-- Migration: Règle d'annulation stricte des 24 heures (Small Group & Privé)
-- Date: 2026-08-31
-- Description:
--   1. cancel_small_group_booking : Refuse l'annulation si NOW() >= session.starts_at - 24h
--   2. cancel_private_booking     : Refuse l'annulation si NOW() >= session.starts_at - 24h
--   3. Retourne CANCELLATION_DEADLINE_PASSED et conserve le statut 'confirmed'
-- =============================================================================

-- 1. Annulation sécurisée Small Group avec règle stricte des 24 heures
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

  -- Règle stricte des 24 heures : refus strict si la séance commence dans moins de 24h ou est déjà commencée
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

-- 2. Annulation d'un cours privé avec règle stricte des 24 heures
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

-- Permissions d'exécution
REVOKE ALL ON FUNCTION public.cancel_small_group_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_private_booking(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cancel_small_group_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_private_booking(UUID) TO authenticated;
