/*
  # AI Input Submission Function

  1. Purpose
    - Provide secure function for AI to submit observational inputs
    - Validate input types are observational only
    - NO state mutation - observations are stored for human review

  2. New Functions
    - `submit_ai_observation(input_type, payload, source, context)` - Submit AI observation

  3. Input Types (Observational Only)
    - PATTERN_OBSERVATION: Detected usage patterns
    - COMFORT_SUGGESTION: Suggested comfort adjustments
    - EFFICIENCY_INSIGHT: Energy efficiency observations
    - ANOMALY_DETECTION: Unusual pattern detection
    - SCHEDULE_RECOMMENDATION: Suggested schedule changes

  4. Security
    - Function validates input type is allowed
    - No execution capability - observations only
    - All inputs require human acknowledgment
*/

-- Create enum for allowed AI input types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_input_type') THEN
    CREATE TYPE ai_input_type AS ENUM (
      'PATTERN_OBSERVATION',
      'COMFORT_SUGGESTION',
      'EFFICIENCY_INSIGHT',
      'ANOMALY_DETECTION',
      'SCHEDULE_RECOMMENDATION'
    );
  END IF;
END $$;

-- Add constraint to ai_learning_inputs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_ai_input_type'
    AND table_name = 'ai_learning_inputs'
  ) THEN
    ALTER TABLE ai_learning_inputs
    ADD CONSTRAINT valid_ai_input_type 
    CHECK (input_type IN (
      'PATTERN_OBSERVATION',
      'COMFORT_SUGGESTION',
      'EFFICIENCY_INSIGHT',
      'ANOMALY_DETECTION',
      'SCHEDULE_RECOMMENDATION'
    ));
  END IF;
END $$;

-- Function to submit AI observations
CREATE OR REPLACE FUNCTION submit_ai_observation(
  p_input_type text,
  p_payload jsonb,
  p_source text DEFAULT 'ai_engine',
  p_context jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_input_id uuid;
  v_allowed_types text[] := ARRAY[
    'PATTERN_OBSERVATION',
    'COMFORT_SUGGESTION',
    'EFFICIENCY_INSIGHT',
    'ANOMALY_DETECTION',
    'SCHEDULE_RECOMMENDATION'
  ];
BEGIN
  -- Validate input type is observational only
  IF NOT (p_input_type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Invalid AI input type: %. AI inputs must be observational only.', p_input_type;
  END IF;
  
  -- Validate payload is not empty
  IF p_payload IS NULL OR p_payload = '{}'::jsonb THEN
    RAISE EXCEPTION 'AI observation payload cannot be empty';
  END IF;
  
  -- Insert the observation (NOT executed, stored for review)
  INSERT INTO ai_learning_inputs (
    input_type,
    payload,
    source,
    context
  ) VALUES (
    p_input_type,
    p_payload,
    p_source,
    p_context
  )
  RETURNING id INTO v_input_id;
  
  RETURN v_input_id;
END;
$$;

COMMENT ON FUNCTION submit_ai_observation IS 
'Submit an AI observation for human review. AI inputs are OBSERVATIONAL ONLY and require explicit human acknowledgment before any action is taken.';