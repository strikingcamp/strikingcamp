-- =============================================================================
-- STRIKING CAMP — SYSTÈME DE RÉSERVATION DES COURS D'ESSAI (VISITEURS PUBLICS)
-- Migration : 20260905_trial_bookings_system.sql
-- =============================================================================
-- SPÉCIFICATIONS :
--   1. Création de la table isolée public.trial_bookings pour les prospects
--   2. Règle stricte anti-doublon par séance (email & téléphone normalisés)
--   3. Règle métier : 1 seul cours d'essai actif à venir par prospect
--   4. Verrouillage transactionnel pessimiste (FOR UPDATE) et calcul de capacité
--   5. Séances autorisées : collective et small_group (Cours Privés exclus)
--   6. RPC SECURITY DEFINER create_trial_booking pour les visiteurs anonymes
--   7. RPCs administrateur pour l'émargement et la gestion des essais
--   8. Politiques RLS étanches (aucune lecture directe par anon / protection RGPD)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CRÉATION DE LA TABLE TRIAL_BOOKINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.trial_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent_contact BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  attendance_status TEXT NOT NULL DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent')),
  attended_at TIMESTAMPTZ NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. INDEX DE PERFORMANCE ET CONTRAINTES UNIQUES ANTI-DOUBLONS
-- =============================================================================

-- Index de recherche rapide par séance et par statut
CREATE INDEX IF NOT EXISTS idx_trial_bookings_session_status
  ON public.trial_bookings (class_session_id, status);

CREATE INDEX IF NOT EXISTS idx_trial_bookings_created_at
  ON public.trial_bookings (created_at DESC);

-- Index unique anti-doublon par séance pour l'email normalisé (minuscules et sans espaces)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_session_email
  ON public.trial_bookings (class_session_id, LOWER(TRIM(email)))
  WHERE status = 'confirmed';

-- Index unique anti-doublon par séance pour le téléphone normalisé (chiffres et '+' uniquement)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_session_phone
  ON public.trial_bookings (class_session_id, regexp_replace(phone, '[^0-9+]', '', 'g'))
  WHERE status = 'confirmed';

-- =============================================================================
-- 3. PERMISSIONS ET SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- =============================================================================
GRANT ALL ON TABLE public.trial_bookings TO postgres, service_role;
GRANT SELECT ON TABLE public.trial_bookings TO authenticated;

ALTER TABLE public.trial_bookings ENABLE ROW LEVEL SECURITY;

-- Politique Admin : Gestion totale pour les administrateurs
DROP POLICY IF EXISTS "Admin full access on trial_bookings" ON public.trial_bookings;
CREATE POLICY "Admin full access on trial_bookings"
  ON public.trial_bookings
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pas de SELECT direct pour le rôle anon (protection stricte des données personnelles des prospects)
-- La création s'effectue exclusivement via la RPC create_trial_booking (SECURITY DEFINER)

