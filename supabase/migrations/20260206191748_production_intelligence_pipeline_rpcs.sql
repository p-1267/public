/*
  # Production Intelligence Pipeline RPCs

  ## Purpose
  Create production-ready RPCs that the test will use.
  NO test-specific logic - these are actual production code paths.

  ## RPCs
  1. create_intelligence_signal() - Brain creates signals from anomalies
  2. submit_ai_feedback() - User provides feedback on signals
  3. Test uses these same RPCs that production would use
*/

-- ============================================================
-- Production RPC: Create Intelligence Signal
-- This is what the Brain/AI engine would call when detecting anomalies
-- ============================================================

CREATE OR REPLACE FUNCTION create_intelligence_signal(
  p_signal_id text,
  p_category text,
  p_severity text,
  p_resident_id uuid,
  p_agency_id uuid,
  p_title text,
  p_description text,
  p_reasoning text,
  p_suggested_actions text[],
  p_data_source text[],
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_id uuid;
BEGIN
  -- Insert intelligence signal
  INSERT INTO intelligence_signals (
    signal_id,
    category,
    severity,
    resident_id,
    agency_id,
    title,
    description,
    reasoning,
    detected_at,
    requires_human_action,
    suggested_actions,
    data_source,
    is_simulation
  ) VALUES (
    p_signal_id,
    p_category,
    p_severity,
    p_resident_id,
    p_agency_id,
    p_title,
    p_description,
    p_reasoning,
    now(),
    (p_severity IN ('HIGH', 'CRITICAL', 'URGENT')),
    p_suggested_actions,
    p_data_source,
    p_is_simulation
  )
  RETURNING id INTO v_signal_id;

  -- Trigger will automatically create notifications if severity is HIGH/CRITICAL/URGENT

  RETURN jsonb_build_object(
    'success', true,
    'signal_id', v_signal_id,
    'notification_triggered', (p_severity IN ('HIGH', 'CRITICAL', 'URGENT'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_intelligence_signal(text, text, text, uuid, uuid, text, text, text, text[], text[], boolean) TO authenticated, anon;

-- ============================================================
-- Production RPC: Submit AI Feedback (with simulation support)
-- This is what users call to provide feedback on signals
-- ============================================================

CREATE OR REPLACE FUNCTION submit_ai_feedback(
  p_feedback_type text,
  p_feedback_data jsonb,
  p_user_id uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ai_input_id uuid;
BEGIN
  -- Use provided user_id for simulation, otherwise auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_USER_ID',
      'message', 'User ID required for feedback submission'
    );
  END IF;

  -- Insert AI learning input
  INSERT INTO ai_learning_inputs (
    input_type,
    input_data,
    source_user_id,
    acknowledged,
    is_simulation
  ) VALUES (
    p_feedback_type,
    p_feedback_data,
    v_user_id,
    false,
    p_is_simulation
  )
  RETURNING id INTO v_ai_input_id;

  RETURN jsonb_build_object(
    'success', true,
    'ai_input_id', v_ai_input_id,
    'message', 'Feedback submitted successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_ai_feedback(text, jsonb, uuid, boolean) TO authenticated, anon;

COMMENT ON FUNCTION create_intelligence_signal IS
'Production RPC: Brain/AI engine calls this to create intelligence signals. Triggers automatically send notifications for HIGH+ severity.';

COMMENT ON FUNCTION submit_ai_feedback IS
'Production RPC: Users call this to provide feedback on signals and system behavior. Feeds AI learning loop.';
