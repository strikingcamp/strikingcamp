-- =============================================================================
-- Migration: Séances d'essai Small Group & Harmonisation des durées (60 min / 50 min Cardio) et Boxe anglaise
-- Date: 2026-09-24
-- Description:
--   1. Renommage sémantique de la discipline 'Boxing' en 'Boxe anglaise' (sans toucher à 'Boxing Bag')
--   2. Inscription / mise à jour des 3 créneaux types récurrents Small Group pour les cours d'essai :
--      - Mardi 18:00 → 19:00 : Kick Boxing (Small Group, max 12)
--      - Vendredi 18:00 → 19:00 : Boxe Thaï (Small Group, max 12)
--      - Samedi 09:00 → 10:00 : Boxe anglaise (Small Group, max 12)
--   3. Harmonisation des durées dans recurring_schedule_templates :
--      - 50 minutes exclusivement pour les séances CARDIO (level ou discipline Cardio)
--      - 60 minutes par défaut pour toutes les autres séances Small Group et Collectives
--   4. Harmonisation des séances futures dans class_sessions (starts_at >= NOW()) :
--      - ends_at = starts_at + 50 min pour le Cardio
--      - ends_at = starts_at + 60 min pour les autres séances
--   5. Sécurisation de create_trial_booking :
--      - Restriction absolue aux séances de type 'small_group'
--      - Rejet strict des séances collectives ('collective') ou privées
--      - Vérification du statut actif du service 'small_group'
--      - Capacité max Small Group (12 places)
--   6. Synchronisation immédiate du planning via generate_recurring_schedule
-- =============================================================================

BEGIN;

-- 1. Renommage sémantique précis de la discipline 'Boxing' -> 'Boxe anglaise' (préservation stricte de 'Boxing Bag')
UPDATE public.recurring_schedule_templates
SET discipline = 'Boxe anglaise',
    updated_at = NOW()
WHERE discipline = 'Boxing'
  AND discipline NOT ILIKE '%bag%';

UPDATE public.class_sessions
SET discipline = 'Boxe anglaise'
WHERE discipline = 'Boxing'
  AND discipline NOT ILIKE '%bag%';

-- 2. Inscription / mise à jour des templates de créneaux Small Group d'essai (durée 60 minutes)
INSERT INTO public.recurring_schedule_templates (
  day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active
) VALUES
  -- Mardi 18:00 → 19:00 - Kick Boxing - Small Group
  (1, TIME '18:00:00', TIME '19:00:00', 'small_group', 'Kick Boxing', 'Fondamentaux', 12, TRUE),
  -- Vendredi 18:00 → 19:00 - Boxe Thaï - Small Group
  (4, TIME '18:00:00', TIME '19:00:00', 'small_group', 'Boxe Thaï', 'Fondamentaux', 12, TRUE),
  -- Samedi 09:00 → 10:00 - Boxe anglaise - Small Group
  (5, TIME '09:00:00', TIME '10:00:00', 'small_group', 'Boxe anglaise', 'Fondamentaux', 12, TRUE)
ON CONFLICT (day_of_week, start_time, type, discipline)
DO UPDATE SET
  end_time = EXCLUDED.end_time,
  level = EXCLUDED.level,
  max_capacity = EXCLUDED.max_capacity,
  is_active = TRUE,
  updated_at = NOW();

-- 3. Harmonisation des durées dans recurring_schedule_templates
-- A. Séances non-cardio (Small Group & Collectifs) : 60 minutes
UPDATE public.recurring_schedule_templates
SET end_time = (start_time + INTERVAL '60 minutes')::TIME,
    updated_at = NOW()
WHERE type IN ('small_group', 'collective')
  AND (level IS NULL OR level NOT ILIKE '%cardio%')
  AND (discipline NOT ILIKE '%cardio%');

-- B. Séances CARDIO : 50 minutes
UPDATE public.recurring_schedule_templates
SET end_time = (start_time + INTERVAL '50 minutes')::TIME,
    updated_at = NOW()
WHERE type IN ('small_group', 'collective')
  AND (
    (level IS NOT NULL AND level ILIKE '%cardio%')
    OR (discipline ILIKE '%cardio%')
  );

-- 4. Mise à jour de ends_at pour toutes les séances futures dans class_sessions
-- A. Séances non-cardio (Small Group & Collectifs) : 60 minutes
UPDATE public.class_sessions
SET ends_at = starts_at + INTERVAL '60 minutes'
WHERE type IN ('small_group', 'collective')
  AND starts_at >= DATE_TRUNC('day', NOW())
  AND (level IS NULL OR level NOT ILIKE '%cardio%')
  AND (discipline NOT ILIKE '%cardio%');

-- B. Séances CARDIO : 50 minutes
UPDATE public.class_sessions
SET ends_at = starts_at + INTERVAL '50 minutes'
WHERE type IN ('small_group', 'collective')
  AND starts_at >= DATE_TRUNC('day', NOW())
  AND (
    (level IS NOT NULL AND level ILIKE '%cardio%')
    OR (discipline ILIKE '%cardio%')
  );

-- 5. Mise à jour de create_trial_booking pour interdire toute réservation d'essai collective
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

  -- 4. Contrôle strict du type de séance : STRICTEMENT RÉSERVÉ AU SMALL GROUP
  IF v_session.type = 'private' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours privé%' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours prive%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRIVATE_SESSION_NOT_ALLOWED', 'message', 'Les cours privés individuels ne sont pas éligibles aux cours d''essai.');
  END IF;

  IF v_session.type = 'collective' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'COLLECTIVE_TRIAL_NOT_ALLOWED',
      'message', 'Les cours collectifs ne sont plus disponibles en séance d''essai. Les cours d''essai ont lieu exclusivement en Small Group (Mardi 18:00 Kick Boxing, Vendredi 18:00 Boxe Thaï ou Samedi 09:00 Boxe anglaise).'
    );
  END IF;

  IF v_session.type <> 'small_group' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_TYPE', 'message', 'Ce type de séance n''est pas éligible aux cours d''essai.');
  END IF;

  -- 4.bis Contrôle de l'état d'activation du service Small Group
  IF NOT public.is_service_active('small_group') THEN
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

  -- 7. Calcul d'occupation sous verrou pour Small Group (12 places max)
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
      'message', 'Cette séance Small Group est complète (capacité maximale de 12 places atteinte).'
    );
  END IF;

  -- 8. Insertion de la réservation d'essai
  INSERT INTO public.trial_bookings (
    class_session_id,
    first_name,
    last_name,
    email,
    phone,
    consent_contact,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_class_session_id,
    v_clean_first_name,
    v_clean_last_name,
    v_normalized_email,
    v_normalized_phone,
    TRUE,
    'confirmed',
    v_now,
    v_now
  )
  RETURNING id INTO v_new_trial_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_trial_id,
    'discipline', v_session.discipline,
    'type', v_session.type,
    'starts_at', v_session.starts_at,
    'ends_at', v_session.ends_at,
    'first_name', v_clean_first_name,
    'last_name', v_clean_last_name,
    'email', v_normalized_email,
    'phone', v_normalized_phone,
    'message', 'Votre réservation de cours d''essai Small Group est confirmée.'
  );
END;
$$;

-- Privilèges
REVOKE ALL ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO postgres, service_role, authenticated, anon;

-- 6. Synchronisation et instanciation du planning dynamique
SELECT public.generate_recurring_schedule((DATE_TRUNC('week', CURRENT_DATE)::DATE), 13);

NOTIFY pgrst, 'reload schema';

COMMIT;
