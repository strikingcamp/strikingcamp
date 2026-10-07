-- =============================================================================
-- Migration : 20261008_session_credits_system.sql
-- Description : Système de Packs de Séances Small Group (Paiement unique Stripe)
--               - Offres dans public.plans (Découverte 1, Découverte 3, Pack 10)
--               - Tables : member_session_credits & session_credit_transactions
--               - Extension bookings avec credit_pack_id
--               - RPC atomique create_small_group_booking (Abonnement prioritaire > Crédit FIFO > Refus)
--               - RPC atomique cancel_small_group_booking (Restitution si >= 24h, conservation si < 24h)
--               - RPC admin_adjust_member_credits avec transaction d'audit
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. INSERTION IDEMPOTENTE DES 3 OFFRES DE PACKS DANS PUBLIC.PLANS
-- =============================================================================

-- A. DÉCOUVERTE — 1 SÉANCE (20 € - Validité 30 jours)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, badge_text
) VALUES (
  'decouverte_1',
  'Découverte — 1 séance',
  'small_group',
  'once',
  2000,
  7,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'credit_pack',
  'Séance unique Small Group sans engagement. Idéale pour découvrir le club.',
  'Achat unique'
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

-- B. DÉCOUVERTE — 3 SÉANCES (49 € - Validité 30 jours)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, badge_text
) VALUES (
  'decouverte_3',
  'Découverte — 3 séances',
  'small_group',
  'once',
  4900,
  8,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'credit_pack',
  'Pack découverte 3 séances Small Group. Valable 30 jours à compter de l''achat.',
  'Achat unique'
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

-- C. PACK 10 SÉANCES — SMALL GROUP (180 € - Validité 3 mois)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, badge_text
) VALUES (
  'pack_10_small_group',
  'Pack 10 séances — Small Group',
  'small_group',
  'once',
  18000,
  9,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  'credit_pack',
  'Pack 10 séances Small Group avec suivi personnalisé. Valable 3 mois.',
  'Achat unique'
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
-- 2. CRÉATION DES TABLES DE GESTION DES CRÉDITS
-- =============================================================================

-- Table des packs de crédits
CREATE TABLE IF NOT EXISTS public.member_session_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  total_credits INTEGER NOT NULL CHECK (total_credits > 0),
  remaining_credits INTEGER NOT NULL CHECK (remaining_credits >= 0 AND remaining_credits <= total_credits),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'exhausted', 'expired', 'refunded')) DEFAULT 'active',
  stripe_payment_intent_id TEXT NULL,
  stripe_checkout_session_id TEXT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_session_credits_user_status
  ON public.member_session_credits (user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_member_session_credits_stripe_session
  ON public.member_session_credits (stripe_checkout_session_id);

-- Table des transactions d'audit de crédits (Grand livre)
CREATE TABLE IF NOT EXISTS public.session_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_pack_id UUID NOT NULL REFERENCES public.member_session_credits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'booking_debit', 'cancellation_refund', 'admin_adjustment', 'expiration')),
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_credit_transactions_user
  ON public.session_credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_credit_transactions_pack
  ON public.session_credit_transactions (credit_pack_id);

-- =============================================================================
-- 3. EXTENSION DE PUBLIC.BOOKINGS (Lien optionnel vers le pack de crédits)
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS credit_pack_id UUID NULL REFERENCES public.member_session_credits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_credit_pack_id
  ON public.bookings (credit_pack_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.member_session_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Politiques member_session_credits
DROP POLICY IF EXISTS "Users can view own credit packs" ON public.member_session_credits;
CREATE POLICY "Users can view own credit packs"
  ON public.member_session_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all credit packs" ON public.member_session_credits;
CREATE POLICY "Admins can manage all credit packs"
  ON public.member_session_credits
  FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role full access credit packs" ON public.member_session_credits;
CREATE POLICY "Service role full access credit packs"
  ON public.member_session_credits
  FOR ALL
  TO service_role
  USING (true);

-- Politiques session_credit_transactions
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.session_credit_transactions;
CREATE POLICY "Users can view own credit transactions"
  ON public.session_credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all credit transactions" ON public.session_credit_transactions;
CREATE POLICY "Admins can manage all credit transactions"
  ON public.session_credit_transactions
  FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role full access credit transactions" ON public.session_credit_transactions;
CREATE POLICY "Service role full access credit transactions"
  ON public.session_credit_transactions
  FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- 5. RPC CREATE_SMALL_GROUP_BOOKING (ABONNEMENT PRIORITAIRE + CRÉDITS FIFO)
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

  -- 5. ÉTAPE 1 : VÉRIFICATION PRIORITAIRE DES ABONNEMENTS ACTIFS
  FOR v_sub IN
    SELECT s.id AS sub_id, s.selected_discipline, p.id AS plan_id, p.code AS plan_code, p.name AS plan_name,
           p.type AS plan_type, p.allows_small_group, p.allows_private
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at >= v_now)
  LOOP
    v_plan_code := LOWER(COALESCE(v_sub.plan_code, ''));

    -- Cas Adulte Essentiel
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

    -- Cas Adulte All Access
    ELSIF v_plan_code = 'adult_all_access' OR v_plan_code IN ('col_annual', 'sg_annual') THEN
      IF COALESCE(v_session.category, 'cours_adulte') = 'cours_adulte' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;

    -- Cas Lady Striking
    ELSIF v_plan_code = 'lady_striking_annual' OR LOWER(v_sub.plan_name) LIKE '%lady%' THEN
      IF v_session.category = 'lady_striking' OR LOWER(v_session.discipline) LIKE '%lady%' THEN
        v_has_sub_access := TRUE;
        EXIT;
      END IF;

    -- Cas Kid Boxing
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

    -- Cas Formules Privées
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
      'message', 'Vous ne disposez d''aucun abonnement actif ni de crédit disponible pour réserver cette séance.'
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

  -- 9. DÉCRÉMENTATION DU CRÉDIT SI UTILISATION D'UN PACK
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
-- 6. RPC CANCEL_SMALL_GROUP_BOOKING (RESTITUTION ATOMIQUE SI >= 24H)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_small_group_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_booking RECORD;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_credit_pack RECORD;
  v_new_remaining INT;
