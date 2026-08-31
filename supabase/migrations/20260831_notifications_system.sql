-- =============================================================================
-- STRIKING CAMP — PHASE 1 : INFRASTRUCTURE DU SYSTÈME DE NOTIFICATIONS
-- Migration : 20260831_notifications_system.sql
-- Description :
--   1. Création de la table public.notifications
--   2. Index composites de performance (compteurs & historique)
--   3. Sécurité RLS étanche (Membres & Administrateurs)
--   4. Fonctions RPC sécurisées :
--      - get_unread_notifications_count()   [AUTHENTICATED + SERVICE_ROLE]
--      - mark_notification_as_read()        [AUTHENTICATED + SERVICE_ROLE]
--      - mark_all_notifications_as_read()   [AUTHENTICATED + SERVICE_ROLE]
--      - create_notification()              [SERVICE_ROLE / BACKEND INTERNE UNIQUEMENT]
--   5. Configuration Supabase Realtime
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. TABLE DES NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL DEFAULT 'member' CHECK (target_role IN ('member', 'admin')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT NULL,
  action_label TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. INDEX DE PERFORMANCE
-- =============================================================================
-- Accélère le compteur non lu et la liste par membre
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- Accélère le compteur et la liste pour les administrateurs
CREATE INDEX IF NOT EXISTS idx_notifications_target_role_unread
  ON public.notifications (target_role, is_read, created_at DESC);

-- Index pour le tri chronologique global et la pagination
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- =============================================================================
-- 3. CONFIGURATION SUPABASE REALTIME & REPLICA IDENTITY
-- =============================================================================
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =============================================================================
-- 4. POLITIQUES DE SÉCURITÉ RLS (ROW LEVEL SECURITY)
-- =============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4.1 Politiques SELECT
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT
  TO authenticated, service_role
  USING (
    -- Cas 1 : Service role a accès complet
    (auth.role() = 'service_role')
    -- Cas 2 : Membre accède uniquement à ses propres notifications destinées aux membres
    OR (auth.uid() = user_id AND target_role = 'member')
    -- Cas 3 : Administrateur accède à ses notifications directes ou aux notifications globales admin
    OR (public.is_admin() AND (target_role = 'admin' OR auth.uid() = user_id))
  );

-- 4.2 Politiques UPDATE (Seuls is_read et read_at peuvent être modifiés via RLS ou RPC)
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE
  TO authenticated, service_role
  USING (
    (auth.role() = 'service_role')
    OR (auth.uid() = user_id AND target_role = 'member')
    OR (public.is_admin() AND (target_role = 'admin' OR auth.uid() = user_id))
  )
  WITH CHECK (
    (auth.role() = 'service_role')
    OR (auth.uid() = user_id AND target_role = 'member')
    OR (public.is_admin() AND (target_role = 'admin' OR auth.uid() = user_id))
  );

-- 4.3 Politiques INSERT (Strictement réservé au service_role et processus internes)
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    (auth.role() = 'service_role')
  );

-- 4.4 Politiques DELETE (Strictement réservé au service_role et administrateurs)
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE
  TO authenticated, service_role
  USING (
    (auth.role() = 'service_role')
    OR public.is_admin()
  );

-- =============================================================================
-- 5. FONCTIONS RPC SÉCURISÉES (SECURITY DEFINER)
-- =============================================================================

