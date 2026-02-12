/*
  # Create Seed Default Wrapper

  Creates helper function that:
  - Gets or creates active care context
  - Seeds it
  - Returns summary
*/

CREATE OR REPLACE FUNCTION seed_default_for_resident(p_resident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context_id uuid;
  v_seed_result jsonb;
  v_verification_result jsonb;
  v_fail_count INTEGER;
BEGIN
  -- Get or create active care context
  SELECT id INTO v_context_id FROM care_contexts WHERE resident_id = p_resident_id AND is_active = true;
  
  IF v_context_id IS NULL THEN
    v_context_id := create_default_care_context(p_resident_id);
  END IF;

  -- Seed the context
  v_seed_result := seed_active_context(v_context_id);

  -- Verify coverage
  SELECT COUNT(*) INTO v_fail_count 
  FROM verify_seed_coverage(v_context_id) 
  WHERE status = 'FAIL';

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'resident_id', p_resident_id,
    'care_context_id', v_context_id,
    'seed_result', v_seed_result,
    'verification', jsonb_build_object(
      'fail_count', v_fail_count,
      'status', CASE WHEN v_fail_count = 0 THEN 'ALL_PASS' ELSE 'HAS_FAILURES' END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_default_for_resident(uuid) TO authenticated, anon;