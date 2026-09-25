-- =============================================================================
-- Migration: 20260925_grant_select_plans_anon.sql
-- Description: Autorise la lecture publique (SELECT) de la table public.plans
--              pour le rôle anon (visiteurs non authentifiés sur /tarifs)
-- =============================================================================

GRANT SELECT ON TABLE public.plans TO anon;
GRANT SELECT ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;
