-- =============================================================================
-- STRIKING CAMP — NORMALISATION DES NIVEAUX SMALL GROUP & RÈGLE LADY STRIKING
-- FICHIER : 20260925_normalize_small_group_levels_and_lady_striking.sql
-- =============================================================================
-- Objectifs :
-- 1. Règle stricte Lady Striking : niveau toujours "100% féminin".
-- 2. Normalisation des anciens niveaux "Sparring" vers "Elite".
-- 3. ZÉRO impact sur les réservations, abonnements, cours privés ou tarifs.
-- =============================================================================

BEGIN;

-- 1. NORMALISATION DANS RECURRING_SCHEDULE_TEMPLATES (SEMAINE TYPE)

-- A. Lady Striking -> 100% féminin
UPDATE public.recurring_schedule_templates
SET level = '100% féminin', updated_at = NOW()
WHERE type = 'small_group'
  AND discipline = 'Lady Striking'
  AND level <> '100% féminin';

-- B. Anciens 'Sparring' / 'Élite' pour les autres disciplines Small Group -> 'Elite'
UPDATE public.recurring_schedule_templates
SET level = 'Elite', updated_at = NOW()
WHERE type = 'small_group'
  AND discipline <> 'Lady Striking'
  AND level IN ('Sparring', 'sparring', 'Élite', 'élite', 'Sparring / Élite');

-- C. Cas où une discipline autre que Lady Striking avait '100% féminin' -> 'Fondamentaux'
UPDATE public.recurring_schedule_templates
SET level = 'Fondamentaux', updated_at = NOW()
WHERE type = 'small_group'
  AND discipline <> 'Lady Striking'
  AND level IN ('100% féminin', '100% feminin', 'Cours féminin', 'cours féminin');


-- 2. NORMALISATION DANS CLASS_SESSIONS (SÉANCES PHYSIQUES DATÉES)

-- A. Lady Striking -> 100% féminin
UPDATE public.class_sessions
SET level = '100% féminin'
WHERE type = 'small_group'
  AND discipline = 'Lady Striking'
  AND level <> '100% féminin';

-- B. Anciens 'Sparring' / 'Élite' pour les autres disciplines Small Group -> 'Elite'
UPDATE public.class_sessions
SET level = 'Elite'
WHERE type = 'small_group'
  AND discipline <> 'Lady Striking'
  AND level IN ('Sparring', 'sparring', 'Élite', 'élite', 'Sparring / Élite');

-- C. Cas où une discipline autre que Lady Striking avait '100% féminin' -> 'Fondamentaux'
UPDATE public.class_sessions
SET level = 'Fondamentaux'
WHERE type = 'small_group'
  AND discipline <> 'Lady Striking'
  AND level IN ('100% féminin', '100% feminin', 'Cours féminin', 'cours féminin');

COMMIT;
