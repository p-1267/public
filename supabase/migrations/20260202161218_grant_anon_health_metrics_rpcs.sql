/*
  # Grant Anonymous Access to Health Metrics RPCs

  ## Purpose
  Allow anonymous users in showcase mode to access health metrics data
  via the get_recent_health_metrics and get_resident_health_trends RPCs.

  ## Changes
  - Grant EXECUTE on get_recent_health_metrics to anon
  - Grant EXECUTE on get_resident_health_trends to anon
  - Grant EXECUTE on seed_device_integration_showcase to anon
*/

-- Grant execute on health metrics RPCs
GRANT EXECUTE ON FUNCTION get_recent_health_metrics(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_resident_health_trends(uuid) TO anon;

-- Grant execute on device seeder (needed when seeding showcase)
GRANT EXECUTE ON FUNCTION seed_device_integration_showcase(uuid) TO anon;
