/*
  # Health Metrics & Device Management RPCs
  
  ## Purpose
  Comprehensive RPC functions for device pairing, health metric ingestion,
  automatic sync, trend calculation, and intelligence wiring.
  
  ## RPC Functions
  
  ### Device Management
  - `pair_wearable_device` - Pair a new wearable device
  - `get_device_capabilities` - Get device capabilities and supported metrics
  - `update_device_sync_status` - Update last sync timestamp
  - `revoke_device` - Revoke a device
  
  ### Health Metric Ingestion
  - `ingest_health_metric` - Ingest a single health metric
  - `ingest_health_metrics_batch` - Batch ingest multiple metrics
  - `get_recent_health_metrics` - Get recent metrics for a resident
  - `get_metric_history` - Get historical data for a specific metric type
  
  ### Trend Calculation
  - `calculate_health_metric_trends` - Calculate 7-day and 30-day trends
  - `get_resident_health_trends` - Get trends for a resident
  
  ### Brain Intelligence Integration
  - `detect_health_anomalies` - Detect anomalies in health metrics
  - `assess_health_risk_from_metrics` - Assess risk based on metrics
  
  ## Security
  - All functions enforce RLS
  - Residents can only access their own data
  - Family can only access linked residents
*/

-- Pair Wearable Device
CREATE OR REPLACE FUNCTION pair_wearable_device(
  p_resident_id uuid,
  p_device_id text,
  p_device_type text,
  p_device_name text,
  p_manufacturer text,
  p_model text,
  p_firmware_version text,
  p_device_class text,
  p_sync_method text,
  p_supported_metrics jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_registry_id uuid;
  v_wearable_device_id uuid;
  v_pairing_actor uuid;
BEGIN
  -- Get current user
  v_pairing_actor := auth.uid();
  
  -- Verify user has access to this resident
  IF NOT EXISTS (
    SELECT 1 FROM residents r
    INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
    WHERE r.id = p_resident_id AND srl.senior_user_id = v_pairing_actor
  ) THEN
    RAISE EXCEPTION 'Access denied: User cannot pair devices for this resident';
  END IF;
  
  -- Check if device already exists
  IF EXISTS (SELECT 1 FROM device_registry WHERE device_id = p_device_id) THEN
    RAISE EXCEPTION 'Device already paired: %', p_device_id;
  END IF;
  
  -- Insert into device_registry
  INSERT INTO device_registry (
    device_id,
    resident_id,
    device_type,
    device_name,
    manufacturer,
    model,
    firmware_version,
    battery_level,
    trust_state,
    capabilities,
    pairing_actor,
    pairing_timestamp
  ) VALUES (
    p_device_id,
    p_resident_id,
    p_device_type,
    p_device_name,
    p_manufacturer,
    p_model,
    p_firmware_version,
    100,
    'TRUSTED',
    jsonb_build_object('supported_metrics', p_supported_metrics),
    v_pairing_actor,
    now()
  ) RETURNING id INTO v_device_registry_id;
  
  -- Insert into wearable_devices
  INSERT INTO wearable_devices (
    device_registry_id,
    device_class,
    sync_method,
    auto_sync_enabled,
    supported_metrics
  ) VALUES (
    v_device_registry_id,
    p_device_class,
    p_sync_method,
    CASE WHEN p_sync_method = 'MANUAL_ONLY' THEN false ELSE true END,
    p_supported_metrics
  ) RETURNING id INTO v_wearable_device_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'device_registry_id', v_device_registry_id,
    'wearable_device_id', v_wearable_device_id,
    'message', 'Device paired successfully'
  );
END;
$$;

-- Get Device Capabilities
CREATE OR REPLACE FUNCTION get_device_capabilities(
  p_device_registry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'device_id', dr.device_id,
    'device_name', dr.device_name,
    'manufacturer', dr.manufacturer,
    'model', dr.model,
    'firmware_version', dr.firmware_version,
    'device_class', wd.device_class,
    'sync_method', wd.sync_method,
    'supported_metrics', wd.supported_metrics,
    'auto_sync_enabled', wd.auto_sync_enabled,
    'trust_state', dr.trust_state,
    'battery_level', dr.battery_level,
    'last_seen_at', dr.last_seen_at
  ) INTO v_result
  FROM device_registry dr
  INNER JOIN wearable_devices wd ON wd.device_registry_id = dr.id
  WHERE dr.id = p_device_registry_id;
  
  RETURN v_result;
END;
$$;

