-- =============================================================================
-- Migration : 20260908_trial_booking_service_settings_check.sql
-- Description : Renforcement de la sécurité backend dans create_trial_booking
--               Vérifie que le service Small Group est actif dans public.service_settings
--               avant d'autoriser toute nouvelle réservation d'essai de type 'small_group'.
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

  -- 7. Contrôle de capacité cumulée (Membres + Essais) uniquement pour Small Group
  IF v_session.type = 'small_group' THEN
    v_max_cap := COALESCE(v_session.max_capacity, 20);

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

GRANT EXECUTE ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO postgres, service_role, authenticated, anon;
