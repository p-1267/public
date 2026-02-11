/*
  # Activate Health Metrics → Trends Auto-Calculation

  1. Purpose
    - Automatically calculate health trends when new metrics arrive
    - Wire device data → trends → family/senior visibility
    - Remove dependency on manual seed-only trend calculation

  2. Implementation
    - Trigger fires AFTER INSERT on health_metrics
    - Calls calculate_health_metric_trends() for resident + metric_type
    - Ensures family/senior dashboards show live trends
*/

-- Create helper function to trigger trend calculation
CREATE OR REPLACE FUNCTION trigger_calculate_health_trends()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate trends for this specific resident + metric type
  -- This will update health_metric_trends table
  PERFORM calculate_health_metric_trends(
    p_resident_id := NEW.resident_id,
    p_metric_type := NEW.metric_type
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_calculate_health_trends ON health_metrics;

-- Create trigger on health_metrics
CREATE TRIGGER trigger_auto_calculate_health_trends
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_health_trends();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_calculate_health_trends() TO authenticated, anon;

COMMENT ON FUNCTION trigger_calculate_health_trends() IS 'Automatically calculates health trends when new metrics arrive';
