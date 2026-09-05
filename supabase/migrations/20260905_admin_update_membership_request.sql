-- =============================================================================
-- Migration : 20260905_admin_update_membership_request.sql
-- Description :
--   1. Permet la modification sécurisée d'une demande d'adhésion par un ADMIN
--      via une RPC dédiée SECURITY DEFINER sans dépendance à service_role.
--   2. Vérifie strictement les privilèges administrateur via public.is_admin().
--   3. Ne modifie JAMAIS user_id ni les données d'authentification du membre.
--   4. Ne supprime JAMAIS de réservations existantes.
--   5. Si la demande est 'approved', synchronise atomiquement l'abonnement actif
--      dans public.subscriptions (plan_id, private_sessions_quota, ends_at).
-- =============================================================================

BEGIN;

-- 1. Création de la RPC ADMIN : admin_update_membership_request
CREATE OR REPLACE FUNCTION public.admin_update_membership_request(
  p_request_id UUID,
  p_plan_id UUID,
  p_commitment_type TEXT,
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
  v_target_plan RECORD;
  v_sub RECORD;
  v_new_ends_at TIMESTAMPTZ;
  v_new_quota INT;
  v_started_at TIMESTAMPTZ;
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

  -- B. Validation du type d'engagement
  IF p_commitment_type NOT IN ('monthly', 'annual') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_COMMITMENT',
      'message', 'Type d''engagement invalide (doit être "monthly" ou "annual").'
    );
  END IF;

  -- C. Récupération et verrouillage de la demande existante
  SELECT id, user_id, plan_id, status, commitment_type, admin_notes
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

  -- D. Vérification de l'existence de la formule cible
  SELECT id, name, type, private_sessions_per_period, is_active
  INTO v_target_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF v_target_plan IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La formule sélectionnée est introuvable.'
    );
  END IF;

  -- E. Mise à jour de la table public.membership_requests
  UPDATE public.membership_requests
  SET
    plan_id = p_plan_id,
    commitment_type = p_commitment_type,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- F. Si la demande était déjà validée (status = 'approved'), synchronisation de subscriptions
  IF v_req.status = 'approved' THEN
    SELECT id, started_at, ends_at, private_sessions_quota
    INTO v_sub
    FROM public.subscriptions
    WHERE user_id = v_req.user_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_sub IS NOT NULL THEN
      v_started_at := COALESCE(v_sub.started_at, NOW());

      IF p_commitment_type = 'annual' THEN
        v_new_ends_at := v_started_at + INTERVAL '12 months';
      ELSE
        v_new_ends_at := v_started_at + INTERVAL '1 month';
      END IF;

      v_new_quota := COALESCE(v_target_plan.private_sessions_per_period, 8);

      UPDATE public.subscriptions
      SET
        plan_id = p_plan_id,
        ends_at = v_new_ends_at,
        private_sessions_quota = v_new_quota,
        updated_at = NOW()
      WHERE id = v_sub.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'request_id', p_request_id,
      'message', 'La formule d''adhésion et l''abonnement actif ont été synchronisés avec succès.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'message', 'La demande d''adhésion a été modifiée avec succès.'
  );
END;
$$;

-- 2. Attributions des droits d'exécution sur la nouvelle fonction
GRANT EXECUTE ON FUNCTION public.admin_update_membership_request(UUID, UUID, TEXT, TEXT) TO authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;
