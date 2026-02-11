/*
  # Wire Health Metrics into Brain Intelligence
  
  ## Purpose
  Connect device health metrics to Brain anomaly detection, risk scoring,
  and intelligence signal generation. Health data must feed Brain decisions.
  
  ## RPC Functions
  
  ### Health Anomaly Detection
  - `detect_health_metric_anomalies` - Detect anomalies based on baselines
  - `assess_metric_risk_level` - Assess risk from metric values
  - `generate_health_intelligence_signals` - Create intelligence signals
  
  ### Brain Integration
  - `update_brain_from_health_metrics` - Update brain state based on metrics
  - `create_health_alert` - Create alert for critical health values
  
  ## Wiring Rules
  1. Automatic device data MUST feed Brain baselines
  2. Anomalies MUST generate intelligence signals
  3. Critical values MUST trigger Brain state transitions
  4. All health decisions MUST be auditable
  5. Low-confidence data MUST be downweighted
*/

-- Detect Health Metric Anomalies
CREATE OR REPLACE FUNCTION detect_health_metric_anomalies(
  p_resident_id uuid,
  p_metric_type text,
  p_current_value decimal
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_7day_trend record;
  v_30day_trend record;
  v_is_anomaly boolean := false;
  v_severity text := 'NORMAL';
  v_deviation_7day decimal;
  v_deviation_30day decimal;
BEGIN
  -- Get 7-day trend
  SELECT avg_value, std_deviation
  INTO v_7day_trend
  FROM health_metric_trends
  WHERE resident_id = p_resident_id
    AND metric_type = p_metric_type
    AND period = 'DAY_7';
  
  -- Get 30-day trend
  SELECT avg_value, std_deviation
  INTO v_30day_trend
  FROM health_metric_trends
  WHERE resident_id = p_resident_id
    AND metric_type = p_metric_type
    AND period = 'DAY_30';
  
  -- Calculate deviations
  IF v_7day_trend.avg_value IS NOT NULL AND v_7day_trend.std_deviation IS NOT NULL THEN
    v_deviation_7day := ABS(p_current_value - v_7day_trend.avg_value) / NULLIF(v_7day_trend.std_deviation, 0);
    
    -- Anomaly if > 2 standard deviations
    IF v_deviation_7day > 2 THEN
      v_is_anomaly := true;
      v_severity := CASE
        WHEN v_deviation_7day > 3 THEN 'CRITICAL'
        WHEN v_deviation_7day > 2.5 THEN 'HIGH'
        ELSE 'MEDIUM'
      END;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'is_anomaly', v_is_anomaly,
    'severity', v_severity,
    'deviation_7day', v_deviation_7day,
    'baseline_7day', v_7day_trend.avg_value,
    'baseline_30day', v_30day_trend.avg_value,
    'current_value', p_current_value
  );
END;
$$;

