/*
  # Activate Brain Intelligence Pipeline Scheduler

  1. Purpose
    - Schedule run_brain_intelligence() to execute automatically every 5 minutes
    - Ensures brain pipeline runs continuously without manual trigger
    - Activates anomaly detection, risk scoring, and prioritized issues generation

  2. Changes
    - Schedule pg_cron job for brain intelligence
    - Job runs for all active agencies
    - Enables continuous intelligence generation

  3. Security
    - Job runs with database permissions
    - Only processes active agencies
    - Respects all existing RLS policies
*/

-- Schedule brain intelligence to run every 5 minutes
SELECT cron.schedule(
  'run-brain-intelligence-pipeline',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT run_brain_intelligence(id)
  FROM agencies
  WHERE status = 'active'
  $$
);
