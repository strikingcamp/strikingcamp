-- =============================================================================
-- STRIKING CAMP — PHASE 3A : NOTIFICATIONS AUTOMATIQUES DES RÉSERVATIONS
-- Migration : 20260831_booking_notifications.sql
-- Description :
--   1. Trigger automatique AFTER INSERT sur public.bookings
--   2. Création atomique côté serveur de la notification Membre (booking_confirmed)
--   3. Création atomique côté serveur de la notification Admin (new_booking)
--   4. Formatage dynamique en français (discipline, type, date et heure)
--   5. Protection anti-doublon native intégrée par booking_id
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.on_booking_created_notify()
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
  -- Déclenché uniquement lors d'une réservation confirmée
  IF NEW.status <> 'confirmed' THEN
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
  v_member_message := 'Votre réservation pour la séance ' || v_discipline || ' (' || v_session_type_label || ') du ' || v_formatted_date || ' est confirmée.';
  v_admin_message := v_member_name || ' a réservé une séance de ' || v_discipline || ' (' || v_session_type_label || ') pour le ' || v_formatted_date || '.';

  -- 4. Insertion Notification Membre (avec protection anti-doublon stricte par booking_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND target_role = 'member'
      AND type = 'booking_confirmed'
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
      'booking_confirmed',
      'Réservation confirmée',
      v_member_message,
      '/membre/planning',
      'Voir mon planning',
      jsonb_build_object(
        'booking_id', NEW.id,
        'class_session_id', NEW.class_session_id,
        'discipline', v_discipline,
        'session_type', v_session_type_code,
        'session_type_label', v_session_type_label,
        'starts_at', v_starts_at
      ),
      FALSE,
      NULL,
      NOW()
    );
  END IF;

  -- 5. Insertion Notification Admin (avec protection anti-doublon stricte par booking_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE target_role = 'admin'
      AND type = 'new_booking'
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
      'new_booking',
      'Nouvelle réservation',
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

-- Installation du trigger sur public.bookings
DROP TRIGGER IF EXISTS trg_booking_created_notify ON public.bookings;
CREATE TRIGGER trg_booking_created_notify
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_created_notify();

COMMIT;
