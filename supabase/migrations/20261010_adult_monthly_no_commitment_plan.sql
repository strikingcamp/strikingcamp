-- =============================================================================
-- Migration : 20261010_adult_monthly_no_commitment_plan.sql
-- Description : Évolution de l'offre à 89 € en formule adulte mensuelle sans engagement
--               - Mise à jour dans public.plans (code: 'discovery_monthly', commitment: 'monthly', tier: 'adult_monthly')
--               - Libellé officiel : 'Adulte — Sans engagement'
--               - RPC admin_approve_membership_request : gestion du renouvellement et de la prolongation intelligente
--               - RPC submit_membership_request : autorisation du renouvellement sans blocage d'abonnement actif
--               - RPC create_small_group_booking : préservation de l'accès illimité sans décompte de crédits
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. MISE À JOUR IDEMPOTENTE DU PLAN DANS PUBLIC.PLANS
-- =============================================================================

INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, badge_text
) VALUES (
  'discovery_monthly',
  'Adulte — Sans engagement',
  'small_group',
  'monthly',
  8900,
  3,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'adult_monthly',
  'Accès illimité aux cours adultes pendant 30 jours. Sans engagement de durée, renouvelable chaque mois.',
  'Sans engagement'
)
ON CONFLICT (code) DO UPDATE SET
  name = 'Adulte — Sans engagement',
  type = 'small_group',
  commitment = 'monthly',
  price_cents = 8900,
  display_order = 3,
  is_active = TRUE,
  allows_small_group = TRUE,
  allows_private = FALSE,
  allows_collective = FALSE,
  tier = 'adult_monthly',
  description = 'Accès illimité aux cours adultes pendant 30 jours. Sans engagement de durée, renouvelable chaque mois.',
  badge_text = 'Sans engagement',
  updated_at = NOW();

