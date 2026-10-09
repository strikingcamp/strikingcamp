-- =============================================================================
-- STRIKING CAMP — MODIFICATION D'UNE DEMANDE D'ADHÉSION EN ATTENTE (MEMBRE)
-- Fichier : 20261012_update_my_pending_membership_request.sql
-- =============================================================================
-- Objectif :
-- Permettre à un membre ayant soumis une demande d'adhésion encore en attente
-- ('pending') de modifier son choix de formule, sa discipline et ses notes
-- sans créer de demande concurrente ni altérer les contrôles d'intégrité.
-- =============================================================================

BEGIN;

-- 1. Création de la RPC sécurisée update_my_pending_membership_request
CREATE OR REPLACE FUNCTION public.update_my_pending_membership_request(
  p_request_id UUID,
  p_plan_id UUID,
  p_commitment_type TEXT,
  p_selected_discipline TEXT DEFAULT NULL,
  p_member_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_req RECORD;
  v_plan RECORD;
  v_clean_discipline TEXT;
  v_clean_notes TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- A. Contrôle d'authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour modifier votre demande d''adhésion.'
    );
  END IF;

  -- B. Validation du type d'engagement
  IF p_commitment_type IS NULL OR p_commitment_type NOT IN ('monthly', 'annual') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_COMMITMENT',
      'message', 'Type d''engagement invalide (doit être "monthly" ou "annual").'
    );
  END IF;

  -- C. Verrouillage pessimiste de la demande appartenant au membre connecté
  SELECT id, user_id, plan_id, status, commitment_type, selected_discipline, member_notes
  INTO v_req
  FROM public.membership_requests
  WHERE id = p_request_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_FOUND',
      'message', 'Demande d''adhésion introuvable ou vous n''en êtes pas l''auteur.'
    );
  END IF;

  -- D. Vérification du statut de la demande (Strictement 'pending')
  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REQUEST_NOT_PENDING',
      'message', 'Cette demande a déjà été traitée (statut actuel : ' || v_req.status || ') et ne peut plus être modifiée.'
    );
  END IF;

  -- E. Vérification de l'existence et de l'activation de la nouvelle formule
  SELECT id, code, name, type, tier, is_active
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF v_plan IS NULL OR v_plan.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'La nouvelle formule sélectionnée est introuvable ou inactive.'
    );
  END IF;

  -- F. Nettoyage et validation des champs selon la formule
  v_clean_discipline := NULLIF(TRIM(p_selected_discipline), '');
  v_clean_notes := NULLIF(TRIM(p_member_notes), '');

  -- Règle métier : Cours Adulte — Essentiel exige obligatoirement une discipline officielle valide
  IF v_plan.code = 'adult_essential' THEN
    IF v_clean_discipline IS NULL OR v_clean_discipline NOT IN (
      'Boxe Anglaise', 'Kick Boxing', 'Boxe Thaï', 'Lady Striking', 'MMA / Grappling', 'Cross Training'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_DISCIPLINE_CHOICE',
        'message', 'Une discipline officielle valide est obligatoire pour la formule Cours Adulte — Essentiel.'
      );
    END IF;
  ELSE
    -- Pour toutes les autres formules (All Access, Sans engagement 89€, Packs, Privé, Kid Boxing), la discipline spécifique n'est pas applicable
    v_clean_discipline := NULL;
  END IF;

  -- G. Mise à jour de la demande existante (préservation de l'ID, pas de doublon)
  UPDATE public.membership_requests
  SET
    plan_id = p_plan_id,
    commitment_type = p_commitment_type,
    selected_discipline = v_clean_discipline,
    member_notes = v_clean_notes,
    updated_at = v_now
  WHERE id = p_request_id
    AND user_id = v_user_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'plan_id', p_plan_id,
    'plan_name', v_plan.name,
    'message', 'Votre demande d''adhésion a été mise à jour avec succès.'
  );
END;
$$;

-- 2. Configuration des permissions de sécurité
REVOKE ALL ON FUNCTION public.update_my_pending_membership_request(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_pending_membership_request(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role, postgres;

-- 3. Notification rechargement PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
