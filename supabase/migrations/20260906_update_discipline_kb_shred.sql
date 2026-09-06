-- =============================================================================
-- STRIKING CAMP — RENOMMAGE DE DISCIPLINE : BOXING SHRED → KB SHRED
-- FICHIER : 20260906_update_discipline_kb_shred.sql
-- =============================================================================
-- RÈGLES STRICTES :
--   - ZÉRO suppression (aucun DELETE).
--   - ZÉRO modification structurelle (DDL inchangé).
--   - ZÉRO recréation de class_sessions ou modification d'UUID.
--   - ZÉRO modification des tables bookings ou trial_bookings (les réservations
--     conservent leur lien vers la même séance physique class_session).
--   - UPDATE pur sur la colonne discipline de recurring_schedule_templates et class_sessions.
-- =============================================================================

BEGIN;

-- 1. CONVERSION DANS RECURRING_SCHEDULE_TEMPLATES (SEMAINE TYPE OFFICIELLE)
UPDATE public.recurring_schedule_templates
SET discipline = 'KB Shred', updated_at = NOW()
WHERE discipline IN ('Boxing Shred', 'boxing shred', 'Boxing shred');

-- 2. CONVERSION DANS CLASS_SESSIONS (SÉANCES PHYSIQUES DATÉES PASSÉES ET FUTURES)
UPDATE public.class_sessions
SET discipline = 'KB Shred'
WHERE discipline IN ('Boxing Shred', 'boxing shred', 'Boxing shred');

COMMIT;
