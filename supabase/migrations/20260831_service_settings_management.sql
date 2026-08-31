-- =============================================================================
-- Migration: Gestion des services & Feature Flags globaux
-- Date: 2026-08-31
-- Description:
--   1. Création de la table public.service_settings
--   2. Insertion des valeurs initiales :
--      - private : true (Cours privés)
--      - small_group : false (Small Group désactivé par défaut)
--      - events : true (Événements)
--   3. Helper function public.is_service_active(TEXT)
--   4. RPC admin public.admin_update_service_status(TEXT, BOOLEAN)
--   5. Intégration dans create_small_group_booking et create_private_booking
-- =============================================================================

-- 1. Table des paramètres de service
CREATE TABLE IF NOT EXISTS public.service_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT UNIQUE NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.service_settings TO postgres, service_role, authenticated, anon;

DROP POLICY IF EXISTS "service_settings_select_all" ON public.service_settings;
CREATE POLICY "service_settings_select_all" ON public.service_settings
  FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "service_settings_admin_all" ON public.service_settings;
CREATE POLICY "service_settings_admin_all" ON public.service_settings
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Valeurs initiales
INSERT INTO public.service_settings (service_key, service_name, description, is_active)
VALUES
  ('private', 'Cours privés', 'Réservations individuelles sur-mesure avec coach', true),
  ('small_group', 'Small Group', 'Cours en petit groupe (20 places maximum par créneau)', false),
  ('events', 'Événements', 'Stages, camps d''entraînement et événements Striking Camp', true)
ON CONFLICT (service_key) DO UPDATE
SET service_name = EXCLUDED.service_name,
    description = EXCLUDED.description;

-- 3. Fonction helper de vérification du statut d'un service
CREATE OR REPLACE FUNCTION public.is_service_active(p_service_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_active
  FROM public.service_settings
  WHERE service_key = p_service_key;

  -- Si non configuré, actif par défaut
  IF v_active IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_active;
END;
$$;

-- 4. RPC Admin pour mettre à jour le statut d'un service
CREATE OR REPLACE FUNCTION public.admin_update_service_status(
  p_service_key TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Action réservée aux administrateurs.');
  END IF;

  UPDATE public.service_settings
  SET is_active = p_is_active,
      updated_at = NOW()
  WHERE service_key = p_service_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Service introuvable.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'service_key', p_service_key,
    'is_active', p_is_active,
    'message', 'Statut du service mis à jour avec succès.'
  );
END;
$$;

-- 5. Intégration dans create_small_group_booking
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

-- 6. Intégration dans create_private_booking
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
  -- 0. Vérification du statut global du service Cours Privé
  IF NOT public.is_service_active('private') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service Cours Privés est actuellement désactivé et indisponible à la réservation.'
    );
  END IF;

  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Veuillez vous connecter pour réserver une séance privée.');
  END IF;

  -- 2. Verrouillage exclusif de la ligne d'abonnement du membre
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

  -- 3. Verrouillage exclusif du créneau cible
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

  -- 4. Vérification de l'occupation du créneau sous verrou
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

  -- 5. Calcul du solde de quota sous verrou
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

  -- 6. Blocage strict si quota épuisé
  IF v_sessions_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRIVATE_QUOTA_EXHAUSTED', 'message', 'Vous avez utilisé toutes vos séances privées pour le cycle en cours (8/8).');
  END IF;

  -- 7. Insertion sécurisée
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

-- Permissions
REVOKE ALL ON FUNCTION public.is_service_active(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_service_status(TEXT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_service_active(TEXT) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_service_status(TEXT, BOOLEAN) TO authenticated, service_role;
