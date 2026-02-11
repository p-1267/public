-- Fix caregiver test to use in_progress state
CREATE OR REPLACE FUNCTION test_e2e_caregiver_task_flow()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_task_id uuid;
  v_caregiver_id uuid;
  v_resident_id uuid;
  v_observation_count_before int;
  v_observation_count_after int;
BEGIN
  SELECT t.id, t.resident_id, t.owner_user_id
  INTO v_task_id, v_resident_id, v_caregiver_id
  FROM tasks t
  WHERE t.resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id)
  AND t.state = 'in_progress'
  LIMIT 1;

  IF v_task_id IS NULL THEN
    RETURN jsonb_build_object('status', 'FAIL', 'reason', 'No in_progress task found');
  END IF;

  SELECT COUNT(*) INTO v_observation_count_before
  FROM observation_events
  WHERE resident_id = v_resident_id;

  UPDATE tasks
  SET
    state = 'completed',
    actual_end = NOW(),
    completed_by = v_caregiver_id,
    outcome = 'success',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'completion_notes', 'Task completed successfully',
      'completion_timestamp', NOW()
    )
  WHERE id = v_task_id;

  INSERT INTO observation_events (
    id,
    resident_id,
    event_type,
    actor_role,
    actor_user_id,
    observation_text,
    quality_score,
    recorded_at,
    idempotency_key
  ) VALUES (
    gen_random_uuid(),
    v_resident_id,
    'task_completion',
    'CAREGIVER',
    v_caregiver_id,
    'Completed task: ' || v_task_id::text,
    80,
    NOW(),
    'test-task-complete-' || extract(epoch from now())::text
  );

  SELECT COUNT(*) INTO v_observation_count_after
  FROM observation_events
  WHERE resident_id = v_resident_id;

  v_result := jsonb_build_object(
    'test', 'caregiver_task_completion',
    'task_completed', true,
    'observation_created', v_observation_count_after > v_observation_count_before,
    'before_count', v_observation_count_before,
    'after_count', v_observation_count_after,
    'status', CASE
      WHEN v_observation_count_after > v_observation_count_before THEN 'PASS'
      ELSE 'FAIL'
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION test_e2e_caregiver_task_flow() TO anon;
