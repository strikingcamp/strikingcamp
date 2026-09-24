-- =============================================================================
-- Migration: Mise à jour du tarif Small Group Mensuel (89 € / mois)
-- Date: 2026-09-24
-- =============================================================================

UPDATE public.plans
SET price_cents = 8900,
    updated_at = NOW()
WHERE code = 'sg_monthly';
