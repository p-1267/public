/*
  # Activate Observation Events → Brain Compute Trigger

  1. Purpose
    - Automatically trigger brain intelligence when observations accumulate
    - Reduce latency between event occurrence and intelligence generation
    - Complement scheduled brain runs with event-driven processing

  2. Implementation
    - Trigger fires AFTER INSERT on observation_events
    - Batch processes when 5+ unprocessed events exist
    - Calls run_brain_intelligence() for the agency
*/

-- Create function to trigger brain processing
CREATE OR REPLACE FUNCTION trigger_brain_compute_on_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unprocessed_count int;
BEGIN
  -- Count unprocessed observation events for this agency
  SELECT COUNT(*) INTO v_unprocessed_count
  FROM observation_events
  WHERE agency_id = NEW.agency_id
    AND processed_at IS NULL
    AND created_at > now() - interval '1 hour';

  -- If 5+ unprocessed events, trigger brain compute
  -- This reduces latency for high-activity periods
  IF v_unprocessed_count >= 5 THEN
    PERFORM run_brain_intelligence(NEW.agency_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_observation_to_brain ON observation_events;

-- Create trigger
CREATE TRIGGER trigger_observation_to_brain
  AFTER INSERT ON observation_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_brain_compute_on_observation();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_brain_compute_on_observation() TO authenticated, anon;

COMMENT ON FUNCTION trigger_brain_compute_on_observation() IS 'Triggers brain intelligence processing when observations accumulate';
