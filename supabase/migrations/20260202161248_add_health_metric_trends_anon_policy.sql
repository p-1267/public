/*
  # Add Anonymous Access for Health Metric Trends

  ## Purpose
  Allow anonymous users to read health metric trends in showcase mode.
  The health dashboard needs access to both health_metrics and health_metric_trends.

  ## Changes
  - Add SELECT policy for health_metric_trends table for anon users
  - Add SELECT policy for device_sync_log for anon users
*/

-- Health Metric Trends
DROP POLICY IF EXISTS "anon_can_read_health_metric_trends_showcase" ON health_metric_trends;
CREATE POLICY "anon_can_read_health_metric_trends_showcase"
  ON health_metric_trends FOR SELECT TO anon USING (true);

-- Device Sync Log
DROP POLICY IF EXISTS "anon_can_read_device_sync_log_showcase" ON device_sync_log;
CREATE POLICY "anon_can_read_device_sync_log_showcase"
  ON device_sync_log FOR SELECT TO anon USING (true);