-- =============================================================================
-- 4. RPC VISITEUR : CRÉATION SÉCURISÉE D'UN COURS D'ESSAI
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_trial_booking(
  p_class_session_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_consent BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session RECORD;
  v_normalized_email TEXT;
  v_normalized_phone TEXT;
  v_clean_first_name TEXT;
  v_clean_last_name TEXT;
  v_member_bookings_count INT := 0;
  v_trial_bookings_count INT := 0;
  v_total_occupied INT := 0;
  v_max_cap INT := 20;
  v_new_trial_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Validation des paramètres obligatoires
  IF p_class_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION', 'message', 'Identifiant de séance manquant.');
  END IF;

  v_clean_first_name := TRIM(COALESCE(p_first_name, ''));
  v_clean_last_name := TRIM(COALESCE(p_last_name, ''));
  v_normalized_email := LOWER(TRIM(COALESCE(p_email, '')));
  v_normalized_phone := regexp_replace(TRIM(COALESCE(p_phone, '')), '[^0-9+]', '', 'g');

  IF v_clean_first_name = '' OR v_clean_last_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'Veuillez renseigner votre nom et prénom.');
  END IF;

  IF v_normalized_email = '' OR v_normalized_email NOT LIKE '%_@__%.__%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_EMAIL', 'message', 'Veuillez renseigner une adresse email valide.');
  END IF;

  IF length(v_normalized_phone) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE', 'message', 'Veuillez renseigner un numéro de téléphone valide.');
  END IF;

  IF p_consent IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONSENT_REQUIRED', 'message', 'Veuillez accepter d''être contacté concernant votre cours d''essai.');
  END IF;

  -- 2. Verrouillage transactionnel pessimiste de la séance cible
  SELECT id, discipline, type, level, starts_at, ends_at, max_capacity, is_active
  INTO v_session
  FROM public.class_sessions
  WHERE id = p_class_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance introuvable. Veuillez actualiser la page.');
  END IF;

  IF v_session.is_active = FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_INACTIVE', 'message', 'Cette séance n''est plus active.');
  END IF;

  -- 3. Contrôle des dates (séance non passée, non terminée)
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_FINISHED', 'message', 'Cette séance est déjà terminée et ne peut plus être réservée.');
  END IF;

  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_STARTED', 'message', 'Cette séance a déjà commencé.');
  END IF;

  -- 4. Contrôle strict du type de séance (interdiction absolue des Cours Privés)
  IF v_session.type = 'private' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours privé%' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours prive%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRIVATE_SESSION_NOT_ALLOWED', 'message', 'Les cours privés individuels ne sont pas éligibles aux cours d''essai.');
  END IF;

  IF v_session.type NOT IN ('collective', 'small_group') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_TYPE', 'message', 'Ce type de séance n''est pas éligible aux cours d''essai.');
  END IF;

  -- 5. Contrôle anti-doublon sur la MÊME séance
  IF EXISTS (
    SELECT 1 FROM public.trial_bookings
    WHERE class_session_id = p_class_session_id
      AND status = 'confirmed'
      AND (
        LOWER(TRIM(email)) = v_normalized_email
        OR regexp_replace(phone, '[^0-9+]', '', 'g') = v_normalized_phone
      )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_BOOKED_THIS_SESSION',
      'message', 'Vous avez déjà réservé un cours d''essai pour cette séance.'
    );
  END IF;

  -- 6. Règle métier : 1 seul cours d'essai actif à venir par prospect
  IF EXISTS (
    SELECT 1 FROM public.trial_bookings tb
    JOIN public.class_sessions cs ON tb.class_session_id = cs.id
    WHERE tb.status = 'confirmed'
      AND cs.starts_at > v_now
      AND (
        LOWER(TRIM(tb.email)) = v_normalized_email
        OR regexp_replace(tb.phone, '[^0-9+]', '', 'g') = v_normalized_phone
      )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ACTIVE_TRIAL_ALREADY_EXISTS',
      'message', 'Vous avez déjà un cours d’essai réservé. Pour modifier votre créneau, veuillez contacter le club.'
    );
  END IF;

  -- 7. Contrôle de capacité cumulée (Membres + Essais)
  v_max_cap := COALESCE(v_session.max_capacity, CASE WHEN v_session.type = 'collective' THEN 35 ELSE 20 END);

  SELECT COUNT(id) INTO v_member_bookings_count
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  SELECT COUNT(id) INTO v_trial_bookings_count
  FROM public.trial_bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  v_total_occupied := v_member_bookings_count + v_trial_bookings_count;

  IF v_total_occupied >= v_max_cap THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_FULL',
      'message', 'Cette séance est complète (capacité maximale atteinte).'
    );
  END IF;

  -- 8. Insertion sécurisée de la réservation de cours d'essai
  INSERT INTO public.trial_bookings (
    class_session_id,
    first_name,
    last_name,
    email,
    phone,
    consent_contact,
    status,
    attendance_status,
    created_at,
    updated_at
  ) VALUES (
    p_class_session_id,
    v_clean_first_name,
    v_clean_last_name,
    v_normalized_email,
    p_phone,
    TRUE,
    'confirmed',
    'pending',
    v_now,
    v_now
  )
  RETURNING id INTO v_new_trial_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_trial_id,
    'session_id', p_class_session_id,
    'discipline', v_session.discipline,
    'starts_at', v_session.starts_at,
    'ends_at', v_session.ends_at,
    'first_name', v_clean_first_name,
    'last_name', v_clean_last_name,
    'email', v_normalized_email,
    'phone', p_phone,
    'message', 'Votre cours d''essai a été réservé avec succès.'
  );
