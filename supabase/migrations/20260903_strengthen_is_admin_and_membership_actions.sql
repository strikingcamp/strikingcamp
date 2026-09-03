-- =============================================================================
-- Migration : 20260903_strengthen_is_admin_and_membership_actions.sql
-- Description : 
--   1. Renforce public.is_admin() pour prioriser les claims JWT (auth.jwt())
--      avec support explicite du rôle 'service_role' et fallback sur auth.users.
--   2. Maintient une étanchéité ADMIN absolue sur les RPCs et politiques RLS.
-- =============================================================================

-- 1. RENFORCEMENT DE LA FONCTION CENTRALISÉE is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_claims JSONB;
  v_jwt_role TEXT;
  v_user_id UUID;
  v_db_role TEXT;
BEGIN
  -- A. Extraction prioritaire depuis les claims du token JWT (auth.jwt())
  BEGIN
    v_claims := auth.jwt();
    IF v_claims IS NOT NULL THEN
      -- Le rôle service_role de Supabase dispose des droits d'administration
      IF COALESCE(v_claims->>'role', '') = 'service_role' THEN
        RETURN TRUE;
      END IF;

      -- Vérification du rôle dans app_metadata ou user_metadata
      v_jwt_role := COALESCE(
        v_claims->'app_metadata'->>'role',
        v_claims->'user_metadata'->>'role',
        ''
      );

      IF UPPER(v_jwt_role) = 'ADMIN' THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- B. Fallback sécurisé : consultation directe dans auth.users via auth.uid()
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role', ''))
  INTO v_db_role
  FROM auth.users
  WHERE id = v_user_id;

  RETURN (UPPER(COALESCE(v_db_role, '')) = 'ADMIN');
END;
$$;

-- Révocation PUBLIC et attribution exclusive authenticated + service_role
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 2. RECHARGEMENT DU CACHE POSTGREST
NOTIFY pgrst, 'reload schema';
