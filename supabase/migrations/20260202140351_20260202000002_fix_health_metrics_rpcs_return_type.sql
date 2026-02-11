/*
  # Fix Health Metrics RPC Return Types
  
  ## Purpose
  Fix `get_recent_health_metrics` and `get_resident_health_trends` to return
  proper table rows instead of jsonb, so the UI can consume them correctly.
  
  ## Changes
  - Drop and recreate `get_recent_health_metrics` to return TABLE
  - Drop and recreate `get_resident_health_trends` to return TABLE
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_recent_health_metrics(uuid, int);
DROP FUNCTION IF EXISTS get_resident_health_trends(uuid);

-- Recreate Get Recent Health Metrics to return TABLE
CREATE OR REPLACE FUNCTION get_recent_health_metrics(
  p_resident_id uuid,
  p_hours int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  metric_category text,
  metric_type text,
  value_numeric decimal,
  value_json jsonb,
  unit text,
  confidence_level text,
  measurement_source text,
  recorded_at timestamptz,
  device_name text,
  device_battery_level int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.id,
    hm.metric_category,
    hm.metric_type,
    hm.value_numeric,
    hm.value_json,
    hm.unit,
    hm.confidence_level,
    hm.measurement_source,
    hm.recorded_at,
    dr.device_name,
    hm.device_battery_level
  FROM health_metrics hm
  LEFT JOIN device_registry dr ON dr.id = hm.device_registry_id
  WHERE hm.resident_id = p_resident_id
    AND hm.recorded_at >= now() - (p_hours || ' hours')::interval
  ORDER BY hm.recorded_at DESC;
END;
$$;

-- Recreate Get Resident Health Trends to return TABLE
CREATE OR REPLACE FUNCTION get_resident_health_trends(
  p_resident_id uuid
)
RETURNS TABLE (
  metric_type text,
  period text,
  avg_value decimal,
  min_value decimal,
  max_value decimal,
  trend_direction text,
  sample_count int,
  last_calculated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hmt.metric_type,
    hmt.period,
    hmt.avg_value,
    hmt.min_value,
    hmt.max_value,
    hmt.trend_direction,
    hmt.sample_count,
    hmt.last_calculated_at
  FROM health_metric_trends hmt
  WHERE hmt.resident_id = p_resident_id
  ORDER BY hmt.metric_type, hmt.period;
END;
$$;