-- =============================================================================
-- 2. MISE À JOUR DE LA RPC SUBMIT_MEMBERSHIP_REQUEST
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_membership_request(
  p_plan_id UUID,
  p_commitment_type TEXT,
  p_member_notes TEXT DEFAULT NULL,
  p_selected_discipline TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_plan RECORD;
  v_new_request_id UUID;
  v_clean_discipline TEXT;
  v_has_active_diff_plan BOOLEAN := FALSE;
BEGIN
  -- A. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour faire une demande d''adhésion.'
    );
  END IF;

  -- B. Validation du type d'engagement
  IF p_commitment_type NOT IN ('monthly', 'annual') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_COMMITMENT',
      'message', 'Type d''engagement invalide (doit être "monthly" ou "annual").'
    );
  END IF;

  -- C. Vérification de l'existence et du statut de la formule
  SELECT id, code, name, type, tier, is_active
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF v_plan IS NULL OR v_plan.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La formule sélectionnée est introuvable ou inactive.'
    );
  END IF;

  -- D. Vérification : Aucune demande EN ATTENTE (pending) déjà existante
  IF EXISTS (
    SELECT 1 FROM public.membership_requests
    WHERE user_id = v_user_id
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PENDING_REQUEST_EXISTS',
      'message', 'Vous avez déjà une demande d''adhésion en cours d''examen par le club.'
    );
  END IF;

  -- E. Vérification des abonnements actifs existants
  -- Pour une formule mensuelle sans engagement (discovery_monthly) :
  -- - Si le membre a déjà un abonnement actif sur le MÊME plan, il est autorisé à demander un renouvellement anticipé.
  -- - Si le membre a un abonnement actif d'un plan DIFFÉRENT (ex: All Access annuel), il ne peut pas souscrire sans contacter le club.
  IF v_plan.code = 'discovery_monthly' OR v_plan.tier = 'adult_monthly' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_user_id
        AND plan_id <> p_plan_id
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at >= NOW())
    ) INTO v_has_active_diff_plan;

    IF v_has_active_diff_plan THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'OTHER_ACTIVE_SUBSCRIPTION_EXISTS',
        'message', 'Vous possédez déjà un abonnement actif pour une autre formule au club.'
      );
    END IF;
  ELSE
    -- Formules classiques (Essentiel, All Access, Lady Striking, Privés)
    IF EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_user_id
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at >= NOW())
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'ALREADY_HAVE_ACTIVE_SUBSCRIPTION',
        'message', 'Vous possédez déjà un abonnement actif au club.'
      );
    END IF;
  END IF;

  -- F. Nettoyage de la discipline si fournie
  v_clean_discipline := NULLIF(TRIM(p_selected_discipline), '');

  -- G. Insertion atomique de la demande
  INSERT INTO public.membership_requests (
    user_id,
    plan_id,
    status,
    commitment_type,
    selected_discipline,
    member_notes,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_plan_id,
    'pending',
    p_commitment_type,
    v_clean_discipline,
    p_member_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_new_request_id,
    'message', 'Votre demande d''adhésion a été transmise avec succès. Elle sera examinée par l''équipe du club.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role, postgres;

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
  v_now TIMESTAMPTZ := NOW();
  v_started_at TIMESTAMPTZ := NOW();
  v_ends_at TIMESTAMPTZ;
  v_quota INT;
  v_sub_id UUID;
  v_existing_active_sub RECORD;
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

  -- D. Traitement spécifique de la Formule Mensuelle Adulte Sans Engagement (89 €)
  IF v_plan.code = 'discovery_monthly' OR v_plan.tier = 'adult_monthly' OR v_plan.tier = 'discovery_pass' THEN
    -- Recherche d'un abonnement actif pour le MÊME plan non encore expiré
    SELECT id, started_at, ends_at
    INTO v_existing_active_sub
    FROM public.subscriptions
    WHERE user_id = v_req.user_id
      AND plan_id = v_req.plan_id
      AND status = 'active'
      AND ends_at > v_now
    ORDER BY ends_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_existing_active_sub IS NOT NULL THEN
      -- Renouvellement anticipé : prolongation de 30 jours à compter de la date de fin actuelle
      v_ends_at := v_existing_active_sub.ends_at + INTERVAL '30 days';
      v_sub_id := v_existing_active_sub.id;

      UPDATE public.subscriptions
      SET ends_at = v_ends_at,
          updated_at = v_now
      WHERE id = v_sub_id;
    ELSE
      -- Nouveau membre ou renouvellement après expiration : 30 jours à compter de maintenant
      v_started_at := v_now;
      v_ends_at := v_started_at + INTERVAL '30 days';

      INSERT INTO public.subscriptions (
        user_id,
        plan_id,
        status,
        started_at,
        ends_at,
        created_at,
        updated_at
      ) VALUES (
        v_req.user_id,
        v_req.plan_id,
        'active',
        v_started_at,
        v_ends_at,
        v_now,
        v_now
      )
      RETURNING id INTO v_sub_id;
    END IF;

  -- E. Traitement des formules régulières (Annuelles / Mensuelles privées)
  ELSE
    IF v_req.commitment_type = 'annual' THEN
      v_ends_at := v_started_at + INTERVAL '12 months';
    ELSE
      v_ends_at := v_started_at + INTERVAL '1 month';
    END IF;

    v_quota := COALESCE(v_plan.private_sessions_per_period, 8);

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
  END IF;

  -- F. Mise à jour du statut de la demande d'adhésion
  UPDATE public.membership_requests
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = v_admin_id,
      reviewed_at = v_now,
      updated_at = v_now
  WHERE id = p_request_id;

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'ends_at', v_ends_at,
    'message', 'Demande validée avec succès. Les droits d''accès du membre ont été activés/prolongés.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role;

-- =============================================================================
-- 4. RPC CREATE_SMALL_GROUP_BOOKING (Assurer la compatibilité adult_monthly)
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

    -- Cas 2 : Adulte All Access OU Adulte Sans Engagement (89 €) (accès illimité adulte)
    ELSIF v_plan_code IN ('adult_all_access', 'discovery_monthly', 'decouverte_1_mois', 'col_annual', 'sg_annual')
       OR v_sub.plan_tier IN ('adult_monthly', 'discovery_pass') THEN
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
    FOR UPDATE;

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
      'message', 'Vous ne disposez d''aucun abonnement actif, formule mensuelle ou crédit disponible pour réserver cette séance.'
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

  -- 9. DÉCRÉMENTATION DU CRÉDIT SI UTILISATION D'UN PACK (Les formules mensuelles ne consomment aucun crédit)
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

NOTIFY pgrst, 'reload schema';

COMMIT;