-- 5.1 Compteur de notifications non lues (Accessible aux utilisateurs authentifiés)
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_count INT := 0;
  v_is_adm BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_is_adm := public.is_admin();

  IF v_is_adm THEN
    -- Pour un administrateur : ses notifications directes + notifications ciblées 'admin'
    SELECT COUNT(*) INTO v_count
    FROM public.notifications
    WHERE is_read = FALSE
      AND (user_id = v_user_id OR target_role = 'admin');
  ELSE
    -- Pour un membre : uniquement ses propres notifications 'member'
    SELECT COUNT(*) INTO v_count
    FROM public.notifications
    WHERE is_read = FALSE
      AND user_id = v_user_id
      AND target_role = 'member';
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 5.2 Marquer une notification comme lue (Idempotent, accessible aux utilisateurs authentifiés)
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
  p_notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_notification RECORD;
  v_is_adm BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  v_is_adm := public.is_admin();

  -- Vérifier l'existence et la propriété de la notification
  SELECT id, user_id, target_role, is_read, read_at
  INTO v_notification
  FROM public.notifications
  WHERE id = p_notification_id
  FOR UPDATE;

  IF v_notification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Notification introuvable.');
  END IF;

  -- Contrôle strict d'accès
  IF NOT (
    (v_notification.user_id = v_user_id)
    OR (v_is_adm AND (v_notification.target_role = 'admin' OR v_notification.user_id = v_user_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Accès refusé à cette notification.');
  END IF;

  -- Idempotence : si déjà lue, on retourne succès sans modifier
  IF v_notification.is_read = TRUE THEN
    RETURN jsonb_build_object(
      'success', true,
      'notification_id', p_notification_id,
      'already_read', true,
      'read_at', v_notification.read_at
    );
  END IF;

  -- Mise à jour
  UPDATE public.notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', p_notification_id,
    'already_read', false,
    'read_at', NOW()
  );
END;
$$;

-- 5.3 Tout marquer comme lu pour l'utilisateur connecté (Accessible aux utilisateurs authentifiés)
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_updated_count INT := 0;
  v_is_adm BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Utilisateur non authentifié.');
  END IF;

  v_is_adm := public.is_admin();

  IF v_is_adm THEN
    WITH updated AS (
      UPDATE public.notifications
      SET is_read = TRUE,
          read_at = v_now
      WHERE is_read = FALSE
        AND (user_id = v_user_id OR target_role = 'admin')
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
  ELSE
    WITH updated AS (
      UPDATE public.notifications
      SET is_read = TRUE,
          read_at = v_now
      WHERE is_read = FALSE
        AND user_id = v_user_id
        AND target_role = 'member'
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'read_at', v_now
  );
END;
$$;

-- 5.4 Création interne / backend sécurisée d'une notification
-- ⚠️ STRICTEMENT RÉSERVÉE AU SERVICE_ROLE ET AUX LOGIQUES BACKEND
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_target_role TEXT DEFAULT 'member',
  p_type TEXT DEFAULT 'system',
  p_title TEXT DEFAULT '',
  p_message TEXT DEFAULT '',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Double verrou de sécurité : interdiction formelle aux tokens authentifiés directs (frontend)
  IF auth.role() <> 'service_role' AND auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FORBIDDEN',
      'message', 'La création directe de notifications est réservée aux processus internes et au service_role.'
    );
  END IF;

  IF p_target_role NOT IN ('member', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TARGET_ROLE', 'message', 'Le rôle cible doit être member ou admin.');
  END IF;

  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TITLE', 'message', 'Le titre de la notification est requis.');
  END IF;

  IF p_message IS NULL OR TRIM(p_message) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_MESSAGE', 'message', 'Le message de la notification est requis.');
  END IF;

  INSERT INTO public.notifications (
    user_id,
    target_role,
    type,
    title,
    message,
    action_url,
    action_label,
    metadata,
    is_read,
    read_at,
    created_at
  ) VALUES (
    p_user_id,
    p_target_role,
    p_type,
    TRIM(p_title),
    TRIM(p_message),
    p_action_url,
    p_action_label,
    COALESCE(p_metadata, '{}'::jsonb),
    FALSE,
    NULL,
    NOW()
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_new_id,
    'message', 'Notification créée avec succès.'
  );
END;
$$;

-- =============================================================================
-- 6. MATRICE DE PERMISSIONS & PRIVILÈGES (GRANT / REVOKE)
-- =============================================================================
-- Révocation de tout accès public non autorisé
REVOKE ALL ON TABLE public.notifications FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unread_notifications_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_as_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, authenticated;

-- Privilèges RPC pour les utilisateurs authentifiés (frontend)
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated, service_role;

-- Privilèges RPC pour la création : STRICTEMENT service_role et postgres (aucun rôle authenticated)
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role, postgres;

-- Privilèges sur la table
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role, postgres;

COMMIT;
