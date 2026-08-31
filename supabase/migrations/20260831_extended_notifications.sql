-- =============================================================================
-- STRIKING CAMP — PHASE 3B : NOTIFICATIONS AUTOMATIQUES ÉTENDUES
-- Migration : 20260831_extended_notifications.sql
-- Description :
--   1. Trigger d'annulation de réservation (public.bookings -> status = 'cancelled')
--   2. Trigger de nouvelle inscription membre (public.profiles -> INSERT)
--   3. Trigger de finalisation de défi (public.user_challenge_progress -> status = 'completed')
--   4. Formatage dynamique en français & protection anti-doublon native
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. NOTIFICATIONS D'ANNULATION DE RÉSERVATION (MEMBRE + ADMIN)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.on_booking_cancelled_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session RECORD;
  v_profile RECORD;
  v_member_name TEXT := 'Un membre';
  v_discipline TEXT := 'Séance';
  v_session_type_label TEXT := 'Séance';
  v_session_type_code TEXT := 'small_group';
  v_formatted_date TEXT := '';
  v_starts_at TIMESTAMPTZ;
  v_day_name TEXT;
  v_time_str TEXT;
  v_member_message TEXT;
  v_admin_message TEXT;
BEGIN
  -- Déclenché uniquement lors du passage à 'cancelled'
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- 1. Récupération des informations du profil membre
  SELECT first_name, last_name
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_profile IS NOT NULL AND (COALESCE(v_profile.first_name, '') <> '' OR COALESCE(v_profile.last_name, '') <> '') THEN
    v_member_name := TRIM(CONCAT(COALESCE(v_profile.first_name, ''), ' ', COALESCE(v_profile.last_name, '')));
  END IF;

  -- 2. Récupération des informations de la séance
  IF NEW.class_session_id IS NOT NULL THEN
    SELECT discipline, type, starts_at, ends_at
    INTO v_session
    FROM public.class_sessions
    WHERE id = NEW.class_session_id;

    IF v_session IS NOT NULL THEN
      v_discipline := COALESCE(v_session.discipline, 'Boxe');
      v_starts_at := v_session.starts_at;
      v_session_type_code := COALESCE(v_session.type, 'small_group');

      IF v_session.type = 'private' THEN
        v_session_type_label := 'Cours Privé';
      ELSIF v_session.type = 'small_group' THEN
        v_session_type_label := 'Small Group';
      ELSIF v_session.type = 'collective' THEN
        v_session_type_label := 'Cours Collectif';
      ELSE
        v_session_type_label := 'Séance';
      END IF;

      -- Formatage de la date en français (ex: "Mardi 02/09 à 18:00")
      IF v_starts_at IS NOT NULL THEN
        CASE EXTRACT(DOW FROM v_starts_at)
          WHEN 0 THEN v_day_name := 'Dimanche';
          WHEN 1 THEN v_day_name := 'Lundi';
          WHEN 2 THEN v_day_name := 'Mardi';
          WHEN 3 THEN v_day_name := 'Mercredi';
          WHEN 4 THEN v_day_name := 'Jeudi';
          WHEN 5 THEN v_day_name := 'Vendredi';
          WHEN 6 THEN v_day_name := 'Samedi';
          ELSE v_day_name := '';
        END CASE;

        v_time_str := TO_CHAR(v_starts_at, 'HH24:MI');
        v_formatted_date := v_day_name || ' ' || TO_CHAR(v_starts_at, 'DD/MM') || ' à ' || v_time_str;
      END IF;
    END IF;
  END IF;

  IF v_formatted_date = '' THEN
    v_formatted_date := TO_CHAR(COALESCE(NEW.created_at, NOW()), 'DD/MM/YYYY');
  END IF;

  -- 3. Construction des messages dynamiques
  v_member_message := 'Votre réservation pour la séance ' || v_discipline || ' (' || v_session_type_label || ') du ' || v_formatted_date || ' a bien été annulée.';
  v_admin_message := v_member_name || ' a annulé sa réservation pour la séance ' || v_discipline || ' (' || v_session_type_label || ') du ' || v_formatted_date || '.';

  -- 4. Insertion Notification Membre (avec protection anti-doublon)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND target_role = 'member'
      AND type = 'booking_cancelled'
      AND (metadata->>'booking_id') = NEW.id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      target_role,
      type,
      title,
      message,
      action_url,
      action_label,
      metadata,
      is_read,
      read_at,
      created_at
    ) VALUES (
      NEW.user_id,
      'member',
      'booking_cancelled',
      'Annulation confirmée',
      v_member_message,
      '/membre/planning',
      'Voir le planning',
      jsonb_build_object(
        'booking_id', NEW.id,
        'class_session_id', NEW.class_session_id,
        'discipline', v_discipline,
        'session_type', v_session_type_code,
        'session_type_label', v_session_type_label,
        'is_late_cancellation', COALESCE(NEW.is_late_cancellation, FALSE),
        'starts_at', v_starts_at
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  -- 5. Insertion Notification Admin (avec protection anti-doublon)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE target_role = 'admin'
      AND type = 'booking_cancelled'
      AND (metadata->>'booking_id') = NEW.id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      target_role,
      type,
      title,
      message,
      action_url,
      action_label,
      metadata,
      is_read,
      read_at,
      created_at
    ) VALUES (
      NULL,
      'admin',
      'booking_cancelled',
      'Réservation annulée',
      v_admin_message,
      '/admin/reservations',
      'Voir les réservations',
      jsonb_build_object(
        'booking_id', NEW.id,
        'class_session_id', NEW.class_session_id,
        'member_id', NEW.user_id,
        'member_name', v_member_name,
        'discipline', v_discipline,
        'session_type', v_session_type_code,
        'session_type_label', v_session_type_label,
        'is_late_cancellation', COALESCE(NEW.is_late_cancellation, FALSE),
        'starts_at', v_starts_at
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_cancelled_notify ON public.bookings;
CREATE TRIGGER trg_booking_cancelled_notify
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status = 'confirmed' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION public.on_booking_cancelled_notify();

-- =============================================================================
-- 2. NOTIFICATIONS DE NOUVELLE INSCRIPTION MEMBRE (ADMIN)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.on_member_registered_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_member_name TEXT := 'Un nouveau membre';
  v_admin_message TEXT;
BEGIN
  IF (COALESCE(NEW.first_name, '') <> '' OR COALESCE(NEW.last_name, '') <> '') THEN
    v_member_name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  END IF;

  v_admin_message := v_member_name || ' vient de créer son compte et de rejoindre le Striking Camp.';

  -- Insertion Notification Admin (avec protection anti-doublon par member_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE target_role = 'admin'
      AND type = 'new_registration'
      AND (metadata->>'member_id') = NEW.id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      target_role,
      type,
      title,
      message,
      action_url,
      action_label,
      metadata,
      is_read,
      read_at,
      created_at
    ) VALUES (
      NULL,
      'admin',
      'new_registration',
      'Nouveau membre inscrit',
      v_admin_message,
      '/admin/membres',
      'Voir les membres',
      jsonb_build_object(
        'member_id', NEW.id,
        'member_name', v_member_name,
        'phone', NEW.phone,
        'registered_at', NOW()
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_registered_notify ON public.profiles;
CREATE TRIGGER trg_member_registered_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_member_registered_notify();

-- =============================================================================
-- 3. NOTIFICATIONS DE DÉFI TERMINÉ (MEMBRE + ADMIN)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.on_challenge_completed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_challenge RECORD;
  v_profile RECORD;
  v_member_name TEXT := 'Un membre';
  v_challenge_title TEXT := 'Défi';
  v_points_xp INT := 500;
  v_member_message TEXT;
  v_admin_message TEXT;
BEGIN
  -- Déclenché uniquement lors de la complétion (status = 'completed')
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- 1. Récupération des informations du profil membre
  SELECT first_name, last_name
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_profile IS NOT NULL AND (COALESCE(v_profile.first_name, '') <> '' OR COALESCE(v_profile.last_name, '') <> '') THEN
    v_member_name := TRIM(CONCAT(COALESCE(v_profile.first_name, ''), ' ', COALESCE(v_profile.last_name, '')));
  END IF;

  -- 2. Récupération des informations du défi
  SELECT title, category, points_xp, badge_reward
  INTO v_challenge
  FROM public.challenges
  WHERE id = NEW.challenge_id;

  IF v_challenge IS NOT NULL THEN
    v_challenge_title := COALESCE(v_challenge.title, 'Défi');
    v_points_xp := COALESCE(v_challenge.points_xp, 500);
  END IF;

  -- 3. Construction des messages
  v_member_message := 'Félicitations ! Vous avez validé avec succès l''intégralité du défi "' || v_challenge_title || '" (+' || v_points_xp || ' XP).';
  v_admin_message := v_member_name || ' a terminé avec succès le défi "' || v_challenge_title || '" (+' || v_points_xp || ' XP).';

  -- 4. Insertion Notification Membre (avec protection anti-doublon)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND target_role = 'member'
      AND type = 'challenge_completed'
      AND (metadata->>'challenge_id') = NEW.challenge_id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      target_role,
      type,
      title,
      message,
      action_url,
      action_label,
      metadata,
      is_read,
      read_at,
      created_at
    ) VALUES (
      NEW.user_id,
      'member',
      'challenge_completed',
      'Défi accompli !',
      v_member_message,
      '/membre/defis',
      'Voir mes défis',
      jsonb_build_object(
        'challenge_id', NEW.challenge_id,
        'challenge_title', v_challenge_title,
        'points_xp', v_points_xp,
        'badge_reward', v_challenge.badge_reward,
        'completed_at', COALESCE(NEW.completed_at, NOW())
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  -- 5. Insertion Notification Admin (avec protection anti-doublon)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE target_role = 'admin'
      AND type = 'challenge_completed'
      AND (metadata->>'challenge_id') = NEW.challenge_id::text
      AND (metadata->>'member_id') = NEW.user_id::text
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      target_role,
      type,
      title,
      message,
      action_url,
      action_label,
      metadata,
      is_read,
      read_at,
      created_at
    ) VALUES (
      NULL,
      'admin',
      'challenge_completed',
      'Défi terminé par un membre',
      v_admin_message,
      '/admin/defis',
      'Voir les défis',
      jsonb_build_object(
        'challenge_id', NEW.challenge_id,
        'challenge_title', v_challenge_title,
        'member_id', NEW.user_id,
        'member_name', v_member_name,
        'points_xp', v_points_xp,
        'completed_at', COALESCE(NEW.completed_at, NOW())
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_completed_notify ON public.user_challenge_progress;
CREATE TRIGGER trg_challenge_completed_notify
  AFTER INSERT OR UPDATE OF status ON public.user_challenge_progress
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.on_challenge_completed_notify();

COMMIT;
