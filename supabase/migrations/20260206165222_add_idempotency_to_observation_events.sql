/*
  # Add Idempotency and Simulation Support to Observation Events

  ## Purpose
  Fix concurrency-safe idempotency for care log submissions
  
  ## Changes
  1. Add idempotency_key column with UNIQUE constraint (not JSON lookup)
  2. Add is_simulation column for showcase mode filtering
  3. Update submit_care_log_entry RPC to enforce idempotency
  
  ## Concurrency Safety
  - UNIQUE constraint prevents race conditions
  - Duplicate submissions return existing record ID
  - Safe for concurrent form submissions
*/

-- Add idempotency_key column with unique constraint
ALTER TABLE observation_events 
ADD COLUMN IF NOT EXISTS idempotency_key uuid,
ADD COLUMN IF NOT EXISTS is_simulation boolean DEFAULT false;

-- Create unique index for idempotency enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_observation_events_idempotency 
ON observation_events(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Update the RPC to support idempotency
CREATE OR REPLACE FUNCTION submit_care_log_entry(
  p_agency_id uuid,
  p_resident_id uuid,
  p_caregiver_id uuid,
  p_activity_type text,
  p_activity_time timestamptz,
  p_care_provided text,
  p_resident_response text DEFAULT NULL,
  p_resident_mood text DEFAULT NULL,
  p_skin_condition text DEFAULT NULL,
  p_mobility text DEFAULT NULL,
  p_appetite text DEFAULT NULL,
  p_fluid_intake text DEFAULT NULL,
  p_has_concern boolean DEFAULT false,
  p_concern_priority text DEFAULT 'routine',
  p_concern_description text DEFAULT NULL,
  p_voice_transcript_id uuid DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_observation_id uuid;
  v_observation_record record;
  v_existing_id uuid;
BEGIN
  -- Check for duplicate submission using idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM observation_events
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'observation_id', v_existing_id,
        'message', 'Duplicate submission detected - idempotency key already used'
      );
    END IF;
  END IF;

  -- Validate agency access
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_caregiver_id
      AND agency_id = p_agency_id
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Caregiver not authorized for this agency';
  END IF;

  -- Validate resident belongs to agency
  IF NOT EXISTS (
    SELECT 1 FROM residents
    WHERE id = p_resident_id
      AND agency_id = p_agency_id
  ) THEN
    RAISE EXCEPTION 'INVALID_RESIDENT: Resident not found in agency';
  END IF;

  -- Create observation event with idempotency key
  INSERT INTO observation_events (
    agency_id,
    event_type,
    event_subtype,
    resident_id,
    caregiver_id,
    event_timestamp,
    event_data,
    observation_quality,
    source_table,
    idempotency_key,
    is_simulation
  ) VALUES (
    p_agency_id,
    'task_completion',
    p_activity_type,
    p_resident_id,
    p_caregiver_id,
    p_activity_time,
    jsonb_build_object(
      'care_provided', p_care_provided,
      'resident_response', p_resident_response,
      'resident_mood', p_resident_mood,
      'observations', jsonb_build_object(
        'skin_condition', p_skin_condition,
        'mobility', p_mobility,
        'appetite', p_appetite,
        'fluid_intake', p_fluid_intake
      ),
      'concern', jsonb_build_object(
        'has_concern', p_has_concern,
        'priority', p_concern_priority,
        'description', p_concern_description
      ),
      'voice_transcript_id', p_voice_transcript_id
    ),
    CASE
      WHEN p_voice_transcript_id IS NOT NULL THEN 95
      WHEN p_care_provided IS NOT NULL AND length(p_care_provided) > 20 THEN 90
      ELSE 80
    END,
    'care_log_entry',
    p_idempotency_key,
    p_is_simulation
  )
  RETURNING * INTO v_observation_record;

  v_observation_id := v_observation_record.id;

  -- If concern flagged, create supervisor review
  IF p_has_concern AND p_concern_priority IN ('monitor', 'urgent') THEN
    INSERT INTO supervisor_reviews (
      agency_id,
      resident_id,
      reviewed_by,
      review_type,
      review_data,
      status,
      severity,
      is_simulation,
      created_at
    ) VALUES (
      p_agency_id,
      p_resident_id,
      p_caregiver_id,
      'concern',
      jsonb_build_object(
        'activity_type', p_activity_type,
        'concern', p_concern_description,
        'observation_id', v_observation_id
      ),
      'pending',
      CASE p_concern_priority
        WHEN 'urgent' THEN 'high'
        WHEN 'monitor' THEN 'medium'
        ELSE 'low'
      END,
      p_is_simulation,
      now()
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
    p_agency_id,
    'CARE_LOG_SUBMITTED',
    'Care log entry submitted for ' || p_activity_type,
    p_caregiver_id,
    p_resident_id,
    jsonb_build_object(
      'observation_id', v_observation_id,
      'has_concern', p_has_concern,
      'concern_priority', p_concern_priority,
      'idempotency_key', p_idempotency_key
    ),
    p_is_simulation,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'observation_id', v_observation_id,
    'concern_created', p_has_concern,
    'message', 'Care log entry submitted successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_care_log_entry TO authenticated, anon;

COMMENT ON FUNCTION submit_care_log_entry IS
'Submit care log entry with idempotency protection. Returns duplicate:true if idempotency key already used.';
