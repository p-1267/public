/*
  # Create Unified Signal Facts View (Simplified)
  
  Creates resident_signal_facts view for correlation engine
*/

CREATE OR REPLACE VIEW resident_signal_facts AS
-- Medication signals (late/missed)
SELECT
  mal.id::text as signal_id,
  mal.resident_id,
  r.agency_id,
  'medication_admin' as signal_type,
  mal.status as signal_subtype,
  mal.administered_at as signal_timestamp,
  mal.administered_at as recorded_at,
  jsonb_build_object(
    'medication_id', mal.medication_id,
    'scheduled_time', mal.scheduled_time,
    'administered_at', mal.administered_at,
    'status', mal.status,
    'dosage_given', mal.dosage_given,
    'route_used', mal.route_used,
    'time_diff_minutes', EXTRACT(EPOCH FROM (mal.administered_at - mal.scheduled_time))/60
  ) as signal_data,
  CASE 
    WHEN mal.status IN ('LATE', 'MISSED') THEN 'ABNORMAL'
    ELSE 'NORMAL'
  END as abnormality_flag,
  'medication_administration_log' as source_table,
  mal.id as source_id,
  COALESCE(mal.is_simulation, false) as is_simulation
FROM medication_administration_log mal
JOIN residents r ON r.id = mal.resident_id
WHERE mal.status IN ('LATE', 'MISSED', 'REFUSED', 'HELD')

UNION ALL

-- Vital signs (abnormal vitals from vital_signs table)
SELECT
  vs.id::text,
  vs.resident_id,
  r.agency_id,
  'vital_sign' as signal_type,
  vs.vital_type as signal_subtype,
  vs.recorded_at as signal_timestamp,
  vs.recorded_at,
  jsonb_build_object(
    'vital_type', vs.vital_type,
    'value', vs.value,
    'systolic', vs.systolic,
    'diastolic', vs.diastolic,
    'notes', vs.notes
  ) as signal_data,
  CASE
    WHEN vs.vital_type = 'blood_pressure' AND vs.systolic IS NOT NULL 
      AND (vs.systolic > 140 OR vs.systolic < 90) THEN 'ABNORMAL'
    WHEN vs.vital_type = 'blood_pressure' AND vs.diastolic IS NOT NULL 
      AND (vs.diastolic > 90 OR vs.diastolic < 60) THEN 'ABNORMAL'
    WHEN vs.vital_type = 'heart_rate' AND vs.value IS NOT NULL 
      AND (vs.value::numeric < 60 OR vs.value::numeric > 100) THEN 'ABNORMAL'
    WHEN vs.vital_type = 'temperature' AND vs.value IS NOT NULL 
      AND (vs.value::numeric < 97 OR vs.value::numeric > 99.5) THEN 'ABNORMAL'
    WHEN vs.vital_type = 'oxygen_saturation' AND vs.value IS NOT NULL 
      AND vs.value::numeric < 95 THEN 'ABNORMAL'
    ELSE 'NORMAL'
  END as abnormality_flag,
  'vital_signs' as source_table,
  vs.id as source_id,
  COALESCE(vs.is_simulation, false) as is_simulation
FROM vital_signs vs
JOIN residents r ON r.id = vs.resident_id

UNION ALL

-- Family observations from observation_events
SELECT
  oe.id::text,
  oe.resident_id,
  oe.agency_id,
  'family_observation' as signal_type,
  oe.event_subtype as signal_subtype,
  oe.event_timestamp as signal_timestamp,
  oe.event_timestamp as recorded_at,
  oe.event_data as signal_data,
  CASE
    WHEN oe.event_data->>'severity' IN ('MODERATE', 'URGENT', 'CRITICAL') THEN 'ABNORMAL'
    ELSE 'NORMAL'
  END as abnormality_flag,
  'observation_events' as source_table,
  oe.id as source_id,
  COALESCE(oe.is_simulation, false) as is_simulation
FROM observation_events oe
WHERE oe.event_type = 'family_observation';

GRANT SELECT ON resident_signal_facts TO authenticated, anon;
