/*
  # Disable observation trigger temporarily for Step 3 verifier
*/

DROP TRIGGER IF EXISTS trigger_brain_compute_on_observation ON observation_events;
