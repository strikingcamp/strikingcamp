-- =============================================================================
-- STRIKING CAMP — PERMISSIONS & PERSISTANCE DU FEATURE FLAGGING SERVICES
-- Date : 2026-09-01
-- =============================================================================

BEGIN;

-- 1. Table service_settings
CREATE TABLE IF NOT EXISTS public.service_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT UNIQUE NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Privilèges sur la table service_settings
GRANT ALL ON TABLE public.service_settings TO postgres, service_role;
GRANT SELECT ON TABLE public.service_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON TABLE public.service_settings TO authenticated;

-- 3. Politiques RLS (Lecture publique, Modification réservée aux admins)
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_settings_select_all" ON public.service_settings;
CREATE POLICY "service_settings_select_all"
  ON public.service_settings
  FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "service_settings_admin_update" ON public.service_settings;
CREATE POLICY "service_settings_admin_update"
  ON public.service_settings
  FOR ALL
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Initialisation des lignes de services
INSERT INTO public.service_settings (service_key, service_name, description, is_active)
VALUES
  ('private', 'Cours privés', 'Réservations individuelles sur-mesure avec coach (50 min).', true),
  ('small_group', 'Small Group', 'Cours en petit groupe avec capacité limitée à 20 personnes.', false),
  ('events', 'Événements', 'Stages, camps d''entraînement intensifs et événements Striking Camp.', true)
ON CONFLICT (service_key) DO UPDATE SET
  service_name = EXCLUDED.service_name,
  description = EXCLUDED.description;

-- 5. Fonctions RPC sécurisées
CREATE OR REPLACE FUNCTION public.is_service_active(p_service_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_active
  FROM public.service_settings
  WHERE service_key = p_service_key;

  IF NOT FOUND THEN
    IF p_service_key = 'small_group' THEN
      RETURN false;
    ELSE
      RETURN true;
    END IF;
  END IF;

  RETURN COALESCE(v_active, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_service_status(
  p_service_key TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'Seuls les administrateurs peuvent modifier le statut des services.'
    );
  END IF;

  UPDATE public.service_settings
  SET
    is_active = p_is_active,
    updated_at = timezone('utc'::text, now())
  WHERE service_key = p_service_key;

  IF NOT FOUND THEN
    INSERT INTO public.service_settings (service_key, service_name, is_active)
    VALUES (
      p_service_key,
      CASE p_service_key
        WHEN 'private' THEN 'Cours privés'
        WHEN 'small_group' THEN 'Small Group'
        WHEN 'events' THEN 'Événements'
        ELSE p_service_key
      END,
      p_is_active
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'service_key', p_service_key,
    'is_active', p_is_active,
    'message', 'Statut du service mis à jour avec succès.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_service_active(TEXT) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_service_status(TEXT, BOOLEAN) TO authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;
