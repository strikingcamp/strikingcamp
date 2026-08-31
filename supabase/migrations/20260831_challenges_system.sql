-- =============================================================================
-- Migration: Système de Défis & Gamification (Striking Camp)
-- Date: 2026-08-31
-- Description:
--   1. Tables: challenges, challenge_steps, user_challenge_progress, user_challenge_step_completions
--   2. RLS & Permissions
--   3. RPC Sécurisée: complete_challenge_step(UUID, UUID)
-- =============================================================================

-- 1. Table des Défis
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Technique', 'Physique', 'Cardio', 'Nutrition'
  level TEXT NOT NULL DEFAULT 'Tous niveaux', -- 'Débutant', 'Intermédiaire', 'Confirmé', 'Tous niveaux'
  short_description TEXT,
  description TEXT,
  cover_image_url TEXT,
  points_xp INT NOT NULL DEFAULT 500,
  badge_reward TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table des Étapes de Défi
CREATE TABLE IF NOT EXISTS public.challenge_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_challenge_step_order UNIQUE (challenge_id, step_order)
);

-- 3. Table de Progression Globale du Membre sur un Défi
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress_percentage INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_challenge_progress UNIQUE (user_id, challenge_id)
);

-- 4. Table des Validations d'Étapes Individuelles par Membre
CREATE TABLE IF NOT EXISTS public.user_challenge_step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.challenge_steps(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_challenge_step UNIQUE (user_id, step_id)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_challenge_steps_challenge ON public.challenge_steps(challenge_id, step_order);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON public.user_challenge_progress(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_step_user ON public.user_challenge_step_completions(user_id, challenge_id);

-- Grants universels
GRANT ALL ON TABLE public.challenges TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.challenge_steps TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.user_challenge_progress TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.user_challenge_step_completions TO postgres, service_role, authenticated, anon;

-- RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_step_completions ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : challenges
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "challenges_select_policy" ON public.challenges;
CREATE POLICY "challenges_select_policy" ON public.challenges
  FOR SELECT
  TO authenticated, anon
  USING (
    (status = 'published' AND is_active = true)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "challenges_admin_all_policy" ON public.challenges;
CREATE POLICY "challenges_admin_all_policy" ON public.challenges
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : challenge_steps
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "challenge_steps_select_policy" ON public.challenge_steps;
CREATE POLICY "challenge_steps_select_policy" ON public.challenge_steps
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_steps.challenge_id
        AND ((c.status = 'published' AND c.is_active = true AND challenge_steps.is_active = true) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "challenge_steps_admin_all_policy" ON public.challenge_steps;
CREATE POLICY "challenge_steps_admin_all_policy" ON public.challenge_steps
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_challenge_progress
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_challenge_progress_select_policy" ON public.user_challenge_progress;
CREATE POLICY "user_challenge_progress_select_policy" ON public.user_challenge_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "user_challenge_progress_modify_policy" ON public.user_challenge_progress;
CREATE POLICY "user_challenge_progress_modify_policy" ON public.user_challenge_progress
  FOR ALL
  TO authenticated, service_role
  USING (
    auth.uid() = user_id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_challenge_step_completions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_challenge_step_select_policy" ON public.user_challenge_step_completions;
CREATE POLICY "user_challenge_step_select_policy" ON public.user_challenge_step_completions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "user_challenge_step_modify_policy" ON public.user_challenge_step_completions;
CREATE POLICY "user_challenge_step_modify_policy" ON public.user_challenge_step_completions
  FOR ALL
  TO authenticated, service_role
  USING (
    auth.uid() = user_id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RPC : complete_challenge_step(UUID, UUID)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.complete_challenge_step(
  p_challenge_id UUID,
  p_step_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_target_step RECORD;
  v_uncompleted_prev_count INT;
  v_total_steps INT := 0;
  v_completed_steps INT := 0;
  v_progress_percentage INT := 0;
  v_is_completed BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Veuillez vous connecter pour valider une étape de défi.'
    );
  END IF;

  -- 2. Vérification du défi
  SELECT id, title, status, is_active
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHALLENGE_NOT_FOUND', 'message', 'Défi introuvable.');
  END IF;

  IF (v_challenge.status <> 'published' OR v_challenge.is_active = FALSE) AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHALLENGE_NOT_ACTIVE', 'message', 'Ce défi n''est pas actif ou disponible.');
  END IF;

  -- 3. Vérification de l'étape ciblée
  SELECT id, challenge_id, step_order, title, is_active
  INTO v_target_step
  FROM public.challenge_steps
  WHERE id = p_step_id AND challenge_id = p_challenge_id;

  IF v_target_step IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'STEP_NOT_FOUND', 'message', 'Étape introuvable dans ce défi.');
  END IF;

  IF v_target_step.is_active = FALSE AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'STEP_INACTIVE', 'message', 'Cette étape n''est plus active.');
  END IF;

  -- 4. Vérification anti-doublon (déjà validée)
  IF EXISTS (
    SELECT 1 FROM public.user_challenge_step_completions
    WHERE user_id = v_user_id AND step_id = p_step_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_COMPLETED',
      'message', 'Vous avez déjà validé cette étape.'
    );
  END IF;

  -- 5. Règle séquentielle : vérifier que toutes les étapes antérieures actives sont terminées
  SELECT COUNT(cs.id)
  INTO v_uncompleted_prev_count
  FROM public.challenge_steps cs
  LEFT JOIN public.user_challenge_step_completions ucs
    ON cs.id = ucs.step_id AND ucs.user_id = v_user_id
  WHERE cs.challenge_id = p_challenge_id
    AND cs.is_active = TRUE
    AND cs.step_order < v_target_step.step_order
    AND ucs.id IS NULL;

  IF v_uncompleted_prev_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PREVIOUS_STEPS_REQUIRED',
      'message', 'Vous devez terminer les étapes précédentes avant de pouvoir valider cette étape.'
    );
  END IF;

  -- 6. Enregistrement de la complétion de l'étape
  INSERT INTO public.user_challenge_step_completions (
    user_id,
    challenge_id,
    step_id,
    completed_at
  ) VALUES (
    v_user_id,
    p_challenge_id,
    p_step_id,
    v_now
  );

  -- 7. Calcul du pourcentage et statut global
  SELECT COUNT(id) INTO v_total_steps
  FROM public.challenge_steps
  WHERE challenge_id = p_challenge_id AND is_active = TRUE;

  SELECT COUNT(ucs.id) INTO v_completed_steps
  FROM public.user_challenge_step_completions ucs
  JOIN public.challenge_steps cs ON ucs.step_id = cs.id
  WHERE ucs.user_id = v_user_id
    AND ucs.challenge_id = p_challenge_id
    AND cs.is_active = TRUE;

  IF v_total_steps > 0 THEN
    v_progress_percentage := LEAST(100, FLOOR((v_completed_steps::FLOAT / v_total_steps::FLOAT) * 100));
  ELSE
    v_progress_percentage := 100;
  END IF;

  v_is_completed := (v_completed_steps >= v_total_steps AND v_total_steps > 0);

  -- 8. Mise à jour ou création de la progression
  INSERT INTO public.user_challenge_progress (
    user_id,
    challenge_id,
    progress_percentage,
    status,
    started_at,
    completed_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_challenge_id,
    v_progress_percentage,
    CASE WHEN v_is_completed THEN 'completed' ELSE 'in_progress' END,
    v_now,
    CASE WHEN v_is_completed THEN v_now ELSE NULL END,
    v_now
  )
  ON CONFLICT (user_id, challenge_id) DO UPDATE
  SET progress_percentage = EXCLUDED.progress_percentage,
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at,
      updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'progress_percentage', v_progress_percentage,
    'is_completed', v_is_completed,
    'completed_steps_count', v_completed_steps,
    'total_steps_count', v_total_steps,
    'message', CASE 
      WHEN v_is_completed THEN 'Félicitations ! Vous avez terminé toutes les étapes de ce défi !'
      ELSE 'Étape validée avec succès ! Étape suivante débloquée.'
    END
  );
END;
$$;

-- Permissions d'exécution
REVOKE ALL ON FUNCTION public.complete_challenge_step(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_challenge_step(UUID, UUID) TO authenticated, service_role;
