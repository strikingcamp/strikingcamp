-- =============================================================================
-- Migration : 20260928_normalize_private_plans_8_sessions.sql
-- Description : Normalisation ciblée des formules officielles Cours Privés (8 séances)
--               et désactivation sécurisée (is_active = false) des anciennes formules 12 séances.
-- Sécurité : AUCUN DELETE. Préservation intégrale des abonnements et clés étrangères.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ÉTAPE 0 : REQUÊTE D'AUDIT PRÉALABLE (À exécuter pour vérification visuelle)
-- -----------------------------------------------------------------------------
-- SELECT id, code, name, type, commitment, price_cents, private_sessions_per_period, is_active
-- FROM public.plans
-- WHERE type = 'private' OR LOWER(name) LIKE '%privé%' OR LOWER(name) LIKE '%prive%'
-- ORDER BY commitment, private_sessions_per_period;

BEGIN;

-- 1. Désactivation ciblée et stricte des anciennes formules privées 12 séances
-- Condition stricte : uniquement type = 'private' ou intitulé Cours Privé portant la mention 12 séances.
UPDATE public.plans
SET is_active = FALSE,
    updated_at = NOW()
WHERE (
  (type = 'private' OR LOWER(COALESCE(name, '')) LIKE '%privé%' OR LOWER(COALESCE(name, '')) LIKE '%prive%')
  AND (
    private_sessions_per_period = 12
    OR LOWER(COALESCE(name, '')) LIKE '%12 séance%'
    OR LOWER(COALESCE(name, '')) LIKE '%12 seance%'
    OR LOWER(COALESCE(name, '')) LIKE '%(12%'
  )
);

-- 2. Normalisation des formules officielles Cours Privés (8 séances / mois)
-- Formule Mensuelle officielle (8 séances)
UPDATE public.plans
SET type = 'private',
    private_sessions_per_period = 8,
    allows_private = TRUE,
    allows_small_group = TRUE,
    allows_collective = FALSE,
    is_active = TRUE,
    updated_at = NOW()
WHERE (
  (type = 'private' OR LOWER(name) LIKE '%privé%' OR LOWER(name) LIKE '%prive%')
  AND commitment = 'monthly'
  AND (private_sessions_per_period = 8 OR private_sessions_per_period IS NULL OR LOWER(COALESCE(name, '')) NOT LIKE '%12%')
);

-- Formule Annuelle officielle (8 séances)
UPDATE public.plans
SET type = 'private',
    private_sessions_per_period = 8,
    allows_private = TRUE,
    allows_small_group = TRUE,
    allows_collective = FALSE,
    is_active = TRUE,
    updated_at = NOW()
WHERE (
  (type = 'private' OR LOWER(name) LIKE '%privé%' OR LOWER(name) LIKE '%prive%')
  AND commitment = 'annual'
  AND (private_sessions_per_period = 8 OR private_sessions_per_period IS NULL OR LOWER(COALESCE(name, '')) NOT LIKE '%12%')
);

-- Notification de rechargement du schéma d'API PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- -----------------------------------------------------------------------------
-- ÉTAPE POST-MIGRATION : REQUÊTE DE CONTRÔLE FINAL
-- -----------------------------------------------------------------------------
-- SELECT id, code, name, type, commitment, price_cents, private_sessions_per_period, is_active
-- FROM public.plans
-- WHERE type = 'private' OR LOWER(name) LIKE '%privé%' OR LOWER(name) LIKE '%prive%'
-- ORDER BY is_active DESC, commitment;