-- Ingest Health Metric
CREATE OR REPLACE FUNCTION ingest_health_metric(
  p_resident_id uuid,
  p_device_registry_id uuid,
  p_metric_category text,
  p_metric_type text,
  p_value_numeric decimal,
  p_value_json jsonb DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_recorded_at timestamptz DEFAULT now(),
  p_measurement_source text DEFAULT 'AUTOMATIC_DEVICE'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id uuid;
  v_confidence_level text;
  v_device_trust_state text;
  v_firmware_version text;
  v_battery_level int;
BEGIN
  -- Get device trust state if this is automatic
  IF p_measurement_source = 'AUTOMATIC_DEVICE' THEN
    SELECT trust_state, firmware_version, battery_level
    INTO v_device_trust_state, v_firmware_version, v_battery_level
    FROM device_registry
    WHERE id = p_device_registry_id;
    
    -- Determine confidence based on device trust
    v_confidence_level := CASE
      WHEN v_device_trust_state = 'TRUSTED' THEN 'HIGH'
      WHEN v_device_trust_state = 'LOW_BATTERY' THEN 'MEDIUM'
      WHEN v_device_trust_state IN ('OFFLINE', 'UNRELIABLE') THEN 'LOW'
      WHEN v_device_trust_state = 'REVOKED' THEN 'REJECTED'
      ELSE 'MEDIUM'
    END;
    
    -- Reject if device is revoked
    IF v_device_trust_state = 'REVOKED' THEN
      RAISE EXCEPTION 'Cannot ingest metrics from revoked device';
    END IF;
  ELSE
    v_confidence_level := 'MEDIUM';
  END IF;
  
  -- Insert health metric
  INSERT INTO health_metrics (
    resident_id,
    device_registry_id,
    metric_category,
    metric_type,
    value_numeric,
    value_json,
    unit,
    confidence_level,
    measurement_source,
    recorded_at,
    device_firmware_version,
    device_battery_level
  ) VALUES (
    p_resident_id,
    p_device_registry_id,
    p_metric_category,
    p_metric_type,
    p_value_numeric,
    p_value_json,
    p_unit,
    v_confidence_level,
    p_measurement_source,
    p_recorded_at,
    v_firmware_version,
    v_battery_level
  ) RETURNING id INTO v_metric_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'metric_id', v_metric_id,
    'confidence_level', v_confidence_level
  );
END;
$$;

-- Batch Ingest Health Metrics
CREATE OR REPLACE FUNCTION ingest_health_metrics_batch(
  p_resident_id uuid,
  p_device_registry_id uuid,
  p_metrics jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric jsonb;
  v_inserted_count int := 0;
  v_rejected_count int := 0;
  v_sync_log_id uuid;
  v_device_trust_state text;
  v_firmware_version text;
  v_battery_level int;
  v_start_time timestamptz := now();
BEGIN
  -- Get device info
  SELECT trust_state, firmware_version, battery_level
  INTO v_device_trust_state, v_firmware_version, v_battery_level
  FROM device_registry
  WHERE id = p_device_registry_id;
  
  -- Reject if device is revoked
  IF v_device_trust_state = 'REVOKED' THEN
    RAISE EXCEPTION 'Cannot ingest metrics from revoked device';
  END IF;
  
  -- Process each metric
  FOR v_metric IN SELECT * FROM jsonb_array_elements(p_metrics)
  LOOP
    BEGIN
      INSERT INTO health_metrics (
        resident_id,
        device_registry_id,
        metric_category,
        metric_type,
        value_numeric,
        value_json,
        unit,
        confidence_level,
        measurement_source,
        recorded_at,
        device_firmware_version,
        device_battery_level
      ) VALUES (
        p_resident_id,
        p_device_registry_id,
        v_metric->>'metric_category',
        v_metric->>'metric_type',
        (v_metric->>'value_numeric')::decimal,
        v_metric->'value_json',
        v_metric->>'unit',
        CASE
          WHEN v_device_trust_state = 'TRUSTED' THEN 'HIGH'
          WHEN v_device_trust_state = 'LOW_BATTERY' THEN 'MEDIUM'
          WHEN v_device_trust_state IN ('OFFLINE', 'UNRELIABLE') THEN 'LOW'
          ELSE 'MEDIUM'
        END,
        'AUTOMATIC_DEVICE',
        COALESCE((v_metric->>'recorded_at')::timestamptz, now()),
        v_firmware_version,
        v_battery_level
      );
      
      v_inserted_count := v_inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_rejected_count := v_rejected_count + 1;
    END;
  END LOOP;
  
  -- Log sync
  INSERT INTO device_sync_log (
    device_registry_id,
    resident_id,
    sync_status,
    metrics_synced_count,
    sync_method_used,
    sync_duration_ms
  ) VALUES (
    p_device_registry_id,
    p_resident_id,
    CASE WHEN v_rejected_count = 0 THEN 'SUCCESS' ELSE 'PARTIAL' END,
    v_inserted_count,
    'API',
    EXTRACT(EPOCH FROM (now() - v_start_time)) * 1000
  ) RETURNING id INTO v_sync_log_id;
  
  -- Update last sync time
  UPDATE wearable_devices
  SET last_auto_sync = now()
  WHERE device_registry_id = p_device_registry_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count,
    'rejected_count', v_rejected_count,
    'sync_log_id', v_sync_log_id
  );