END;
$$;

-- =============================================================================
-- 5. RPC ADMIN : ÉMARGEMENT ET GESTION DES ESSAIS
-- =============================================================================

-- 5.1 Émargement d'un cours d'essai par l'administrateur
CREATE OR REPLACE FUNCTION public.admin_mark_trial_attendance(
  p_trial_booking_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_attended_at TIMESTAMPTZ := NULL;
  v_target_status TEXT := 'confirmed';
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Action réservée aux administrateurs.');
  END IF;

  IF p_status NOT IN ('pending', 'present', 'absent', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Statut d''émargement invalide.');
  END IF;

  IF p_status = 'present' THEN
    v_attended_at := NOW();
    v_target_status := 'attended';
  ELSIF p_status = 'absent' THEN
    v_target_status := 'no_show';
  ELSIF p_status = 'cancelled' THEN
    v_target_status := 'cancelled';
  ELSE
    v_target_status := 'confirmed';
  END IF;

  UPDATE public.trial_bookings
  SET attendance_status = CASE WHEN p_status = 'cancelled' THEN 'absent' ELSE p_status END,
      status = v_target_status,
      attended_at = v_attended_at,
      updated_at = NOW()
  WHERE id = p_trial_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TRIAL_NOT_FOUND', 'message', 'Réservation d''essai introuvable.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'trial_booking_id', p_trial_booking_id,
    'attendance_status', p_status,
    'status', v_target_status,
    'attended_at', v_attended_at,
    'message', 'Émargement du cours d''essai enregistré.'
  );
END;
$$;

-- 5.2 Annulation administrative d'un cours d'essai
CREATE OR REPLACE FUNCTION public.admin_cancel_trial_booking(
  p_trial_booking_id UUID,
  p_reason TEXT DEFAULT NULL
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

  UPDATE public.trial_bookings
  SET status = 'cancelled',
      admin_notes = COALESCE(p_reason, admin_notes),
      updated_at = NOW()
  WHERE id = p_trial_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TRIAL_NOT_FOUND', 'message', 'Réservation d''essai introuvable.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'trial_booking_id', p_trial_booking_id,
    'message', 'Le cours d''essai a été annulé avec succès.'
  );
END;
$$;

-- =============================================================================
-- 6. MISE À JOUR DE CREATE_SMALL_GROUP_BOOKING (COMPTABILISATION DES TRIAL BOOKINGS)
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
  v_has_access BOOLEAN := FALSE;
  v_member_bookings_count INT := 0;
  v_trial_bookings_count INT := 0;
  v_total_occupied INT := 0;
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

  -- 5. Vérification de la capacité maximale cumulée (Membres + Essais)
  SELECT COUNT(id) INTO v_member_bookings_count
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  SELECT COUNT(id) INTO v_trial_bookings_count
  FROM public.trial_bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

  v_total_occupied := v_member_bookings_count + v_trial_bookings_count;

  IF v_total_occupied >= COALESCE(v_session.max_capacity, 20) THEN
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

-- =============================================================================
-- 7. ATTRIBUTION DES PRIVILÈGES D'EXÉCUTION
-- =============================================================================
REVOKE ALL ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_mark_trial_attendance(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_cancel_trial_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_trial_attendance(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_trial_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

