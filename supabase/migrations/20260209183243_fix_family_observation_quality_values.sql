/*
  # Fix Family Observation Quality Values

  1. Issue
    - observation_quality must be 0-100, not 0-1

  2. Fix
    - Convert decimal values to percentage
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
    'family_observation',
    NEW.concern_level,
    jsonb_build_object(
      'observation_text', NEW.observation_text,
      'category', NEW.observation_category,
      'concern_level', NEW.concern_level,
      'source', 'family_input'
    ),
    CASE NEW.concern_level
      WHEN 'URGENT' THEN 90
      WHEN 'MODERATE' THEN 70
      WHEN 'MINOR' THEN 50
      ELSE 30
    END
  );

  RETURN NEW;
END;
$$;
