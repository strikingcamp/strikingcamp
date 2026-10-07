-- =============================================================================
-- Migration : 20261009_discovery_monthly_plan.sql
-- Description : Ajout de l'offre « 1 Mois Découverte » (89 € - Accès illimité 30 jours)
--               - Insertion dans public.plans (code: 'discovery_monthly', commitment: 'once', tier: 'discovery_pass')
--               - Mise à jour de la RPC create_small_group_booking (accès illimité cours adultes sur la durée active de 30 jours)
--               - Mise à jour de la RPC admin_approve_membership_request (calcul exact de 30 jours pour discovery_pass)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. INSERTION IDEMPOTENTE DU PLAN DANS PUBLIC.PLANS
-- =============================================================================

INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, badge_text
) VALUES (
  'discovery_monthly',
  '1 Mois Découverte',
  'small_group',
  'once',
  8900,
  8,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'discovery_pass',
  'Accès illimité aux cours adultes pendant 30 jours. Offre découverte unique sans engagement.',
  'Accès illimité'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  commitment = EXCLUDED.commitment,
  price_cents = EXCLUDED.price_cents,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  allows_small_group = TRUE,
  allows_private = FALSE,
  allows_collective = FALSE,
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  badge_text = EXCLUDED.badge_text,
  updated_at = NOW();

-- =============================================================================
-- 2. MISE À JOUR DE LA RPC CREATE_SMALL_GROUP_BOOKING
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
  v_member_bookings_count INT := 0;
  v_trial_bookings_count INT := 0;
  v_total_occupied INT := 0;
  v_new_booking_id UUID;
  v_now TIMESTAMPTZ := NOW();

  -- Vérification abonnements
  v_has_sub_access BOOLEAN := FALSE;
  v_sub RECORD;
  v_plan_code TEXT;
  v_user_birth_date DATE;
  v_member_age INT;
  v_chosen_discipline TEXT;
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_weekly_bookings_count INT := 0;

  -- Vérification packs de crédits
  v_pack RECORD;
  v_credit_pack_id UUID := NULL;
  v_has_credit_pack BOOLEAN := FALSE;
  v_remaining_credits INT;
BEGIN
  -- 0. Vérification du statut global du service Small Group
  IF NOT public.is_service_active('small_group') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVICE_UNAVAILABLE',
      'message', 'Le service de cours collectifs est actuellement désactivé.'
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

  -- 2. Verrouillage exclusif de la séance cible
  SELECT id, discipline, type, category, target_age_group, starts_at, ends_at, max_capacity, is_active
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

  -- Règle temporelle stricte : fin de séance
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée et ne peut plus être réservée.'
    );
  END IF;

  -- Règle temporelle stricte : début de séance
  IF v_session.starts_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_STARTED',
      'message', 'Cette séance est déjà commencée.'
    );
  END IF;

  -- 3. Vérification anti-doublon
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_session_id = p_class_session_id
      AND user_id = v_user_id
      AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_BOOKED', 'message', 'Vous êtes déjà inscrit à cette séance.');
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

    -- Cas 1 : Adulte Essentiel
    IF v_plan_code = 'adult_essential' THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_chosen_discipline := COALESCE(v_sub.selected_discipline, '');
        IF v_chosen_discipline = '' THEN
          SELECT discipline INTO v_chosen_discipline
          FROM public.subscription_discipline_choices
          WHERE subscription_id = v_sub.sub_id;
        END IF;

        IF v_chosen_discipline IS NOT NULL AND TRIM(v_chosen_discipline) <> '' THEN
          IF LOWER(TRIM(v_session.discipline)) = LOWER(TRIM(v_chosen_discipline)) THEN
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

    -- Cas 2 : Adulte All Access OU 1 Mois Découverte (accès illimité adulte)
    ELSIF v_plan_code IN ('adult_all_access', 'discovery_monthly', 'decouverte_1_mois', 'col_annual', 'sg_annual')
       OR v_sub.plan_tier = 'discovery_pass' THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;

    -- Cas 3 : Lady Striking
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

    -- Cas 5 : Formules Privées avec accès Small Group
    ELSIF v_sub.allows_small_group = TRUE OR v_sub.allows_private = TRUE THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- 6. ÉTAPE 2 : SI AUCUN ABONNEMENT COUVRANT, RECHERCHE D'UN PACK DE CRÉDITS (FIFO)
  IF NOT v_has_sub_access THEN
    -- Mettre à jour les packs expirés au passage
    UPDATE public.member_session_credits
    SET status = 'expired', updated_at = NOW()
    WHERE user_id = v_user_id
      AND status = 'active'
      AND expires_at < v_now;

    -- Recherche du pack actif avec expiration la plus proche (FIFO) couvrant la date de la séance
    SELECT id, remaining_credits, total_credits, expires_at
    INTO v_pack
    FROM public.member_session_credits
    WHERE user_id = v_user_id
      AND status = 'active'
      AND remaining_credits > 0
      AND expires_at >= v_session.starts_at
    ORDER BY expires_at ASC, created_at ASC
    LIMIT 1
    FOR UPDATE; -- Verrouillage de concurrence strict !

    IF v_pack IS NOT NULL AND v_pack.remaining_credits > 0 THEN
      v_has_credit_pack := TRUE;
      v_credit_pack_id := v_pack.id;
      v_remaining_credits := v_pack.remaining_credits - 1;
    END IF;
  END IF;

  -- 7. VÉRIFICATION FINALE DES DROITS
  IF NOT v_has_sub_access AND NOT v_has_credit_pack THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ACCESS_OR_CREDITS',
      'message', 'Vous ne disposez d''aucun abonnement actif, pass découverte ou crédit disponible pour réserver cette séance.'
    );
  END IF;

  -- 8. VÉRIFICATION DE LA CAPACITÉ MAXIMALE DU COURS (12 PLACES)
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_FULL',
      'message', 'Cette séance est complète (capacité maximale de ' || COALESCE(v_session.max_capacity, 12) || ' places atteinte).'
    );
  END IF;

  -- 9. DÉCRÉMENTATION DU CRÉDIT SI UTILISATION D'UN PACK (Les abonnements et 1 Mois Découverte ne consomment pas de crédit)
  IF v_has_credit_pack THEN
    UPDATE public.member_session_credits
    SET remaining_credits = v_remaining_credits,
        status = CASE WHEN v_remaining_credits = 0 THEN 'exhausted' ELSE 'active' END,
        updated_at = v_now
    WHERE id = v_credit_pack_id;
  END IF;

  -- 10. INSERTION DE LA RÉSERVATION
  INSERT INTO public.bookings (
    user_id,
    class_session_id,
    credit_pack_id,
    status,
    attendance_status,
    is_late_cancellation,
    created_at
  ) VALUES (
    v_user_id,
    p_class_session_id,
    v_credit_pack_id,
    'confirmed',
    'pending',
    FALSE,
    v_now
  )
  RETURNING id INTO v_new_booking_id;

  -- 11. ENREGISTREMENT DE LA TRANSACTION D'AUDIT
  IF v_has_credit_pack THEN
    INSERT INTO public.session_credit_transactions (
      credit_pack_id,
      user_id,
      booking_id,
      delta,
      transaction_type,
      reason,
      created_at
    ) VALUES (
      v_credit_pack_id,
      v_user_id,
      v_new_booking_id,
      -1,
      'booking_debit',
      'Réservation séance ' || v_session.discipline,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'used_credit', v_has_credit_pack,
    'credit_pack_id', v_credit_pack_id,
    'remaining_credits', v_remaining_credits,
    'message', 'Réservation confirmée avec succès.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_group_booking(UUID) TO authenticated, service_role;

-- =============================================================================
-- 3. MISE À JOUR DE LA RPC ADMIN_APPROVE_MEMBERSHIP_REQUEST
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_membership_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id UUID;
  v_req RECORD;
  v_plan RECORD;
  v_started_at TIMESTAMPTZ := NOW();
  v_ends_at TIMESTAMPTZ;
  v_quota INT;
  v_sub_id UUID;
BEGIN
  -- A. Vérification des droits administrateur
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  v_admin_id := auth.uid();

  -- B. Récupération et verrouillage de la demande
  SELECT id, user_id, plan_id, status, commitment_type, selected_discipline
  INTO v_req
  FROM public.membership_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_FOUND',
      'message', 'Demande d''adhésion introuvable.'
    );
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_PENDING',
      'message', 'Cette demande n''est plus en attente (statut actuel: ' || v_req.status || ').'
    );
  END IF;

  -- C. Récupération de la formule
  SELECT id, code, name, type, tier, private_sessions_per_period
  INTO v_plan
  FROM public.plans
  WHERE id = v_req.plan_id;

  -- D. Calcul des dates de validité
  -- 1 Mois Découverte (accès illimité 30 jours)
  IF v_plan.code = 'discovery_monthly' OR v_plan.tier = 'discovery_pass' THEN
    v_ends_at := v_started_at + INTERVAL '30 days';
  ELSIF v_req.commitment_type = 'annual' THEN
    v_ends_at := v_started_at + INTERVAL '12 months';
  ELSE
    -- Mensuel classique renouvelable
    v_ends_at := v_started_at + INTERVAL '1 month';
  END IF;

  v_quota := COALESCE(v_plan.private_sessions_per_period, 8);

  -- E. Création de l'abonnement actif dans public.subscriptions
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    ends_at,
    private_sessions_quota,
    selected_discipline,
    created_at,
    updated_at
  ) VALUES (
    v_req.user_id,
    v_req.plan_id,
    'active',
    v_started_at,
    v_ends_at,
    CASE WHEN v_plan.type = 'private' THEN v_quota ELSE NULL END,
    v_req.selected_discipline,
    v_started_at,
    v_started_at
  )
  RETURNING id INTO v_sub_id;

  -- F. Mise à jour du statut de la demande
  UPDATE public.membership_requests
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = v_admin_id,
      reviewed_at = v_started_at,
      updated_at = v_started_at
  WHERE id = p_request_id;

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'message', 'Demande validée avec succès. L''abonnement / pass actif du membre a été créé.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
