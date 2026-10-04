-- ==============================================================================
-- MIGRATION : 20261007_notification_logs_anti_duplicate_indexes.sql
-- Description : Protection SQL robuste contre les doublons et race conditions sur notification_logs.
--
-- Principes de sécurité :
-- 1. Transaction atomique (BEGIN / COMMIT) : rollback automatique en cas d'erreur.
-- 2. Dédoublonnage préalable non-destructif via ROW_NUMBER() :
--    - Conserve en priorité l'alerte lue (is_read = true) si elle existe.
--    - Conserve sinon l'alerte la plus ancienne (sent_at ASC).
-- 3. Index UNIQUE partiel sur les rappels journaliers (repas et entraînement digital) :
--    - Un seul enregistrement par (user_id, scheduled_date, category).
-- 4. Index UNIQUE partiel sur les cours club physique (workout_club) :
--    - Un enregistrement par cours/séance réservé (user_id, scheduled_date, category, action_url).
-- 5. Rechargement instantané du cache de schéma PostgREST via NOTIFY.
-- ==============================================================================

BEGIN;

-- 1. Nettoyage préalable déterministe des doublons éventuels sur les rappels journaliers
DELETE FROM public.notification_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, scheduled_date, category
             ORDER BY is_read DESC, sent_at ASC, id ASC
           ) AS rn
    FROM public.notification_logs
    WHERE category IN (
      'meal_breakfast',
      'meal_lunch',
      'meal_dinner',
      'meal_snack',
      'workout_digital'
    )
  ) duplicates
  WHERE duplicates.rn > 1
);

-- 2. Nettoyage préalable déterministe des doublons éventuels sur les cours physiques (même séance le même jour)
DELETE FROM public.notification_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, scheduled_date, category, action_url
             ORDER BY is_read DESC, sent_at ASC, id ASC
           ) AS rn
    FROM public.notification_logs
    WHERE category = 'workout_club'
      AND action_url IS NOT NULL
  ) duplicates
  WHERE duplicates.rn > 1
);

-- 3. Index UNIQUE partiel : Rappels de repas et entraînement digital (1 max par jour et par catégorie)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_logs_daily_category
ON public.notification_logs (user_id, scheduled_date, category)
WHERE category IN (
  'meal_breakfast',
  'meal_lunch',
  'meal_dinner',
  'meal_snack',
  'workout_digital'
);

-- 4. Index UNIQUE partiel : Cours physiques en club (1 max par cours/séance spécifique)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_logs_club_session
ON public.notification_logs (user_id, scheduled_date, category, action_url)
WHERE category = 'workout_club' AND action_url IS NOT NULL;

-- 5. Rechargement du cache de schéma PostgREST de Supabase
NOTIFY pgrst, 'reload schema';

COMMIT;
