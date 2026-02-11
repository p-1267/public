/*
  # Activate Brain Intelligence Pipeline Scheduler

  1. Purpose
    - Schedule automatic execution of run_brain_intelligence()
    - Enables continuous anomaly detection, risk scoring, issue prioritization
    - Activates dormant brain infrastructure

  2. Implementation
    - pg_cron job every 5 minutes for all active agencies
    - Ensures brain pipeline processes new observation_events automatically
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create helper function to run brain for all active agencies
CREATE OR REPLACE FUNCTION run_brain_for_all_agencies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency RECORD;
BEGIN
  FOR v_agency IN
    SELECT id FROM agencies WHERE status = 'active'
  LOOP
    PERFORM run_brain_intelligence(v_agency.id);
  END LOOP;
END;
$$;

-- Schedule brain intelligence pipeline
-- Runs every 5 minutes
SELECT cron.schedule(
  'run-brain-intelligence-pipeline',
  '*/5 * * * *',
  'SELECT run_brain_for_all_agencies();'
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_brain_for_all_agencies() TO authenticated, anon;

COMMENT ON FUNCTION run_brain_for_all_agencies() IS 'Runs brain intelligence pipeline for all active agencies (scheduled every 5 minutes)';
