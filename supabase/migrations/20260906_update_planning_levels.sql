-- =============================================================================
-- STRIKING CAMP — MIGRATION DES NIVEAUX DE PLANNING (DML PUR SANS DELETE)
-- FICHIER : 20260906_update_planning_levels.sql
-- =============================================================================
-- Nouveaux niveaux officiels :
--   1. Fondamentaux   → Inchangé (Vert)
--   2. Drills         → Conversion depuis 'Performance' (Bleu cyan)
--   3. Cardio         → Inchangé (Violet)
--   4. 100% féminin   → Conversion depuis 'Cours féminin' (Rose)
--   5. Sparring       → Conversion depuis 'Élite' / 'Elite' (Rouge)
--
-- RÈGLES STRICTES :
--   - ZÉRO suppression (aucun DELETE).
--   - ZÉRO modification structurelle (DDL inchangé).
--   - ZÉRO impact sur les réservations (bookings, trial_bookings) ou abonnements.
--   - Préservation stricte de 'Tous niveaux (Accès libre)' pour les collectifs.
--   - Préservation stricte de 'Individuel' pour les cours privés.
-- =============================================================================

BEGIN;

-- 1. CONVERSION DANS RECURRING_SCHEDULE_TEMPLATES (SEMAINE TYPE OFFICIELLE)
UPDATE public.recurring_schedule_templates
SET level = 'Drills', updated_at = NOW()
WHERE level IN ('Performance', 'performance');

UPDATE public.recurring_schedule_templates
SET level = '100% féminin', updated_at = NOW()
WHERE level IN ('Cours féminin', 'cours féminin', 'Cours feminin', 'cours feminin', 'Féminin', 'feminin', 'Lady Striking');

UPDATE public.recurring_schedule_templates
SET level = 'Sparring', updated_at = NOW()
WHERE level IN ('Élite', 'élite', 'Elite', 'elite', 'Sparring / Élite');

-- 2. CONVERSION DANS CLASS_SESSIONS (SÉANCES PHYSIQUES DATÉES PASSÉES ET FUTURES)
UPDATE public.class_sessions
SET level = 'Drills'
WHERE level IN ('Performance', 'performance');

UPDATE public.class_sessions
SET level = '100% féminin'
WHERE level IN ('Cours féminin', 'cours féminin', 'Cours feminin', 'cours feminin', 'Féminin', 'feminin', 'Lady Striking');

UPDATE public.class_sessions
SET level = 'Sparring'
WHERE level IN ('Élite', 'élite', 'Elite', 'elite', 'Sparring / Élite');

COMMIT;
