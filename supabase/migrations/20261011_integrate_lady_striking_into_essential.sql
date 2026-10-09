-- =============================================================================
-- Migration : 20261011_integrate_lady_striking_into_essential.sql
-- Description : Intégration de la discipline Lady Striking dans la formule Essentiel (399 € / an)
--               - Désactivation sécurisée du plan public indépendant 'lady_striking_annual' (sans DELETE)
--               - Alignement du tarif 'adult_essential' à 399 € / an (39900 cents)
--               - Mise à jour de la RPC create_small_group_booking :
--                   * Adulte Essentiel avec discipline 'Lady Striking' -> accès aux créneaux lady_striking (max 3/sem)
--                   * Adulte Essentiel avec autre discipline (Kick, Boxe Thaï, Anglaise...) -> refus des créneaux lady_striking
--                   * All Access / Sans engagement -> conservation du refus des cours 100% féminins Lady Striking
--                   * Conservation de la rétrocompatibilité des abonnements historiques
-- =============================================================================

BEGIN;

-- 1. Désactivation sécurisée du plan indépendant Lady Striking dans le catalogue public
UPDATE public.plans
SET is_active = FALSE,
    updated_at = NOW()
WHERE code = 'lady_striking_annual';

-- 2. Mise à jour / Alignement du tarif Essentiel à 399 € / an (39900 cents)
UPDATE public.plans
SET price_cents = 39900,
    updated_at = NOW()
WHERE code = 'adult_essential';

-- =============================================================================
-- 3. MISE À JOUR DE LA RPC CREATE_SMALL_GROUP_BOOKING
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
             AND v_session.category <> 'lady_striking'
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
         AND v_session.category <> 'lady_striking'
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
         AND v_session.category <> 'lady_striking'
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

  -- 7. ÉTAPE 3 : VÉRIFICATION DE LA CAPACITÉ MAXIMALE DU CRÉNEAU
  v_max_capacity := COALESCE(v_session.max_capacity, 12);

  SELECT COUNT(id) INTO v_current_participants
  FROM public.bookings
  WHERE class_session_id = p_class_session_id
    AND status = 'confirmed';

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

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'booking_type', v_booking_type,
    'used_credit', NOT v_has_sub_access,
    'message', 'Réservation confirmée avec succès !'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
