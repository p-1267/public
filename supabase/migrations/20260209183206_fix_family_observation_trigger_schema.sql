/*
  # Fix Family Observation Trigger Schema

  1. Issue
    - Trigger uses wrong column names for observation_events
    - evidence_quality_score should be observation_quality
    - requires_review column doesn't exist

  2. Fix
    - Use correct observation_events schema
*/

CREATE OR REPLACE FUNCTION trigger_family_observation_to_brain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM residents
  WHERE id = NEW.resident_id;

  -- Create observation event for brain pipeline
  INSERT INTO observation_events (
    resident_id,
    agency_id,
    caregiver_id,
    event_timestamp,
    event_type,
    event_subtype,
    event_data,
    observation_quality
  ) VALUES (
    NEW.resident_id,
    v_agency_id,
    NEW.family_user_id,
    NEW.submitted_at,
    'FAMILY_OBSERVATION',
    NEW.concern_level,
    jsonb_build_object(
      'observation_text', NEW.observation_text,
      'category', NEW.observation_category,
      'concern_level', NEW.concern_level,
      'source', 'family_input'
    ),
    CASE NEW.concern_level
      WHEN 'URGENT' THEN 0.9
      WHEN 'MODERATE' THEN 0.7
      WHEN 'MINOR' THEN 0.5
      ELSE 0.3
    END
  );

  RETURN NEW;
END;
$$;
