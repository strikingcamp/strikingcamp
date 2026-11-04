-- =============================================================================
-- STRIKING CAMP — ÉVOLUTION DU MODULE SÉANCES D'ESSAI & LIEN D'ANNULATION
-- Migration: 20261105_trial_bookings_cancellation_token.sql
-- Date: 2026-11-05
--
-- OBJECTIFS :
-- 1. Ajout d'un jeton d'annulation unique (cancellation_token UUID) sur trial_bookings
-- 2. Création de la RPC publique sécurisée cancel_trial_booking_by_token
-- 3. Mise à jour de create_trial_booking :
--    - Génération et retour de cancellation_token
--    - Capacité maximale administrable (jusqu'à 100, suppression de la limite figée à 12)
--    - Contrôle strict de type de séance (exclusivement small_group)
--    - Protection anti-spam et limitation de fréquence (cooldown anti-flood)
--    - Message d'erreur harmonisé sans mention rigide de 12 places
-- 4. Mise à jour de create_small_group_booking :
--    - Comptabilisation unifiée des participants (bookings + trial_bookings) sous verrou
--    - Respect strict de la capacité maximale sans régression
-- 5. Préservation absolue de l'ensemble des fonctionnalités et règles adhérents existantes
-- =============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. AJOUT DE LA COLONNE cancellation_token SUR public.trial_bookings
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.trial_bookings
ADD COLUMN IF NOT EXISTS cancellation_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_bookings_cancellation_token
ON public.trial_bookings (cancellation_token);

CREATE INDEX IF NOT EXISTS idx_trial_bookings_cancellation_lookup
ON public.trial_bookings (cancellation_token, status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. RPC cancel_trial_booking_by_token (ANNULATION PAR LE PROSPECT)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.cancel_trial_booking_by_token(
  p_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
DECLARE
  v_booking RECORD;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Validation du jeton
  IF p_token IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TOKEN_MISSING',
      'message', 'Jeton d''annulation manquant ou invalide.'
    );
  END IF;

  -- 2. Recherche et verrouillage de la réservation d'essai
  SELECT id, class_session_id, first_name, last_name, email, phone, status, cancellation_token
  INTO v_booking
  FROM public.trial_bookings
  WHERE cancellation_token = p_token
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Réservation introuvable ou jeton d''annulation invalide.'
    );
  END IF;

  -- 3. Vérification de l'état actuel (protection contre double-annulation)
  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_cancelled', true,
      'error', 'ALREADY_CANCELLED',
      'message', 'Cette réservation a déjà été annulée précédemment.'
    );
  END IF;

  -- 4. Récupération des informations de la séance
  SELECT id, discipline, type, starts_at, ends_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  -- 5. Mise à jour atomique du statut
  UPDATE public.trial_bookings
  SET status = 'cancelled',
      updated_at = v_now
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'class_session_id', v_booking.class_session_id,
    'discipline', COALESCE(v_session.discipline, 'Cours d''essai'),
    'starts_at', v_session.starts_at,
    'ends_at', v_session.ends_at,
    'first_name', v_booking.first_name,
    'last_name', v_booking.last_name,
    'email', v_booking.email,
    'phone', v_booking.phone,
    'message', 'Votre cours d''essai a été annulé avec succès. Votre place a été libérée.'
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.cancel_trial_booking_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_trial_booking_by_token(UUID) TO anon, authenticated, service_role;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. RPC create_trial_booking AVEC RETOUR cancellation_token & PROTECTION ANTI-SPAM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
AS $func$
DECLARE
  v_session RECORD;
  v_normalized_email TEXT;
  v_normalized_phone TEXT;
  v_clean_first_name TEXT;
  v_clean_last_name TEXT;
  v_member_bookings_count INT := 0;
  v_trial_bookings_count INT := 0;
  v_total_occupied INT := 0;
  v_max_cap INT := 100;
  v_recent_attempts_count INT := 0;
  v_new_trial_id UUID;
  v_cancellation_token UUID;
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

  -- 2. Protection anti-spam et limitation de fréquence (cooldown anti-flood en base de données)
  -- Rejette les soumissions excessives (maximum 3 créations par heure pour le même email ou numéro)
  SELECT COUNT(id) INTO v_recent_attempts_count
  FROM public.trial_bookings
  WHERE (
    LOWER(TRIM(email)) = v_normalized_email
    OR regexp_replace(phone, '[^0-9+]', '', 'g') = v_normalized_phone
  )
  AND created_at > v_now - INTERVAL '1 hour';

  IF v_recent_attempts_count >= 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RATE_LIMIT_EXCEEDED',
      'message', 'Trop de demandes de réservation récentes. Veuillez patienter avant de réessayer ou contacter le club.'
    );
  END IF;

  -- 3. Verrouillage transactionnel pessimiste de la séance cible
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

  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_FINISHED', 'message', 'Cette séance est déjà terminée et ne peut plus être réservée.');
  END IF;

  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_STARTED', 'message', 'Cette séance a déjà commencé.');
  END IF;

  -- 4. Contrôle strict du type de séance : réservé aux séances Small Group / Cours Adulte
  IF v_session.type = 'private' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours privé%' OR LOWER(COALESCE(v_session.discipline, '')) LIKE '%cours prive%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRIVATE_SESSION_NOT_ALLOWED', 'message', 'Les cours privés individuels ne sont pas éligibles aux cours d''essai.');
  END IF;

  IF v_session.type IS DISTINCT FROM 'small_group' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_TYPE', 'message', 'Ce type de séance n''est pas éligible aux cours d''essai.');
  END IF;

  -- 5. Contrôle de l'état d'activation du service Small Group
  IF NOT public.is_service_active('small_group') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service Cours Adulte est actuellement désactivé et indisponible à la réservation.'
    );
  END IF;

  -- 6. Contrôle anti-doublon sur la MÊME séance
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

  -- 7. Règle métier : 1 seul cours d'essai actif à venir par prospect
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

  -- 8. Calcul d'occupation sous verrou (capacité administrable de session, sans limite rigide à 12)
  v_max_cap := COALESCE(v_session.max_capacity, 100);

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

  -- 9. Génération du token et insertion de la réservation d'essai
  v_cancellation_token := gen_random_uuid();

  INSERT INTO public.trial_bookings (
    class_session_id,
    first_name,
    last_name,
    email,
    phone,
    consent_contact,
    status,
    cancellation_token,
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
    v_cancellation_token,
    v_now,
    v_now
  )
  RETURNING id INTO v_new_trial_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_trial_id,
    'cancellation_token', v_cancellation_token,
    'discipline', v_session.discipline,
    'type', v_session.type,
    'starts_at', v_session.starts_at,
    'ends_at', v_session.ends_at,
    'first_name', v_clean_first_name,
    'last_name', v_clean_last_name,
    'email', v_normalized_email,
    'phone', v_normalized_phone,
    'message', 'Votre réservation de cours d''essai est confirmée.'
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trial_booking(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO postgres, service_role, authenticated, anon;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. MISE À JOUR DE create_small_group_booking : COMPTABILISATION COMPLÈTE & RÈGLES ADHÉRENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.create_small_group_booking(
  p_class_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_sub RECORD;
  v_plan_code TEXT;
  v_chosen_discipline TEXT;
  v_user_birth_date DATE;
  v_member_age INT;
  v_has_sub_access BOOLEAN := FALSE;
  v_available_credits INT := 0;
  v_credit_pack_id UUID := NULL;
  v_new_booking_id UUID;
  v_current_participants INT;
  v_max_capacity INT;
  v_booking_type TEXT;
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_weekly_bookings_count INT;
  v_is_lady_discipline BOOLEAN := FALSE;
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

  -- 2. Récupération de la séance avec verrou pour concurrence
  SELECT id, discipline, category, target_age_group, starts_at, ends_at, max_capacity, is_active
  INTO v_session
  FROM public.class_sessions
  WHERE id = p_class_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_NOT_FOUND',
      'message', 'Séance introuvable.'
    );
  END IF;

  IF v_session.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_INACTIVE',
      'message', 'Cette séance a été annulée ou n''est plus active.'
    );
  END IF;

  IF v_session.ends_at IS NOT NULL AND NOW() >= v_session.ends_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée.'
    );
  END IF;

  IF v_session.starts_at <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_PAST',
      'message', 'Impossible de réserver une séance déjà commencée ou passée.'
    );
  END IF;

  -- 3. Vérification de doublon de réservation
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE user_id = v_user_id
      AND class_session_id = p_class_session_id
      AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_BOOKED',
      'message', 'Vous êtes déjà inscrit à cette séance.'
    );
  END IF;

  -- 4. Récupération du profil utilisateur (notamment date de naissance)
  SELECT birth_date INTO v_user_birth_date
  FROM public.profiles
  WHERE id = v_user_id;

  -- 5. ÉTAPE 1 : VÉRIFICATION PRIORITAIRE DES ABONNEMENTS ET PASSES ACTIFS
  FOR v_sub IN
    SELECT s.id AS sub_id, s.selected_discipline, s.ends_at, p.id AS plan_id, p.code AS plan_code, p.name AS plan_name,
           p.type AS plan_type, p.tier AS plan_tier, p.allows_small_group, p.allows_private
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at >= v_session.starts_at)
  LOOP
    v_plan_code := LOWER(COALESCE(v_sub.plan_code, ''));

    -- Cas 1 : Adulte Essentiel (399 € / an)
    IF v_plan_code = 'adult_essential' THEN
      v_chosen_discipline := COALESCE(v_sub.selected_discipline, '');
      IF v_chosen_discipline = '' THEN
        SELECT discipline INTO v_chosen_discipline
        FROM public.subscription_discipline_choices
        WHERE subscription_id = v_sub.sub_id;
      END IF;

      IF v_chosen_discipline IS NOT NULL AND TRIM(v_chosen_discipline) <> '' THEN
        v_is_lady_discipline := LOWER(v_chosen_discipline) LIKE '%lady%';

        -- A. Essentiel avec Lady Striking choisi -> autoriser uniquement séances Lady Striking
        IF v_is_lady_discipline THEN
          IF v_session.category = 'lady_striking' OR LOWER(v_session.discipline) LIKE '%lady%' THEN
            v_week_start := date_trunc('week', v_session.starts_at AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';
            v_week_end := v_week_start + INTERVAL '7 days';

            SELECT COUNT(b.id) INTO v_weekly_bookings_count
            FROM public.bookings b
            JOIN public.class_sessions cs ON b.class_session_id = cs.id
            WHERE b.user_id = v_user_id
              AND b.status = 'confirmed'
              AND cs.starts_at >= v_week_start
              AND cs.starts_at < v_week_end;

            IF v_weekly_bookings_count < 3 THEN
              v_has_sub_access := TRUE;
              EXIT;
            END IF;
          END IF;

        -- B. Essentiel avec autre discipline (Kick, Boxe Thaï, Anglaise, etc.) -> cours adultes mixtes uniquement
        ELSE
          IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte'
             AND COALESCE(v_session.category, 'cours_adulte') <> 'lady_striking'
             AND LOWER(v_session.discipline) NOT LIKE '%lady%'
             AND LOWER(TRIM(v_session.discipline)) = LOWER(TRIM(v_chosen_discipline)) THEN

            v_week_start := date_trunc('week', v_session.starts_at AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';
            v_week_end := v_week_start + INTERVAL '7 days';

            SELECT COUNT(b.id) INTO v_weekly_bookings_count
            FROM public.bookings b
            JOIN public.class_sessions cs ON b.class_session_id = cs.id
            WHERE b.user_id = v_user_id
              AND b.status = 'confirmed'
              AND cs.starts_at >= v_week_start
              AND cs.starts_at < v_week_end;

            IF v_weekly_bookings_count < 3 THEN
              v_has_sub_access := TRUE;
              EXIT;
            END IF;
          END IF;
        END IF;
      END IF;

    -- Cas 2 : Adulte All Access OU Adulte Sans Engagement (89 €) (accès illimité adulte, hors Lady Striking et Kid Boxing)
    ELSIF v_plan_code IN ('adult_all_access', 'discovery_monthly', 'decouverte_1_mois', 'col_annual', 'sg_annual')
       OR v_sub.plan_tier IN ('adult_monthly', 'discovery_pass') THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte'
         AND COALESCE(v_session.category, 'cours_adulte') <> 'lady_striking'
         AND LOWER(v_session.discipline) NOT LIKE '%lady%' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;

    -- Cas 3 : Plan historique Lady Striking ('lady_striking_annual')
    ELSIF v_plan_code = 'lady_striking_annual' OR LOWER(v_sub.plan_name) LIKE '%lady%' THEN
      IF v_session.category = 'lady_striking' OR LOWER(v_session.discipline) LIKE '%lady%' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;

    -- Cas 4 : Kid Boxing
    ELSIF v_plan_code = 'kid_boxing_season' OR LOWER(v_sub.plan_name) LIKE '%kid%' THEN
      IF v_session.category = 'kid_boxing' OR LOWER(v_session.discipline) LIKE '%kid%' THEN
        IF v_user_birth_date IS NOT NULL THEN
          v_member_age := EXTRACT(YEAR FROM age(v_session.starts_at::date, v_user_birth_date))::INT;
          IF (v_session.target_age_group = '5_8' AND (v_member_age < 5 OR v_member_age > 8)) OR
             (v_session.target_age_group = '9_13' AND (v_member_age < 9 OR v_member_age > 13)) THEN
            -- Âge non conforme
          ELSE
            v_has_sub_access := TRUE;
            EXIT;
          END IF;
        ELSE
          v_has_sub_access := TRUE;
          EXIT;
        END IF;
      END IF;

    -- Cas 5 : Formules Privées (incluent l'accès aux cours collectifs adultes)
    ELSIF v_sub.allows_private = TRUE OR v_sub.plan_type = 'private' THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte'
         AND COALESCE(v_session.category, 'cours_adulte') <> 'lady_striking'
         AND LOWER(v_session.discipline) NOT LIKE '%lady%' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- 6. ÉTAPE 2 : SI AUCUN ABONNEMENT COUVRANT, VÉRIFICATION DES CRÉDITS (FIFO)
  IF NOT v_has_sub_access THEN
    -- Sélection du premier pack de crédits actif non expiré
    SELECT id INTO v_credit_pack_id
    FROM public.member_session_credits
    WHERE user_id = v_user_id
      AND status = 'active'
      AND remaining_credits > 0
      AND (expires_at IS NULL OR expires_at >= v_session.starts_at)
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_credit_pack_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'NO_VALID_SUBSCRIPTION_OR_CREDITS',
        'message', 'Aucun abonnement actif ni crédit disponible pour réserver ce créneau.'
      );
    END IF;
  END IF;

  -- 7. ÉTAPE 3 : VÉRIFICATION DE LA CAPACITÉ MAXIMALE DU CRÉNEAU (Membres + Essais)
  v_max_capacity := COALESCE(v_session.max_capacity, 100);

  SELECT COUNT(id) INTO v_current_participants
  FROM (
    SELECT id FROM public.bookings
    WHERE class_session_id = p_class_session_id
      AND status = 'confirmed'
    UNION ALL
    SELECT id FROM public.trial_bookings
    WHERE class_session_id = p_class_session_id
      AND status = 'confirmed'
  ) total_occupied;

  IF v_current_participants >= v_max_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_FULL',
      'message', 'Cette séance est complète.'
    );
  END IF;

  -- 8. ÉTAPE 4 : CRÉATION ATOMIQUE DE LA RÉSERVATION
  v_booking_type := CASE WHEN v_has_sub_access THEN 'subscription' ELSE 'credit' END;

  INSERT INTO public.bookings (
    user_id,
    class_session_id,
    status,
    booking_type,
    credit_pack_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_class_session_id,
    'confirmed',
    v_booking_type,
    v_credit_pack_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_booking_id;

  -- 9. ÉTAPE 5 : DÉCOMPTE DU CRÉDIT ET INSERTION DE LA TRANSACTION SI UTILISATION DE CRÉDIT
  IF NOT v_has_sub_access AND v_credit_pack_id IS NOT NULL THEN
    UPDATE public.member_session_credits
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 = 0 THEN 'exhausted' ELSE status END,
        updated_at = NOW()
    WHERE id = v_credit_pack_id;

    INSERT INTO public.session_credit_transactions (
      credit_pack_id,
      booking_id,
      user_id,
      delta,
      transaction_type,
      reason
    ) VALUES (
      v_credit_pack_id,
      v_new_booking_id,
      v_user_id,
      -1,
      'usage',
      'Réservation séance Small Group : ' || v_session.discipline
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'booking_type', v_booking_type,
    'used_credit', NOT v_has_sub_access,
    'message', 'Réservation confirmée avec succès !'
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
