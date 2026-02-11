/*
  # Wire Health Metrics to Trends Calculation

  1. Purpose
    - Automatically calculate health metric trends when new metrics are inserted
    - Ensures family/senior dashboards show live trends, not just seed data
    - Activates real-time health monitoring

  2. Changes
    - Create trigger function to calculate trends on INSERT
    - Wire health_metrics INSERT → calculate_health_metric_trends()
    - Enables automatic trend updates

  3. Security
    - Trigger runs with SECURITY DEFINER
    - Respects RLS policies on health_metric_trends table
    - Only calculates trends for the specific resident
*/

-- Create trigger function to calculate trends automatically
CREATE OR REPLACE FUNCTION trigger_calculate_health_trends()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate trends for this resident and metric type
  PERFORM calculate_health_metric_trends(NEW.resident_id, NEW.metric_type);
  RETURN NEW;
END;
$$;

-- Create trigger on health_metrics INSERT
DROP TRIGGER IF EXISTS auto_calculate_health_trends ON health_metrics;
CREATE TRIGGER auto_calculate_health_trends
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_health_trends();
