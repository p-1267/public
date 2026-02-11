/*
  # WP2: Backend Exception Enforcement

  Adds server-side validation to prevent quick-tap completion of exception cases.
  
  1. Changes
    - Create exception_values lookup table
    - Add validation function to check if value is exception
    - Modify quick_tap_complete_task to reject exceptions without evidence
    
  2. Security
    - RLS policies for exception_values (read-only for authenticated users)
    
  CRITICAL: This enforces exception-only documentation at the RPC level,
  not just UI level. Cannot be bypassed by calling RPC directly.
*/

-- Exception values lookup table
CREATE TABLE IF NOT EXISTS exception_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_category text NOT NULL,
  exception_value text NOT NULL,
  requires_evidence boolean DEFAULT true,
  requires_documentation boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_category, exception_value)
);

-- Enable RLS
ALTER TABLE exception_values ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for validation)
CREATE POLICY "All users can read exception values"
  ON exception_values FOR SELECT
  TO authenticated
  USING (true);

-- Seed exception values
INSERT INTO exception_values (task_category, exception_value, requires_evidence, requires_documentation)
VALUES
  ('medication', 'refused', true, true),
  ('medication', 'held', true, true),
  ('medication', 'error', true, true),
  ('meal', '0', true, true),
  ('meal', 'refused', true, true),
  ('hydration', '0oz', true, true),
  ('hydration', 'refused', true, true),
  ('vitals', 'abnormal', true, true),
  ('vitals', 'critical', true, true),
  ('adl', 'refused', true, true),
  ('adl', 'unable', true, true)
ON CONFLICT (task_category, exception_value) DO NOTHING;

-- Validation function: Check if value is an exception
CREATE OR REPLACE FUNCTION is_exception_value(
  p_task_category text,
  p_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM exception_values
    WHERE task_category = p_task_category
    AND exception_value = p_value
  );
END;
$$;

-- Replace quick_tap_complete_task with backend validation
CREATE OR REPLACE FUNCTION quick_tap_complete_task(
  p_task_id uuid,
  p_outcome text DEFAULT 'success',
  p_quick_value text DEFAULT NULL,
  p_tap_count integer DEFAULT 1,
  p_completion_seconds numeric DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_task_record record;
  v_telemetry_id uuid;
  v_task_category text;
  v_is_exception boolean;
BEGIN
  -- Get task and verify ownership
  SELECT t.*, up.agency_id, tc.name as category_name INTO v_task_record
  FROM tasks t
  JOIN user_profiles up ON up.id = auth.uid()
  LEFT JOIN task_categories tc ON tc.id = t.category_id
  WHERE t.id = p_task_id
  AND t.owner_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not assigned to you';
  END IF;

  v_agency_id := v_task_record.agency_id;
  v_task_category := COALESCE(v_task_record.category_name, 'unknown');

  -- BACKEND VALIDATION: Check if value is an exception
  IF p_quick_value IS NOT NULL THEN
    v_is_exception := is_exception_value(v_task_category, p_quick_value);
    
    IF v_is_exception THEN
      -- REJECT: Exception values cannot use quick-tap
      RAISE EXCEPTION 'EXCEPTION_REQUIRES_FULL_DOCUMENTATION: Value "%" for category "%" requires full documentation and evidence. Use exception workflow instead.',
        p_quick_value, v_task_category;
    END IF;
  END IF;

  -- Update task state to completed
  UPDATE tasks
  SET 
    state = 'completed',
    actual_end = now(),
    evidence_submitted = true,
    completed_by = auth.uid()
  WHERE id = p_task_id;

  -- Record telemetry
  INSERT INTO task_completion_telemetry (
    task_id,
    user_id,
    agency_id,
    completion_method,
    tap_count,
    character_count,
    completion_seconds,
    was_exception,
    evidence_count
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_agency_id,
    'quick_tap',
    p_tap_count,
    0,
    p_completion_seconds,
    false,
    0
  ) RETURNING id INTO v_telemetry_id;

  -- If quick_value provided, store as evidence
  IF p_quick_value IS NOT NULL THEN
    INSERT INTO task_evidence (
      task_id,
      evidence_type,
      evidence_data,
      captured_by,
      captured_at
    ) VALUES (
      p_task_id,
      'quick_value',
      jsonb_build_object('value', p_quick_value, 'method', 'quick_tap'),
      auth.uid(),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'telemetry_id', v_telemetry_id,
    'completion_method', 'quick_tap'
  );
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_exception_values_lookup ON exception_values(task_category, exception_value);
