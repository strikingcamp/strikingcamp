-- =============================================================================
-- STRIKING CAMP — ÉTAPE 1 : SYSTÈME DE RAPPELS ET NOTIFICATIONS
-- Date : 2026-10-06
-- Fichier : 20261006_notifications_reminders_system.sql
-- Description :
--   Création de la couche de persistance pour les futurs rappels et notifications :
--   1. user_notification_preferences (préférences & horaires de rappel par utilisateur)
--   2. user_push_subscriptions (appareils & souscriptions Web Push)
--   3. notification_logs (historique et traçabilité des notifications envoyées)
--   Activation stricte du Row Level Security (RLS), isolation utilisateur et
--   verrouillage strict d'intégrité sur les colonnes des logs.
-- =============================================================================

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. TABLE : user_notification_preferences
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled_global BOOLEAN NOT NULL DEFAULT true,
  enabled_meals BOOLEAN NOT NULL DEFAULT true,
  enabled_workouts BOOLEAN NOT NULL DEFAULT true,
  enabled_hydration BOOLEAN NOT NULL DEFAULT false,
  reminder_breakfast_time TIME NOT NULL DEFAULT '08:00:00',
  reminder_lunch_time TIME NOT NULL DEFAULT '12:30:00',
  reminder_dinner_time TIME NOT NULL DEFAULT '19:30:00',
  reminder_snack_time TIME NOT NULL DEFAULT '16:30:00',
  reminder_workout_time TIME NOT NULL DEFAULT '18:00:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.handle_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER trg_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_notification_preferences_updated_at();

-- RLS & Policies pour user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
ON public.user_notification_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can insert their own notification preferences"
ON public.user_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
ON public.user_notification_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can delete their own notification preferences"
ON public.user_notification_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. TABLE : user_push_subscriptions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id 
ON public.user_push_subscriptions(user_id);

-- RLS & Policies pour user_push_subscriptions
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
ON public.user_push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
ON public.user_push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
ON public.user_push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. TABLE : notification_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN (
      'meal_breakfast',
      'meal_lunch',
      'meal_dinner',
      'meal_snack',
      'workout_digital',
      'workout_club',
      'general'
    )
  ),
  channel TEXT NOT NULL CHECK (
    channel IN (
      'in_app',
      'web_push',
      'mobile_push',
      'email'
    )
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_completed BOOLEAN NOT NULL DEFAULT false,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_date_cat 
ON public.notification_logs(user_id, scheduled_date, category);

-- RLS & Policies pour notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification logs" ON public.notification_logs;
CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification logs read and completion status" ON public.notification_logs;
CREATE POLICY "Users can update their own notification logs read and completion status"
ON public.notification_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger de protection : garantit qu'un utilisateur authenticated ne peut modifier QUE is_read et action_completed
CREATE OR REPLACE FUNCTION public.handle_notification_logs_update_protection()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user <> 'service_role' AND auth.role() = 'authenticated' THEN
    IF NEW.id <> OLD.id OR
       NEW.user_id <> OLD.user_id OR
       NEW.category <> OLD.category OR
       NEW.channel <> OLD.channel OR
       NEW.title <> OLD.title OR
       NEW.body <> OLD.body OR
       NEW.action_url IS DISTINCT FROM OLD.action_url OR
       NEW.scheduled_date <> OLD.scheduled_date OR
       NEW.sent_at <> OLD.sent_at THEN
      RAISE EXCEPTION 'Modification non autorisée : seules les colonnes is_read et action_completed peuvent être modifiées.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_logs_update_protection ON public.notification_logs;
CREATE TRIGGER trg_notification_logs_update_protection
BEFORE UPDATE ON public.notification_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_notification_logs_update_protection();

-- Note de sécurité : AUCUNE policy INSERT/DELETE pour authenticated ou anon sur notification_logs.
-- Les insertions de logs seront exécutées de manière sécurisée côté serveur via service_role.

-- Rechargement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
