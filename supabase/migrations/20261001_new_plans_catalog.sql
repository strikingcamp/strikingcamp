-- =============================================================================
-- Migration : 20261001_new_plans_catalog.sql
-- Description : Nettoyage et restructuration complète du catalogue des formules
--               - Conservation stricte des formules Cours Privés (8 séances)
--               - Désactivation sécurisée des anciennes formules non privées
--               - Création des 4 nouvelles formules :
--                   * Cours Adulte - Essentiel (499 € / an)
--                   * Cours Adulte - All Access (890 € / an - Recommandé)
--                   * Lady Striking (499 € / an)
--                   * Kid Boxing (349 € / saison)
-- =============================================================================

BEGIN;

-- 1. Désactivation des anciennes formules pour préserver les clés étrangères et abonnements historiques
UPDATE public.plans
SET is_active = FALSE,
    updated_at = NOW()
WHERE code IN ('sg_monthly', 'sg_annual', 'col_annual', 'priv_monthly_12', 'priv_annual_12')
   OR (type = 'small_group' AND code NOT IN ('adult_essential', 'adult_all_access', 'lady_striking_annual', 'kid_boxing_season'));

-- 2. Suppression de l'ancien plan collectif mensuel s'il n'a aucune subscription rattachée
DELETE FROM public.plans
WHERE code = 'col_monthly'
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE plan_id = public.plans.id)
  AND NOT EXISTS (SELECT 1 FROM public.membership_requests WHERE plan_id = public.plans.id);

-- 3. Insertion / Mise à jour idempotente des nouvelles formules
-- A. COURS ADULTE — ESSENTIEL (499 € / an)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active, allows_small_group, allows_private, allows_collective
) VALUES (
  'adult_essential', 'Essentiel', 'small_group', 'annual', 49900, 1, TRUE, TRUE, FALSE, FALSE
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
  updated_at = NOW();

-- B. COURS ADULTE — ALL ACCESS (890 € / an)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active, allows_small_group, allows_private, allows_collective
) VALUES (
  'adult_all_access', 'All Access', 'small_group', 'annual', 89000, 2, TRUE, TRUE, FALSE, FALSE
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
  updated_at = NOW();

-- C. LADY STRIKING (499 € / an)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active, allows_small_group, allows_private, allows_collective
) VALUES (
  'lady_striking_annual', 'Lady Striking', 'small_group', 'annual', 49900, 3, TRUE, TRUE, FALSE, FALSE
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
  updated_at = NOW();

-- D. KID BOXING (349 € / saison)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active, allows_small_group, allows_private, allows_collective
) VALUES (
  'kid_boxing_season', 'Kid Boxing', 'small_group', 'annual', 34900, 4, TRUE, TRUE, FALSE, FALSE
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
  updated_at = NOW();

-- 4. Normalisation de l'affichage des formules de Cours Privés
UPDATE public.plans
SET display_order = 5, is_active = TRUE, updated_at = NOW()
WHERE code = 'priv_monthly_8';

UPDATE public.plans
SET display_order = 6, is_active = TRUE, updated_at = NOW()
WHERE code = 'priv_annual_8';

NOTIFY pgrst, 'reload schema';

COMMIT;
