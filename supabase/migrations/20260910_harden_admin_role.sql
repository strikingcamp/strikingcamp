-- =============================================================================
-- Migration : 20260910_harden_admin_role.sql
-- Description : 
--   Durcissement strict de public.is_admin() pour éliminer toute possibilité
--   d'élévation de privilèges via user_metadata ou raw_user_meta_data.
--   Source unique de vérité pour le rôle ADMIN :
--     - Token JWT service_role
--     - auth.jwt()->'app_metadata'->>'role' = 'ADMIN'
--     - auth.users.raw_app_meta_data->>'role' = 'ADMIN'
-- =============================================================================

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
  -- 1. Extraction prioritaire depuis les claims du token JWT (auth.jwt())
  BEGIN
    v_claims := auth.jwt();
    IF v_claims IS NOT NULL THEN
      -- A. Le rôle service_role de Supabase dispose des droits d'administration
      IF COALESCE(v_claims->>'role', '') = 'service_role' THEN
        RETURN TRUE;
      END IF;

      -- B. Vérification stricte du rôle exclusivement dans app_metadata (non modifiable par l'utilisateur)
      v_jwt_role := COALESCE(v_claims->'app_metadata'->>'role', '');

      IF UPPER(v_jwt_role) = 'ADMIN' THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- 2. Fallback sécurisé : consultation directe dans auth.users via auth.uid()
  -- STRICTEMENT dans raw_app_meta_data (jamais dans raw_user_meta_data)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (COALESCE(raw_app_meta_data->>'role', ''))
  INTO v_db_role
  FROM auth.users
  WHERE id = v_user_id;

  RETURN (UPPER(COALESCE(v_db_role, '')) = 'ADMIN');
END;
$$;

-- Révocation et réattribution des privilèges minimaux
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