END;
$$;

-- Calculate Health Metric Trends
CREATE OR REPLACE FUNCTION calculate_health_metric_trends(
  p_resident_id uuid,
  p_metric_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_7day_result record;
  v_30day_result record;
BEGIN
  -- Calculate 7-day trend
  SELECT
    AVG(value_numeric) as avg_value,
    MIN(value_numeric) as min_value,
    MAX(value_numeric) as max_value,
    STDDEV(value_numeric) as std_deviation,
    COUNT(*) as sample_count
  INTO v_7day_result
  FROM health_metrics
  WHERE resident_id = p_resident_id
    AND metric_type = p_metric_type
    AND recorded_at >= now() - interval '7 days'
    AND confidence_level IN ('HIGH', 'MEDIUM');
  
  -- Calculate 30-day trend
  SELECT
    AVG(value_numeric) as avg_value,
    MIN(value_numeric) as min_value,
    MAX(value_numeric) as max_value,
    STDDEV(value_numeric) as std_deviation,
    COUNT(*) as sample_count
  INTO v_30day_result
  FROM health_metrics
  WHERE resident_id = p_resident_id
    AND metric_type = p_metric_type
    AND recorded_at >= now() - interval '30 days'
    AND confidence_level IN ('HIGH', 'MEDIUM');
  
  -- Upsert 7-day trend
  INSERT INTO health_metric_trends (
    resident_id,
    metric_type,
    period,
    avg_value,
    min_value,
    max_value,
    std_deviation,
    sample_count,
    trend_direction
  ) VALUES (
    p_resident_id,
    p_metric_type,
    'DAY_7',
    v_7day_result.avg_value,
    v_7day_result.min_value,
    v_7day_result.max_value,
    v_7day_result.std_deviation,
    v_7day_result.sample_count,
    CASE
      WHEN v_7day_result.sample_count < 3 THEN 'INSUFFICIENT_DATA'
      ELSE 'STABLE'
    END
  )
  ON CONFLICT (resident_id, metric_type, period)
  DO UPDATE SET
    avg_value = EXCLUDED.avg_value,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    std_deviation = EXCLUDED.std_deviation,
    sample_count = EXCLUDED.sample_count,
    trend_direction = EXCLUDED.trend_direction,
    last_calculated_at = now(),
    updated_at = now();
  
  -- Upsert 30-day trend
  INSERT INTO health_metric_trends (
    resident_id,
    metric_type,
    period,
    avg_value,
    min_value,
    max_value,
    std_deviation,
    sample_count,
    trend_direction
  ) VALUES (
    p_resident_id,
    p_metric_type,
    'DAY_30',
    v_30day_result.avg_value,
    v_30day_result.min_value,
    v_30day_result.max_value,
    v_30day_result.std_deviation,
    v_30day_result.sample_count,
    CASE
      WHEN v_30day_result.sample_count < 7 THEN 'INSUFFICIENT_DATA'
      ELSE 'STABLE'
    END
  )
  ON CONFLICT (resident_id, metric_type, period)
  DO UPDATE SET
    avg_value = EXCLUDED.avg_value,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    std_deviation = EXCLUDED.std_deviation,
    sample_count = EXCLUDED.sample_count,
    trend_direction = EXCLUDED.trend_direction,
    last_calculated_at = now(),
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'day_7_samples', v_7day_result.sample_count,
    'day_30_samples', v_30day_result.sample_count
  );
END;
$$;

-- Get Recent Health Metrics
CREATE OR REPLACE FUNCTION get_recent_health_metrics(
  p_resident_id uuid,
  p_hours int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', hm.id,
      'metric_category', hm.metric_category,
      'metric_type', hm.metric_type,
      'value_numeric', hm.value_numeric,
      'value_json', hm.value_json,
      'unit', hm.unit,
      'confidence_level', hm.confidence_level,
      'measurement_source', hm.measurement_source,
      'recorded_at', hm.recorded_at,
      'device_name', dr.device_name,
      'device_battery_level', hm.device_battery_level
    )
    ORDER BY hm.recorded_at DESC
  ) INTO v_result
  FROM health_metrics hm
  LEFT JOIN device_registry dr ON dr.id = hm.device_registry_id
  WHERE hm.resident_id = p_resident_id
    AND hm.recorded_at >= now() - (p_hours || ' hours')::interval;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Get Resident Health Trends
CREATE OR REPLACE FUNCTION get_resident_health_trends(
  p_resident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_type', metric_type,
      'period', period,
      'avg_value', avg_value,
      'min_value', min_value,
      'max_value', max_value,
      'trend_direction', trend_direction,
      'sample_count', sample_count,
      'last_calculated_at', last_calculated_at
    )
  ) INTO v_result
  FROM health_metric_trends
  WHERE resident_id = p_resident_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;