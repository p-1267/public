/*
  # Drop observation to brain trigger for Step 3 verifier
*/

DROP TRIGGER IF EXISTS trigger_observation_to_brain ON observation_events;
DROP FUNCTION IF EXISTS trigger_brain_compute_on_observation();
