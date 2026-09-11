-- =============================================================================
-- STRIKING CAMP — MIGRATION : 20260911_update_small_group_capacity_to_12.sql
-- Description : Ajustement de la capacité maximale des Small Group de 20 à 12 personnes.
--               - Mise à jour des templates récurrents (type = 'small_group')
--               - Mise à jour des séances physiques actives (type = 'small_group')
--               - Mise à jour de la description du service small_group dans service_settings
--               - Mise à jour des RPCs create_small_group_booking et create_trial_booking (fallback = 12)
-- =============================================================================

BEGIN;

-- 1. Mise à jour des modèles de planning récurrents pour le Small Group
UPDATE public.recurring_schedule_templates
SET max_capacity = 12
WHERE type = 'small_group';

-- 2. Mise à jour des séances physiques actives du Small Group
UPDATE public.class_sessions
SET max_capacity = 12
WHERE type = 'small_group'
  AND is_active = TRUE;

-- 3. Mise à jour de la description du service Small Group
UPDATE public.service_settings
SET description = 'Cours en petit groupe avec capacité limitée à 12 personnes.'
WHERE service_key = 'small_group';

-- 4. Redéfinition sécurisée de create_small_group_booking avec fallback 12
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

  -- 5. Vérification de la capacité maximale cumulée (Membres + Essais, règle Small Group = 12 places)
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

-- 5. Redéfinition sécurisée de create_trial_booking avec fallback 12 pour Small Group
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
  v_max_cap INT := 12;
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

  -- 4.bis Contrôle de l'état d'activation du service Small Group (Source unique de vérité : service_settings)
  IF v_session.type = 'small_group' AND NOT public.is_service_active('small_group') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service Small Group est actuellement désactivé et indisponible à la réservation.'
    );
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

  -- 7. Contrôle de capacité cumulée (Membres + Essais) uniquement pour Small Group (12 places max)
  IF v_session.type = 'small_group' THEN
    v_max_cap := COALESCE(v_session.max_capacity, 12);

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
        'message', 'Cette séance Small Group est complète (capacité maximale atteinte).'
      );
    END IF;
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
    'message', 'Cours d''essai réservé avec succès.'
  );
END;
$$;

-- 6. Privilèges d'exécution
REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO postgres, service_role, authenticated, anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
