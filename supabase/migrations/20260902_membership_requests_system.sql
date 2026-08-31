-- =============================================================================
-- STRIKING CAMP — SYSTÈME DE DEMANDES D'ADHÉSION & VALIDATION MANUELLE
-- Date : 2026-09-02
-- Description :
--   1. Création de la table isolée public.membership_requests
--   2. Politiques RLS sécurisées (accès membre à ses demandes, accès admin total)
--   3. RPC membre : submit_membership_request(p_plan_id, p_commitment_type, p_member_notes)
--   4. RPC admin : admin_approve_membership_request(p_request_id, p_admin_notes)
--   5. RPC admin : admin_reject_membership_request(p_request_id, p_admin_notes)
--   6. Intégrité : Zéro modification sur les fonctions de réservation existantes
-- =============================================================================

BEGIN;

-- 1. Table des demandes d'adhésion
CREATE TABLE IF NOT EXISTS public.membership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  commitment_type TEXT NOT NULL CHECK (commitment_type IN ('monthly', 'annual')),
  member_notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pour les performances de recherche
CREATE INDEX IF NOT EXISTS idx_membership_requests_user_id ON public.membership_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_requests_status ON public.membership_requests(status);

-- 2. Privilèges tables
GRANT ALL ON TABLE public.membership_requests TO postgres, service_role;
GRANT SELECT, INSERT ON TABLE public.membership_requests TO authenticated;

-- 3. Politiques RLS
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_requests_member_select" ON public.membership_requests;
CREATE POLICY "membership_requests_member_select"
  ON public.membership_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "membership_requests_member_insert" ON public.membership_requests;
CREATE POLICY "membership_requests_member_insert"
  ON public.membership_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "membership_requests_admin_all" ON public.membership_requests;
CREATE POLICY "membership_requests_admin_all"
  ON public.membership_requests
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. RPC MEMBRE : Soumettre une demande d'adhésion
CREATE OR REPLACE FUNCTION public.submit_membership_request(
  p_plan_id UUID,
  p_commitment_type TEXT,
  p_member_notes TEXT DEFAULT NULL
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
  SELECT id, name, type, is_active
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

  -- D. Vérification : Aucun abonnement actif existant
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

  -- E. Vérification : Aucune demande en attente (pending)
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

  -- F. Insertion de la demande
  INSERT INTO public.membership_requests (
    user_id,
    plan_id,
    status,
    commitment_type,
    member_notes,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_plan_id,
    'pending',
    p_commitment_type,
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

-- 5. RPC ADMIN : Valider une demande d'adhésion
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
  SELECT id, user_id, plan_id, status, commitment_type
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
  SELECT id, name, type, private_sessions_per_period
  INTO v_plan
  FROM public.plans
  WHERE id = v_req.plan_id;

  -- D. Calcul des dates de validité selon l'engagement
  IF v_req.commitment_type = 'annual' THEN
    v_ends_at := v_started_at + INTERVAL '12 months';
  ELSE
    -- Mensuel (1 mois initial renouvelable)
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
    created_at,
    updated_at
  ) VALUES (
    v_req.user_id,
    v_req.plan_id,
    'active',
    v_started_at,
    v_ends_at,
    v_quota,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_sub_id;

  -- F. Mise à jour de la demande en approved
  UPDATE public.membership_requests
  SET
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'subscription_id', v_sub_id,
    'message', 'Demande validée avec succès. L''abonnement actif du membre a été créé.'
  );
END;
$$;

-- 6. RPC ADMIN : Refuser une demande d'adhésion
CREATE OR REPLACE FUNCTION public.admin_reject_membership_request(
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
  SELECT id, status
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

  -- C. Mise à jour en rejected
  UPDATE public.membership_requests
  SET
    status = 'rejected',
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'message', 'La demande d''adhésion a été refusée.'
  );
END;
$$;

-- 7. Attributions des droits d'exécution sur les fonctions
GRANT EXECUTE ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.admin_reject_membership_request(UUID, TEXT) TO authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;
