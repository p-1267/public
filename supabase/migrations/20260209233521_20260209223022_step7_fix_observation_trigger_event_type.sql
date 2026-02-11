/*
  # Step 7: Fix observation trigger event_type
  
  Changes:
  - Update create_observation_from_health_metric trigger to use 'vital_sign' instead of 'health_data'
*/

CREATE OR REPLACE FUNCTION create_observation_from_health_metric()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO observation_events (
    id,
    agency_id,
    event_type,
    event_subtype,
    resident_id,
    caregiver_id,
    event_timestamp,
    event_data,
    observation_quality,
    source_table,
    source_id,
    is_simulation,
    idempotency_key
  )
  VALUES (
    gen_random_uuid(),
    (SELECT agency_id FROM residents WHERE id = NEW.resident_id),
    'vital_sign',
    'metric_recorded',
    NEW.resident_id,
    NULL,
    NEW.recorded_at,
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value_numeric,
      'unit', NEW.unit,
      'source', NEW.measurement_source
    ),
    CASE NEW.confidence_level
      WHEN 'HIGH' THEN 90
      WHEN 'MEDIUM' THEN 75
      ELSE 60
    END,
    'health_metrics',
    NEW.id,
    false,
    gen_random_uuid()
  );
  
  RETURN NEW;
END;
$$;