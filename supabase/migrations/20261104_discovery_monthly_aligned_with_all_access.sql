-- =============================================================================
-- Migration : 20261104_discovery_monthly_aligned_with_all_access.sql
-- Description : Finalisation complète de l'offre « Adulte — Sans engagement » (89 €/mois).
--
-- RÈGLE COMMERCIALE STRICTE :
-- L'offre discovery_monthly à 89 €/mois sans engagement donne EXACTEMENT
-- les mêmes droits d'accès aux cours collectifs adultes que le plan adult_all_access.
-- Seules les conditions commerciales diffèrent (89 €/mois renouvelable vs 799 €/an).
--
-- Les champs d'accès (allows_small_group, allows_private, allows_collective,
-- is_digital_plan, entitlements, trial_days) sont calqués dynamiquement
-- sur ceux du plan 'adult_all_access' existant en base.
-- Le plan 'adult_all_access' n'est AUCUNEMENT modifié.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. INSERTION / ACTUALISATION IDEMPOTENTE DU PLAN DISCOVERY_MONTHLY
-- =============================================================================

DO $$
DECLARE
  v_ref RECORD;
BEGIN
  -- Lecture stricte des droits réels du plan adult_all_access
  SELECT
    allows_small_group,
    allows_private,
    allows_collective,
    is_digital_plan,
    entitlements,
    trial_days
  INTO v_ref
  FROM public.plans
  WHERE code = 'adult_all_access';

  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Plan de référence adult_all_access introuvable dans public.plans';
  END IF;

  -- Insertion ou mise à jour idempotente
  INSERT INTO public.plans (
    code,
    name,
    type,
    tier,
    commitment,
    price_cents,
    display_order,
    is_active,
    allows_small_group,
    allows_private,
    allows_collective,
    is_digital_plan,
    entitlements,
    trial_days,
    description,
    badge_text,
    features,
    created_at,
    updated_at
  ) VALUES (
    'discovery_monthly',
    'Adulte — Sans engagement',
    'small_group',
    'adult_monthly',
    'monthly',
    8900,
    3,
    TRUE,
    v_ref.allows_small_group,
    v_ref.allows_private,
    v_ref.allows_collective,
    v_ref.is_digital_plan,
    v_ref.entitlements,
    COALESCE(v_ref.trial_days, 0),
    'Accès illimité aux cours collectifs adultes pendant 30 jours. Sans engagement de durée, renouvelable chaque mois.',
    'Sans engagement',
    '[]'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    tier = EXCLUDED.tier,
    commitment = EXCLUDED.commitment,
    price_cents = EXCLUDED.price_cents,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    allows_small_group = EXCLUDED.allows_small_group,
    allows_private = EXCLUDED.allows_private,
    allows_collective = EXCLUDED.allows_collective,
    is_digital_plan = EXCLUDED.is_digital_plan,
    entitlements = EXCLUDED.entitlements,
    trial_days = EXCLUDED.trial_days,
    description = EXCLUDED.description,
    badge_text = EXCLUDED.badge_text,
    features = EXCLUDED.features,
    updated_at = NOW();

END $$;

-- =============================================================================
-- 2. NETTOYAGE DES SIGNATURES OBSOLÈTES (ÉVITE TOUTE AMBIGUÏTÉ POSTGREST)
-- =============================================================================

DROP FUNCTION IF EXISTS public.submit_membership_request(UUID, TEXT, TEXT);

-- =============================================================================
-- 3. RPC SUBMIT_MEMBERSHIP_REQUEST (FINALISATION, COMMITMENT_MISMATCH, CONCURRENCE)
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
SET search_path = public, auth, pg_temp
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

  -- B. Validation syntaxique du type d'engagement
  IF p_commitment_type IS NULL OR TRIM(p_commitment_type) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_COMMITMENT',
      'message', 'Le type d''engagement ne peut pas être nul ou vide.'
    );
  END IF;

  IF p_commitment_type NOT IN ('monthly', 'annual') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_COMMITMENT',
      'message', 'Type d''engagement invalide (doit être "monthly" ou "annual").'
    );
  END IF;

  -- C. Vérification de l'existence et du statut de la formule
  SELECT id, code, name, type, tier, commitment, is_active
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La formule sélectionnée est introuvable.'
    );
  END IF;

  IF v_plan.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_INACTIVE',
      'message', 'Cette formule est actuellement désactivée ou indisponible.'
    );
  END IF;

  -- C2. Vérification stricte de l'engagement : p_commitment_type doit correspondre exactement au commitment du plan
  IF v_plan.commitment IS NOT NULL AND v_plan.commitment <> p_commitment_type THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'COMMITMENT_MISMATCH',
      'message', 'Le type d''engagement demandé (' || p_commitment_type || ') ne correspond pas aux conditions de cette formule (' || v_plan.commitment || ').'
    );
  END IF;

  -- C3. Validation spécifique de la discipline pour la formule Essentiel
  IF v_plan.code = 'adult_essential' THEN
    IF p_selected_discipline IS NULL OR TRIM(p_selected_discipline) = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DISCIPLINE_REQUIRED',
        'message', 'Veuillez sélectionner une discipline pour la formule Essentiel.'
      );
    END IF;
  END IF;

  -- D. Protection contre la concurrence : verrou transactionnel consultatif exclusif par utilisateur
  -- Garantit qu'aucune demande concurrente ne peut être insérée en parallèle pour le même adhérent
  PERFORM pg_advisory_xact_lock(hashtext('membership_request_' || v_user_id::text));

  -- Vérification atomique : Aucune demande EN ATTENTE (pending) déjà existante
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

  -- E. Vérification exhaustive des abonnements actifs existants (sans LIMIT 1)
  -- Pour une formule mensuelle sans engagement (discovery_monthly / adult_monthly) :
  -- - Si le membre a déjà un abonnement actif sur le MÊME plan, il est autorisé à demander un renouvellement anticipé.
  -- - Si le membre a un abonnement actif d'un plan DIFFÉRENT, il ne peut pas souscrire sans contacter le club.
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
        'message', 'Vous possédez déjà un abonnement actif pour une autre formule au club. Veuillez contacter l''administration pour toute modification.'
      );
    END IF;
  ELSE
    -- Formules classiques (Essentiel, All Access, Kid Boxing, Privés)
    -- Aucun abonnement actif n'est autorisé pour une nouvelle demande
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

  -- G. Insertion atomique de la demande avec les vraies colonnes de public.membership_requests
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
-- 4. RPC ADMIN_APPROVE_MEMBERSHIP_REQUEST (VALIDATION SÉCURISÉE, CONCURRENCE, HISTORIQUE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_membership_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
  v_has_incompatible_sub BOOLEAN := FALSE;
BEGIN
  -- A. Vérification stricte des droits administrateur
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Administrateur non authentifié.'
    );
  END IF;

  -- B. Récupération et verrouillage exclusif de la demande (anti-double validation)
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

  -- B2. Verrou de transaction au niveau du membre (anti-race condition sur validations administratives simultanées)
  -- Empêche deux validations simultanées sur deux demandes distinctes pour le même membre de créer des abonnements incompatibles
  PERFORM pg_advisory_xact_lock(hashtext('membership_approval_user_' || v_req.user_id::text));

  -- C. Récupération et vérification approfondie du plan associé
  SELECT id, code, name, type, tier, commitment, is_active, private_sessions_per_period
  INTO v_plan
  FROM public.plans
  WHERE id = v_req.plan_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La formule associée à cette demande est introuvable.'
    );
  END IF;

  IF v_plan.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_INACTIVE',
      'message', 'La formule associée à cette demande est devenue inactive.'
    );
  END IF;

  -- C2. Vérification stricte de cohérence de l'engagement (anti-altération)
  IF v_plan.commitment IS NOT NULL AND v_plan.commitment <> v_req.commitment_type THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'COMMITMENT_MISMATCH',
      'message', 'Incohérence détectée : l''engagement de la demande (' || v_req.commitment_type || ') ne correspond pas à la formule (' || v_plan.commitment || ').'
    );
  END IF;

  -- D. Traitement spécifique de la Formule Mensuelle Adulte Sans Engagement (discovery_monthly)
  IF v_plan.code = 'discovery_monthly' OR v_plan.tier = 'adult_monthly' THEN
    -- D1. Vérifier qu'aucun abonnement actif INCOMPATIBLE (autre formule) n'existe pour ce membre
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_req.user_id
        AND plan_id <> v_req.plan_id
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at > v_now)
    ) INTO v_has_incompatible_sub;

    IF v_has_incompatible_sub THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INCOMPATIBLE_ACTIVE_SUBSCRIPTION_EXISTS',
        'message', 'Ce membre possède déjà un abonnement actif pour une autre formule.'
      );
    END IF;

    -- D2. Recherche d'un abonnement actif pour le MÊME plan non encore expiré (renouvellement anticipé)
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
      -- Renouvellement anticipé : prolongation de 30 jours à compter de la date d'expiration actuelle (aucun jour perdu)
      v_ends_at := v_existing_active_sub.ends_at + INTERVAL '30 days';
      v_sub_id := v_existing_active_sub.id;
      v_started_at := v_existing_active_sub.started_at;

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
        NULL,
        NULL,
        v_now,
        v_now
      )
      RETURNING id INTO v_sub_id;
    END IF;

  -- E. Traitement des formules régulières (Annuelles / Mensuelles privées)
  ELSE
    -- Vérification : aucun abonnement actif existant pour toute formule régulière
    IF EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_req.user_id
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at > v_now)
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'ALREADY_HAVE_ACTIVE_SUBSCRIPTION',
        'message', 'Ce membre possède déjà un abonnement actif au club.'
      );
    END IF;

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
      v_now,
      v_now
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- F. Enregistrement dans subscription_discipline_choices si discipline renseignée (formule Essentiel)
  IF v_req.selected_discipline IS NOT NULL AND TRIM(v_req.selected_discipline) <> '' THEN
    INSERT INTO public.subscription_discipline_choices (
      subscription_id,
      user_id,
      discipline,
      created_at,
      updated_at
    ) VALUES (
      v_sub_id,
      v_req.user_id,
      TRIM(v_req.selected_discipline),
      v_now,
      v_now
    )
    ON CONFLICT (subscription_id) DO UPDATE SET
      discipline = EXCLUDED.discipline,
      updated_at = v_now;
  END IF;

  -- G. Mise à jour atomique de la demande en 'approved' (colonnes réelles reviewed_by, reviewed_at, admin_notes)
  UPDATE public.membership_requests
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = v_admin_id,
      reviewed_at = v_now,
      updated_at = v_now
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'message', 'Demande d''adhésion validée avec succès. L''abonnement est désormais actif.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role, postgres;

COMMIT;