-- Assess Metric Risk Level
CREATE OR REPLACE FUNCTION assess_metric_risk_level(
  p_metric_type text,
  p_value decimal
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Critical thresholds for common metrics
  RETURN CASE p_metric_type
    -- Blood Pressure
    WHEN 'systolic' THEN
      CASE
        WHEN p_value >= 180 OR p_value < 90 THEN 'CRITICAL'
        WHEN p_value >= 140 OR p_value < 100 THEN 'HIGH'
        WHEN p_value >= 130 THEN 'MEDIUM'
        ELSE 'NORMAL'
      END
    WHEN 'diastolic' THEN
      CASE
        WHEN p_value >= 120 OR p_value < 60 THEN 'CRITICAL'
        WHEN p_value >= 90 OR p_value < 65 THEN 'HIGH'
        WHEN p_value >= 80 THEN 'MEDIUM'
        ELSE 'NORMAL'
      END
    -- Heart Rate
    WHEN 'heart_rate' THEN
      CASE
        WHEN p_value > 120 OR p_value < 40 THEN 'CRITICAL'
        WHEN p_value > 100 OR p_value < 50 THEN 'HIGH'
        WHEN p_value > 90 OR p_value < 60 THEN 'MEDIUM'
        ELSE 'NORMAL'
      END
    -- SpO2
    WHEN 'spo2' THEN
      CASE
        WHEN p_value < 90 THEN 'CRITICAL'
        WHEN p_value < 93 THEN 'HIGH'
        WHEN p_value < 95 THEN 'MEDIUM'
        ELSE 'NORMAL'
      END
    -- Respiratory Rate
    WHEN 'respiratory_rate' THEN
      CASE
        WHEN p_value > 30 OR p_value < 8 THEN 'CRITICAL'
        WHEN p_value > 25 OR p_value < 10 THEN 'HIGH'
        WHEN p_value > 20 OR p_value < 12 THEN 'MEDIUM'
        ELSE 'NORMAL'
      END
    -- Default
    ELSE 'NORMAL'
  END;
END;
$$;

-- Generate Health Intelligence Signals
CREATE OR REPLACE FUNCTION generate_health_intelligence_signals(
  p_resident_id uuid,
  p_hours_back int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric record;
  v_anomaly_result jsonb;
  v_risk_level text;
  v_signals jsonb := '[]'::jsonb;
  v_signal_count int := 0;
BEGIN
  -- Process recent metrics
  FOR v_metric IN
    SELECT DISTINCT ON (metric_type)
      metric_type,
      value_numeric,
      recorded_at,
      confidence_level,
      measurement_source,
      device_battery_level
    FROM health_metrics
    WHERE resident_id = p_resident_id
      AND recorded_at >= now() - (p_hours_back || ' hours')::interval
      AND confidence_level IN ('HIGH', 'MEDIUM')
    ORDER BY metric_type, recorded_at DESC
  LOOP
    -- Detect anomaly
    v_anomaly_result := detect_health_metric_anomalies(
      p_resident_id,
      v_metric.metric_type,
      v_metric.value_numeric
    );
    
    -- Assess absolute risk
    v_risk_level := assess_metric_risk_level(
      v_metric.metric_type,
      v_metric.value_numeric
    );
    
    -- Create signal if anomaly or high risk
    IF (v_anomaly_result->>'is_anomaly')::boolean OR v_risk_level IN ('HIGH', 'CRITICAL') THEN
      -- Insert intelligence signal
      INSERT INTO intelligence_signals (
        resident_id,
        signal_type,
        signal_category,
        severity,
        confidence,
        evidence,
        created_at
      ) VALUES (
        p_resident_id,
        'HEALTH_METRIC_ANOMALY',
        'HEALTH',
        CASE
          WHEN v_risk_level = 'CRITICAL' THEN 'CRITICAL'
          WHEN v_risk_level = 'HIGH' OR (v_anomaly_result->>'severity')::text = 'HIGH' THEN 'HIGH'
          ELSE 'MEDIUM'
        END,
        CASE v_metric.confidence_level
          WHEN 'HIGH' THEN 0.9
          WHEN 'MEDIUM' THEN 0.7
          ELSE 0.5
        END,
        jsonb_build_object(
          'metric_type', v_metric.metric_type,
          'current_value', v_metric.value_numeric,
          'baseline_7day', v_anomaly_result->'baseline_7day',
          'deviation', v_anomaly_result->'deviation_7day',
          'risk_level', v_risk_level,
          'measurement_source', v_metric.measurement_source,
          'recorded_at', v_metric.recorded_at
        ),
        now()
      );
      
      v_signal_count := v_signal_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'signals_generated', v_signal_count,
    'resident_id', p_resident_id
  );
END;
$$;

-- Update Brain State from Health Metrics
CREATE OR REPLACE FUNCTION update_brain_from_health_metrics(
  p_resident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_critical_count int;
  v_high_count int;
  v_current_brain_state text;
  v_should_escalate boolean := false;
BEGIN
  -- Count critical and high-risk signals in last 24 hours
  SELECT
    COUNT(*) FILTER (WHERE severity = 'CRITICAL'),
    COUNT(*) FILTER (WHERE severity = 'HIGH')
  INTO v_critical_count, v_high_count
  FROM intelligence_signals
  WHERE resident_id = p_resident_id
    AND signal_category = 'HEALTH'
    AND created_at >= now() - interval '24 hours';
  
  -- Determine if escalation needed
  v_should_escalate := v_critical_count > 0 OR v_high_count >= 2;
  
  -- If escalation needed, generate anomaly detection
  IF v_should_escalate THEN
    INSERT INTO anomaly_detections (
      resident_id,
      anomaly_type,
      severity,
      description,
      evidence,
      detected_at,
      requires_review
    ) VALUES (
      p_resident_id,
      'HEALTH_METRIC_DEVIATION',
      CASE WHEN v_critical_count > 0 THEN 'CRITICAL' ELSE 'HIGH' END,
      format('Health metrics show %s critical and %s high-risk deviations', v_critical_count, v_high_count),
      jsonb_build_object(
        'critical_signals', v_critical_count,
        'high_signals', v_high_count,
        'source', 'WEARABLE_DEVICE_INTEGRATION'
      ),
      now(),
      true
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'escalation_triggered', v_should_escalate,
    'critical_count', v_critical_count,
    'high_count', v_high_count
  );
END;
$$;

-- Create Health Alert
CREATE OR REPLACE FUNCTION create_health_alert(
  p_resident_id uuid,
  p_metric_type text,
  p_value decimal,
  p_severity text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  -- Create prioritized issue
  INSERT INTO prioritized_issues (
    resident_id,
    issue_type,
    priority,
    title,
    description,
    evidence,
    created_at,
    requires_immediate_action
  ) VALUES (
    p_resident_id,
    'HEALTH_ALERT',
    CASE p_severity
      WHEN 'CRITICAL' THEN 'CRITICAL'
      WHEN 'HIGH' THEN 'HIGH'
      ELSE 'MEDIUM'
    END,
    format('Health Alert: %s', p_metric_type),
    format('%s reading of %s requires attention', p_metric_type, p_value),
    jsonb_build_object(
      'metric_type', p_metric_type,
      'value', p_value,
      'severity', p_severity,
      'source', 'WEARABLE_DEVICE'
    ),
    now(),
    p_severity IN ('CRITICAL', 'HIGH')
  ) RETURNING id INTO v_alert_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'alert_id', v_alert_id
  );
END;
$$;