-- =============================================================================
-- STRIKING CAMP — SUPPRESSION STRICTE DU SYSTÈME DE NOTIFICATIONS
-- Date : 2026-09-01
-- Description :
--   1. Suppression exclusive des 4 triggers liés aux notifications
--   2. Suppression exclusive des 4 fonctions de triggers de notifications
--   3. Suppression exclusive des 4 RPCs dédiées aux notifications
--   4. Retrait de la table notifications de la publication Realtime
--   5. Aucune modification de privilèges ni de tables métiers
-- =============================================================================

BEGIN;

-- 1. Suppression exclusive des triggers de notifications
DROP TRIGGER IF EXISTS trg_booking_created_notify ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_cancelled_notify ON public.bookings;
DROP TRIGGER IF EXISTS trg_member_registered_notify ON public.profiles;
DROP TRIGGER IF EXISTS trg_challenge_completed_notify ON public.user_challenge_progress;

-- 2. Suppression exclusive des fonctions de triggers de notifications
DROP FUNCTION IF EXISTS public.on_booking_created_notify();
DROP FUNCTION IF EXISTS public.on_booking_cancelled_notify();
DROP FUNCTION IF EXISTS public.on_member_registered_notify();
DROP FUNCTION IF EXISTS public.on_challenge_completed_notify();

-- 3. Suppression exclusive des fonctions RPC de notifications
DROP FUNCTION IF EXISTS public.get_unread_notifications_count();
DROP FUNCTION IF EXISTS public.mark_notification_as_read(UUID);
DROP FUNCTION IF EXISTS public.mark_all_notifications_as_read();
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- 4. Retrait de la publication Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Rechargement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
