/*
  # Create Missing Triggers for Full App Wiring
  
  Creates all missing triggers identified in wiring audit:
  - health_metrics_to_trends: Auto-calculate health trends from metrics
  - health_metrics_to_observations: Convert health metrics to observation events
  - task_to_observation: Convert task completions to observation events
  - observation_to_brain: Trigger brain intelligence computation
*/

-- ============================================================================
-- HEALTH METRICS TO TRENDS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_health_metrics_to_trends()
RETURNS TRIGGER AS $$
DECLARE
  v_baseline NUMERIC;
  v_recent_avg NUMERIC;
  v_trend TEXT;
BEGIN
  -- Calculate baseline (last 30 days average)
  SELECT AVG(metric_value) INTO v_baseline
  FROM health_metrics
  WHERE resident_id = NEW.resident_id
    AND metric_name = NEW.metric_name
    AND recorded_at >= NOW() - INTERVAL '30 days'
    AND recorded_at < NEW.recorded_at;

  -- Calculate recent average (last 7 days)
  SELECT AVG(metric_value) INTO v_recent_avg
  FROM health_metrics
  WHERE resident_id = NEW.resident_id
    AND metric_name = NEW.metric_name
    AND recorded_at >= NOW() - INTERVAL '7 days';

  -- Determine trend
  IF v_baseline IS NOT NULL AND v_recent_avg IS NOT NULL THEN
    IF v_recent_avg > v_baseline * 1.1 THEN
      v_trend := 'INCREASING';
    ELSIF v_recent_avg < v_baseline * 0.9 THEN
      v_trend := 'DECREASING';
    ELSE
      v_trend := 'STABLE';
    END IF;

    -- Insert/update trend
    INSERT INTO health_metric_trends (
      resident_id,
      metric_name,
      trend_direction,
      baseline_value,
      current_value,
      calculated_at
    ) VALUES (
      NEW.resident_id,
      NEW.metric_name,
      v_trend,
      v_baseline,
      NEW.metric_value,
      NOW()
    )
    ON CONFLICT (resident_id, metric_name)
    DO UPDATE SET
      trend_direction = EXCLUDED.trend_direction,
      baseline_value = EXCLUDED.baseline_value,
      current_value = EXCLUDED.current_value,
      calculated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_metrics_to_trends ON health_metrics;
CREATE TRIGGER health_metrics_to_trends
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_health_metrics_to_trends();

-- ============================================================================
-- HEALTH METRICS TO OBSERVATIONS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_health_metrics_to_observations()
RETURNS TRIGGER AS $$
BEGIN
  -- Create observation event for significant health metrics
  IF NEW.metric_category IN ('VITAL_SIGNS', 'SYMPTOMS', 'CLINICAL_MEASUREMENTS') THEN
    INSERT INTO observation_events (
      resident_id,
      event_type,
      clinical_category,
      observation_text,
      observed_at,
      data_source,
      quality_score,
      idempotency_key
    ) VALUES (
      NEW.resident_id,
      'HEALTH_METRIC_RECORDED',
      NEW.metric_category,
      format('%s: %s %s', NEW.metric_name, NEW.metric_value, NEW.unit),
      NEW.recorded_at,
      NEW.data_source,
      NEW.confidence_level,
      NEW.idempotency_key || '_obs'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_metrics_to_observations ON health_metrics;
CREATE TRIGGER health_metrics_to_observations
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_health_metrics_to_observations();

-- ============================================================================
-- TASK TO OBSERVATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_task_to_observation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create observation when task is completed
  IF NEW.state = 'COMPLETED' AND (OLD.state IS NULL OR OLD.state != 'COMPLETED') THEN
    INSERT INTO observation_events (
      resident_id,
      event_type,
      clinical_category,
      observation_text,
      observed_at,
      observed_by,
      data_source,
      quality_score,
      idempotency_key
    ) VALUES (
      NEW.resident_id,
      CASE
        WHEN NEW.category = 'MEDICATION' THEN 'MEDICATION_ADMINISTERED'
        WHEN NEW.category = 'VITAL_MONITORING' THEN 'VITAL_SIGNS_CHECKED'
        WHEN NEW.category = 'ADL' THEN 'ADL_ASSISTANCE_PROVIDED'
        ELSE 'CARE_ACTIVITY_COMPLETED'
      END,
      CASE
        WHEN NEW.category = 'MEDICATION' THEN 'MEDICATIONS'
        WHEN NEW.category = 'VITAL_MONITORING' THEN 'VITAL_SIGNS'
        WHEN NEW.category = 'ADL' THEN 'ACTIVITIES_OF_DAILY_LIVING'
        ELSE 'GENERAL_CARE'
      END,
      format('Task completed: %s. %s', NEW.title, COALESCE(NEW.completion_notes, '')),
      NEW.completed_at,
      NEW.assigned_to,
      'TASK_ENGINE',
      CASE
        WHEN NEW.evidence_submitted THEN 95
        ELSE 75
      END,
      'task_' || NEW.id::TEXT
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_to_observation ON tasks;
CREATE TRIGGER task_to_observation
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_to_observation();

-- ============================================================================
-- OBSERVATION TO BRAIN TRIGGER (Async via notification)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_observation_to_brain()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule brain intelligence computation (placeholder - would trigger background job)
  -- For now, just ensure the observation is properly indexed
  
  -- Notify listeners that new observation is available for processing
  PERFORM pg_notify(
    'new_observation',
    json_build_object(
      'resident_id', NEW.resident_id,
      'observation_id', NEW.id,
      'event_type', NEW.event_type,
      'clinical_category', NEW.clinical_category
    )::TEXT
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS observation_to_brain ON observation_events;
CREATE TRIGGER observation_to_brain
  AFTER INSERT ON observation_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_observation_to_brain();
