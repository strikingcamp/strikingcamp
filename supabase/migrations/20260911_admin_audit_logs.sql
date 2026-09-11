-- =============================================================================
-- STRIKING CAMP — MIGRATION : 20260911_admin_audit_logs.sql
-- Description : Table de traçabilité immuable des actions d'administration.
--               - Enregistrement des mutations et opérations sensibles
--               - Protection RLS stricte (accès réservé à public.is_admin())
--               - Immuabilité garantie par trigger SQL (interdiction UPDATE / DELETE)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'SYSTEM',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexation pour performances de recherche et tri chronologique
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id
  ON public.admin_audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category
  ON public.admin_audit_logs(category);

-- Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Politique SELECT : uniquement les administrateurs validés
DROP POLICY IF EXISTS "admin_audit_logs_select_policy" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select_policy" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2. Politique INSERT : uniquement les administrateurs pour leur propre UID
DROP POLICY IF EXISTS "admin_audit_logs_insert_policy" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert_policy" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- 3. Trigger d'immuabilité absolue (interdiction formelle de toute modification ou suppression)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Les enregistrements du journal d''audit sont strictement immuables (modification et suppression interdites).';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 4. Attribution des privilèges stricts
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
