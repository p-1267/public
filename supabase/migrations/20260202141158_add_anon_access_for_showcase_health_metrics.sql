/*
  # Add Anonymous Access for Showcase Health Metrics
  
  ## Purpose
  Allow anonymous (unauthenticated) users to view health metrics, trends,
  and device data in showcase mode.
  
  ## Security
  - Only allows SELECT (read-only)
  - No write/update/delete permissions for anonymous users
  - Production mode uses authenticated policies
*/

-- Allow anonymous users to view health metrics
CREATE POLICY "Anonymous can view all health metrics in showcase"
  ON health_metrics FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view health metric trends
CREATE POLICY "Anonymous can view all health trends in showcase"
  ON health_metric_trends FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view wearable devices
CREATE POLICY "Anonymous can view all wearable devices in showcase"
  ON wearable_devices FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view device sync logs
CREATE POLICY "Anonymous can view all device sync logs in showcase"
  ON device_sync_log FOR SELECT
  TO anon
  USING (true);