BEGIN
  -- 1. Authentification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  -- 2. Verrouillage de la réservation
  SELECT b.id, b.user_id, b.class_session_id, b.credit_pack_id, b.status
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'Réservation introuvable.');
  END IF;

  IF v_booking.user_id <> v_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Vous ne pouvez pas annuler la réservation d''un autre membre.');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CANCELLED', 'message', 'Cette réservation n''est plus active.');
  END IF;

  -- 3. Récupération de la séance associée
  SELECT id, discipline, type, starts_at, ends_at
  INTO v_session
  FROM public.class_sessions
  WHERE id = v_booking.class_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Séance associée introuvable.');
  END IF;

  -- 4. Règle absolue ends_at : refus si la séance est déjà passée
  IF v_session.ends_at IS NOT NULL AND v_session.ends_at <= v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_ALREADY_FINISHED',
      'message', 'Cette séance est déjà terminée. Sa réservation ne peut plus être modifiée ou annulée.'
    );
  END IF;

  -- 5. Règle stricte des 24 heures : refus si la séance commence dans moins de 24h
  IF v_session.starts_at < v_now + INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CANCELLATION_DEADLINE_PASSED',
      'message', 'Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures. Pour toute demande exceptionnelle, veuillez contacter votre coach.'
    );
  END IF;

  -- 6. Annulation effective de la réservation
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      cancellation_reason = 'member_cancelled'
  WHERE id = p_booking_id;

  -- 7. Restitution du crédit si la réservation provenait d'un pack de séances
  IF v_booking.credit_pack_id IS NOT NULL THEN
    SELECT id, remaining_credits, total_credits, status, expires_at
    INTO v_credit_pack
    FROM public.member_session_credits
    WHERE id = v_booking.credit_pack_id
    FOR UPDATE;

    IF v_credit_pack IS NOT NULL THEN
      v_new_remaining := LEAST(v_credit_pack.remaining_credits + 1, v_credit_pack.total_credits);

      UPDATE public.member_session_credits
      SET remaining_credits = v_new_remaining,
          status = CASE WHEN v_credit_pack.expires_at < v_now THEN 'expired' ELSE 'active' END,
          updated_at = v_now
      WHERE id = v_credit_pack.id;

      INSERT INTO public.session_credit_transactions (
        credit_pack_id,
        user_id,
        booking_id,
        delta,
        transaction_type,
        reason,
        created_at
      ) VALUES (
        v_credit_pack.id,
        v_booking.user_id,
        p_booking_id,
        1,
        'cancellation_refund',
        'Restitution suite à annulation autorisée (>24h)',
        v_now
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'restored_credit', (v_booking.credit_pack_id IS NOT NULL),
    'message', 'Réservation annulée avec succès.' || CASE WHEN v_booking.credit_pack_id IS NOT NULL THEN ' Votre séance a été recréditée.' ELSE '' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_small_group_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_small_group_booking(UUID) TO authenticated, service_role;

-- =============================================================================
-- 7. RPC ADMIN_ADJUST_MEMBER_CREDITS (AJUSTEMENT ADMINISTRATEUR AVEC AUDIT)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_adjust_member_credits(
  p_credit_pack_id UUID,
  p_delta INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_pack RECORD;
  v_new_remaining INT;
  v_new_total INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Contrôle administrateur strict
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Action réservée aux administrateurs.');
  END IF;

  IF p_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DELTA', 'message', 'Le delta doit être différent de 0.');
  END IF;

  -- 2. Verrouillage du pack
  SELECT id, user_id, total_credits, remaining_credits, status, expires_at
  INTO v_pack
  FROM public.member_session_credits
  WHERE id = p_credit_pack_id
  FOR UPDATE;

  IF v_pack IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PACK_NOT_FOUND', 'message', 'Pack de crédits introuvable.');
  END IF;

  v_new_remaining := v_pack.remaining_credits + p_delta;
  IF v_new_remaining < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'message', 'Le solde restant ne peut pas devenir négatif.');
  END IF;

  v_new_total := GREATEST(v_pack.total_credits, v_new_remaining);

  -- 3. Mise à jour du pack
  UPDATE public.member_session_credits
  SET total_credits = v_new_total,
      remaining_credits = v_new_remaining,
      status = CASE
        WHEN v_pack.expires_at < v_now THEN 'expired'
        WHEN v_new_remaining = 0 THEN 'exhausted'
        ELSE 'active'
      END,
      updated_at = v_now
  WHERE id = p_credit_pack_id;

  -- 4. Enregistrement de la transaction d'ajustement
  INSERT INTO public.session_credit_transactions (
    credit_pack_id,
    user_id,
    booking_id,
    delta,
    transaction_type,
    reason,
    created_at
  ) VALUES (
    v_pack.id,
    v_pack.user_id,
    NULL,
    p_delta,
    'admin_adjustment',
    COALESCE(p_reason, 'Ajustement manuel par l''administrateur'),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'credit_pack_id', v_pack.id,
    'new_remaining_credits', v_new_remaining,
    'new_total_credits', v_new_total,
    'message', 'Ajustement des crédits effectué avec succès.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_member_credits(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_member_credits(UUID, INT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
