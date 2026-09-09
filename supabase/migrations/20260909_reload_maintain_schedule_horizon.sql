-- =============================================================================
-- Migration : 20260909_reload_maintain_schedule_horizon.sql
-- Description : Réaffirme la fonction maintain_schedule_horizon et actualise
--               immédiatement le cache de schéma PostgREST.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.maintain_schedule_horizon(
  p_target_weeks_ahead INT DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_end_date DATE;
  v_reference_latest DATE;
  v_private_latest DATE;
  v_sg_latest DATE;
  v_collective_latest DATE;
  v_next_monday DATE;
  v_missing_weeks INT := 0;
  v_remaining_weeks INT;
  v_chunk_weeks INT;
  v_chunk_monday DATE;
  v_batches_count INT := 0;
  v_last_gen_result JSONB;
BEGIN
  IF p_target_weeks_ahead < 1 THEN
    RAISE EXCEPTION 'p_target_weeks_ahead doit être supérieur ou égal à 1';
  END IF;

  v_target_end_date := (CURRENT_DATE + (p_target_weeks_ahead * 7))::DATE;

  SELECT MAX(starts_at)::DATE
  INTO v_private_latest
  FROM public.class_sessions
  WHERE type = 'private'
    AND is_active = TRUE;

  SELECT MAX(starts_at)::DATE
  INTO v_sg_latest
  FROM public.class_sessions
  WHERE type = 'small_group'
    AND is_active = TRUE;

  SELECT MAX(starts_at)::DATE
  INTO v_collective_latest
  FROM public.class_sessions
  WHERE type = 'collective'
    AND is_active = TRUE;

  SELECT MIN(x.latest_date)
  INTO v_reference_latest
  FROM (
    SELECT v_private_latest AS latest_date
    UNION ALL
    SELECT v_sg_latest
    UNION ALL
    SELECT v_collective_latest
  ) x
  WHERE x.latest_date IS NOT NULL;

  IF v_reference_latest IS NULL THEN

    v_next_monday :=
      (
        CURRENT_DATE
        - (EXTRACT(ISODOW FROM CURRENT_DATE)::INT - 1)
      )::DATE;

    v_missing_weeks := p_target_weeks_ahead;

  ELSIF v_reference_latest < v_target_end_date THEN

    v_next_monday :=
      (
        v_reference_latest
        - (EXTRACT(ISODOW FROM v_reference_latest)::INT - 1)
        + 7
      )::DATE;

    v_missing_weeks :=
      CEIL(
        (v_target_end_date - v_next_monday + 1)::NUMERIC / 7.0
      )::INT;

  ELSE

    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'UP_TO_DATE',
      'latest_private_date', v_private_latest,
      'latest_small_group_date', v_sg_latest,
      'latest_collective_date', v_collective_latest,
      'target_horizon_date', v_target_end_date,
      'missing_weeks_generated', 0,
      'message', 'Le planning couvre déjà l''horizon cible.'
    );

  END IF;

  IF v_missing_weeks > 0 THEN

    v_remaining_weeks := v_missing_weeks;
    v_chunk_monday := v_next_monday;

    WHILE v_remaining_weeks > 0 LOOP

      v_chunk_weeks := LEAST(v_remaining_weeks, 13);

      v_last_gen_result :=
        public.generate_recurring_schedule(
          v_chunk_monday,
          v_chunk_weeks
        );

      v_batches_count := v_batches_count + 1;
      v_remaining_weeks := v_remaining_weeks - v_chunk_weeks;

      v_chunk_monday :=
        (v_chunk_monday + (v_chunk_weeks * 7))::DATE;

    END LOOP;

  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'EXTENDED',
    'previous_reference_date', v_reference_latest,
    'generated_from_monday', v_next_monday,
    'missing_weeks_generated', v_missing_weeks,
    'batches_executed', v_batches_count,
    'target_horizon_date', v_target_end_date
  );

END;
$$;

REVOKE ALL
ON FUNCTION public.maintain_schedule_horizon(INT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.maintain_schedule_horizon(INT)
TO service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;
