/*
  # Add FAMILY_OBSERVATION to observation_events event_type

  1. Purpose
    - Allow family observations to feed into brain pipeline
    - Extend event_type constraint

  2. Changes
    - Drop and recreate event_type constraint with FAMILY_OBSERVATION
*/

-- Drop existing constraint
ALTER TABLE observation_events DROP CONSTRAINT IF EXISTS observation_events_event_type_check;

-- Recreate with family_observation included
ALTER TABLE observation_events ADD CONSTRAINT observation_events_event_type_check 
  CHECK (event_type = ANY (ARRAY[
    'task_completion'::text,
    'medication_admin'::text,
    'vital_sign'::text,
    'incident'::text,
    'evidence_submission'::text,
    'caregiver_timing'::text,
    'system_event'::text,
    'care_activity'::text,
    'family_observation'::text
  ]));
