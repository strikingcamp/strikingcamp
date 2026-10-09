-- =============================================================================
-- Migration : 20261013_atomic_admin_approve_credit_pack.sql
-- Description : Approbation transactionnelle et atomique des demandes de packs de crédits
--               - RPC admin_approve_credit_pack_request avec FOR UPDATE
--               - Vérification des droits administrateur (public.is_admin())
--               - Vérification du statut 'pending' et du plan de type 'credit_pack'
--               - Règle découverte (1 seule fois à vie)
--               - Calcul déterministe de validité (3 mois pour pack_10_small_group, 30 jours pour découverte)
--               - Création atomique de member_session_credits + session_credit_transactions + UPDATE membership_requests
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_approve_credit_pack_request(
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
  v_new_pack_id UUID;
  v_total_credits INT;
  v_expires_at TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_existing_discovery_count INT;
BEGIN
  -- 1. Contrôle administrateur
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Action réservée aux administrateurs.'
    );
  END IF;

  v_admin_id := auth.uid();

  -- 2. Verrouillage pessimiste de la demande
  SELECT id, user_id, plan_id, status, commitment_type
  INTO v_req
  FROM public.membership_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_FOUND',
      'message', 'Demande d''adhésion ou de pack introuvable.'
    );
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_PENDING',
      'message', 'Cette demande a déjà été traitée (statut actuel : ' || v_req.status || ').'
    );
  END IF;

  -- 3. Récupération de la formule et vérification du type credit_pack
  SELECT id, code, name, type, tier, is_active
  INTO v_plan
  FROM public.plans
  WHERE id = v_req.plan_id;

  IF NOT FOUND OR v_plan.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La formule demandée est introuvable ou inactive.'
    );
  END IF;

  IF v_plan.tier <> 'credit_pack' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_A_CREDIT_PACK',
      'message', 'Cette demande ne concerne pas un pack de crédits. Utilisez la validation d''abonnement standard.'
    );
  END IF;

  -- 4. Détermination des crédits et de la durée d'expiration (codes explicitement gérés)
  IF v_plan.code = 'pack_10_small_group' THEN
    v_total_credits := 10;
    v_expires_at := v_now + INTERVAL '3 months';
  ELSIF v_plan.code = 'decouverte_3' THEN
    v_total_credits := 3;
    v_expires_at := v_now + INTERVAL '30 days';
  ELSIF v_plan.code = 'decouverte_1' THEN
    v_total_credits := 1;
    v_expires_at := v_now + INTERVAL '30 days';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNKNOWN_PACK_CODE',
      'message', 'Code de pack de crédits non reconnu : ' || coalesce(v_plan.code, 'null')
    );
  END IF;

  -- 5. Règle d'éligibilité stricte : Offres découverte limitées à 1 fois par membre à vie (toutes formules confondues)
  IF v_plan.code IN ('decouverte_1', 'decouverte_3') THEN
    -- Verrouillage pessimiste sur le profil membre pour sérialiser toute tentative d'approbation concurrente
    PERFORM 1
    FROM public.profiles
    WHERE id = v_req.user_id
    FOR UPDATE;

    SELECT COUNT(id)
    INTO v_existing_discovery_count
    FROM public.member_session_credits
    WHERE user_id = v_req.user_id
      AND plan_id IN (
        SELECT id
        FROM public.plans
        WHERE code IN ('decouverte_1', 'decouverte_3')
      );

    IF v_existing_discovery_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DISCOVERY_ALREADY_USED',
        'message', 'Ce membre a déjà bénéficié d''une offre découverte. Les offres découverte sont strictement limitées à 1 seule fois par membre à vie (toutes formules confondues).'
      );
    END IF;
  END IF;

  -- 6. Création atomique du pack de crédits
  INSERT INTO public.member_session_credits (
    user_id,
    plan_id,
    total_credits,
    remaining_credits,
    starts_at,
    expires_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_req.user_id,
    v_req.plan_id,
    v_total_credits,
    v_total_credits,
    v_now,
    v_expires_at,
    'active',
    v_now,
    v_now
  ) RETURNING id INTO v_new_pack_id;

  -- 7. Insertion atomique de la transaction d'audit
  INSERT INTO public.session_credit_transactions (
    credit_pack_id,
    user_id,
    booking_id,
    delta,
    transaction_type,
    reason,
    created_at
  ) VALUES (
    v_new_pack_id,
    v_req.user_id,
    NULL,
    v_total_credits,
    'purchase',
    'Validation manuelle par l''administrateur : ' || v_plan.name,
    v_now
  );

  -- 8. Mise à jour atomique du statut de la demande en approved
  UPDATE public.membership_requests
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = v_now,
      admin_notes = p_admin_notes,
      updated_at = v_now
  WHERE id = p_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_UPDATE_FAILED: Impossible de valider la demande %, son statut a été modifié en cours de traitement.', p_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', v_new_pack_id,
    'total_credits', v_total_credits,
    'expires_at', v_expires_at,
    'message', 'Demande de pack validée avec succès. ' || v_total_credits || ' séance(s) ont été créditées sur le compte du membre.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_credit_pack_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_credit_pack_request(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
