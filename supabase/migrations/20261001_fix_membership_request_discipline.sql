-- =============================================================================
-- STRIKING CAMP — ATOMIC MEMBERSHIP REQUEST DISCIPLINE RECORDING
-- Fichier : 20261001_fix_membership_request_discipline.sql
-- =============================================================================
-- Objectif :
-- Permettre l'enregistrement atomique et immédiat de la discipline choisie
-- (pour la formule Cours Adulte — Essentiel) directement lors de l'appel
-- à la RPC submit_membership_request, sans passer par un UPDATE client séparé.
-- =============================================================================

BEGIN;

-- 1. S'assurer que la colonne selected_discipline existe bien sur public.membership_requests
ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS selected_discipline TEXT NULL;

-- 2. Supprimer l'ancienne signature à 3 arguments pour éviter toute surcharge ambiguë
DROP FUNCTION IF EXISTS public.submit_membership_request(UUID, TEXT, TEXT);

-- 3. Création de la RPC submit_membership_request avec support de p_selected_discipline
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

  -- F. Nettoyage de la discipline si fournie
  v_clean_discipline := NULLIF(TRIM(p_selected_discipline), '');

  -- G. Insertion atomique de la demande avec sa discipline
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

-- Rétablir les permissions d'exécution
REVOKE ALL ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role, postgres;

COMMIT;
