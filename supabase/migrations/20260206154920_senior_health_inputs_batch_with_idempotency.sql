/*
  # Senior Health Inputs Batch Submission with Idempotency

  ## Purpose
  Allow seniors to submit multiple health metrics in a single transaction.
  Supports blood pressure, weight, pain level, symptoms, and notes.
  
  ## Features
  - Idempotency protection (prevent duplicate submissions)
  - is_simulation parameter (showcase mode compatibility)
  - Batch submission (all metrics in one call)
  - Validation and error handling
  - Returns detailed status

  ## Usage
  Called from SeniorHealthInputsPage when senior submits health data form
*/

-- Create idempotency table for health input submissions
CREATE TABLE IF NOT EXISTS health_input_idempotency (
  idempotency_key text PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  submission_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_input_idempotency_created 
ON health_input_idempotency(created_at);

ALTER TABLE health_input_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own health input idempotency records"
  ON health_input_idempotency FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT resident_id FROM senior_resident_links WHERE senior_user_id = auth.uid()
    )
  );

-- Senior submit health inputs RPC
CREATE OR REPLACE FUNCTION senior_submit_health_inputs(
  p_resident_id uuid,
  p_systolic numeric DEFAULT NULL,
  p_diastolic numeric DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_pain_level integer DEFAULT NULL,
  p_symptoms jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vitals_created integer DEFAULT 0;
  v_bp_id uuid;
  v_weight_id uuid;
  v_pain_id uuid;
  v_submission_id uuid;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM health_input_idempotency
      WHERE idempotency_key = p_idempotency_key
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Health inputs already submitted (idempotent)',
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- Verify senior has access to this resident
  IF NOT EXISTS (
    SELECT 1 FROM senior_resident_links
    WHERE senior_user_id = auth.uid()
      AND resident_id = p_resident_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Senior not authorized for this resident';
  END IF;

  -- Record blood pressure if provided
  IF p_systolic IS NOT NULL AND p_diastolic IS NOT NULL THEN
    INSERT INTO vital_signs (
      resident_id,
      metric_type,
      value,
      unit,
      metadata,
      recorded_at,
      recorded_by,
      is_simulation
    ) VALUES (
      p_resident_id,
      'blood_pressure',
      p_systolic,
      'mmHg',
      jsonb_build_object('systolic', p_systolic, 'diastolic', p_diastolic),
      now(),
      auth.uid(),
      p_is_simulation
    )
    RETURNING id INTO v_bp_id;
    v_vitals_created := v_vitals_created + 1;
  END IF;

  -- Record weight if provided
  IF p_weight IS NOT NULL THEN
    INSERT INTO vital_signs (
      resident_id,
      metric_type,
      value,
      unit,
      recorded_at,
      recorded_by,
      is_simulation
    ) VALUES (
      p_resident_id,
      'weight',
      p_weight,
      'lbs',
      now(),
      auth.uid(),
      p_is_simulation
    )
    RETURNING id INTO v_weight_id;
    v_vitals_created := v_vitals_created + 1;
  END IF;

  -- Record pain level if provided
  IF p_pain_level IS NOT NULL THEN
    INSERT INTO vital_signs (
      resident_id,
      metric_type,
      value,
      unit,
      metadata,
      recorded_at,
      recorded_by,
      is_simulation
    ) VALUES (
      p_resident_id,
      'pain_level',
      p_pain_level,
      'scale_0_10',
      jsonb_build_object('pain_level', p_pain_level),
      now(),
      auth.uid(),
      p_is_simulation
    )
    RETURNING id INTO v_pain_id;
    v_vitals_created := v_vitals_created + 1;
  END IF;

  -- Record symptoms and notes if provided
  IF p_symptoms IS NOT NULL OR p_notes IS NOT NULL THEN
    INSERT INTO vital_signs (
      resident_id,
      metric_type,
      value,
      unit,
      metadata,
      recorded_at,
      recorded_by,
      is_simulation
    ) VALUES (
      p_resident_id,
      'symptoms',
      0,
      'none',
      jsonb_build_object(
        'symptoms', p_symptoms,
        'notes', p_notes
      ),
      now(),
      auth.uid(),
      p_is_simulation
    );
    v_vitals_created := v_vitals_created + 1;
  END IF;

  -- Store idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO health_input_idempotency (
      idempotency_key,
      resident_id,
      submission_data
    ) VALUES (
      p_idempotency_key,
      p_resident_id,
      jsonb_build_object(
        'systolic', p_systolic,
        'diastolic', p_diastolic,
        'weight', p_weight,
        'pain_level', p_pain_level,
        'symptoms', p_symptoms,
        'notes', p_notes,
        'vitals_created', v_vitals_created
      )
    );
  END IF;

  -- Audit log
  INSERT INTO audit_log (
    agency_id,
    action_type,
    action_description,
    user_id,
    target_id,
    metadata,
    is_simulation,
    created_at
  ) VALUES (
    (SELECT agency_id FROM residents WHERE id = p_resident_id),
    'HEALTH_INPUTS_SUBMITTED',
    'Senior submitted health inputs',
    auth.uid(),
    p_resident_id,
    jsonb_build_object(
      'vitals_created', v_vitals_created,
      'has_bp', p_systolic IS NOT NULL,
      'has_weight', p_weight IS NOT NULL,
      'has_pain', p_pain_level IS NOT NULL,
      'has_symptoms', p_symptoms IS NOT NULL
    ),
    p_is_simulation,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'vitals_created', v_vitals_created,
    'bp_id', v_bp_id,
    'weight_id', v_weight_id,
    'pain_id', v_pain_id,
    'is_duplicate', false,
    'message', format('Successfully recorded %s health measurement(s)', v_vitals_created)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION senior_submit_health_inputs TO authenticated;

COMMENT ON FUNCTION senior_submit_health_inputs IS
'Allow seniors to submit multiple health inputs in one transaction with idempotency protection.';

-- Get senior recent vitals (helper function)
CREATE OR REPLACE FUNCTION get_senior_recent_vitals(
  p_resident_id uuid,
  p_days_back integer DEFAULT 7,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_bp record;
  v_latest_weight record;
  v_latest_pain record;
  v_latest_symptoms record;
BEGIN
  -- Verify senior access
  IF NOT EXISTS (
    SELECT 1 FROM senior_resident_links
    WHERE senior_user_id = auth.uid()
      AND resident_id = p_resident_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authorized for this resident';
  END IF;

  -- Get latest blood pressure
  SELECT 
    value as systolic,
    (metadata->>'diastolic')::numeric as diastolic,
    recorded_at
  INTO v_latest_bp
  FROM vital_signs
  WHERE resident_id = p_resident_id
    AND metric_type = 'blood_pressure'
    AND is_simulation = p_is_simulation
    AND recorded_at > now() - (p_days_back || ' days')::interval
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Get latest weight
  SELECT 
    value,
    recorded_at
  INTO v_latest_weight
  FROM vital_signs
  WHERE resident_id = p_resident_id
    AND metric_type = 'weight'
    AND is_simulation = p_is_simulation
    AND recorded_at > now() - (p_days_back || ' days')::interval
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Get latest pain level
  SELECT 
    value,
    recorded_at
  INTO v_latest_pain
  FROM vital_signs
  WHERE resident_id = p_resident_id
    AND metric_type = 'pain_level'
    AND is_simulation = p_is_simulation
    AND recorded_at > now() - (p_days_back || ' days')::interval
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Get latest symptoms
  SELECT 
    metadata,
    recorded_at
  INTO v_latest_symptoms
  FROM vital_signs
  WHERE resident_id = p_resident_id
    AND metric_type = 'symptoms'
    AND is_simulation = p_is_simulation
    AND recorded_at > now() - (p_days_back || ' days')::interval
  ORDER BY recorded_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'blood_pressure', CASE 
      WHEN v_latest_bp IS NOT NULL THEN
        jsonb_build_object(
          'systolic', v_latest_bp.systolic,
          'diastolic', v_latest_bp.diastolic,
          'recorded_at', v_latest_bp.recorded_at
        )
      ELSE NULL
    END,
    'weight', CASE 
      WHEN v_latest_weight IS NOT NULL THEN
        jsonb_build_object(
          'value', v_latest_weight.value,
          'recorded_at', v_latest_weight.recorded_at
        )
      ELSE NULL
    END,
    'pain_level', CASE 
      WHEN v_latest_pain IS NOT NULL THEN
        jsonb_build_object(
          'value', v_latest_pain.value,
          'recorded_at', v_latest_pain.recorded_at
        )
      ELSE NULL
    END,
    'symptoms', CASE 
      WHEN v_latest_symptoms IS NOT NULL THEN
        jsonb_build_object(
          'data', v_latest_symptoms.metadata,
          'recorded_at', v_latest_symptoms.recorded_at
        )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_senior_recent_vitals TO authenticated;

COMMENT ON FUNCTION get_senior_recent_vitals IS
'Get seniors recent health input history for display.';
