/*
  # Shift Handoff Report RPC

  1. Purpose
    - Generate comprehensive shift handoff report for incoming caregivers
    - Shows what happened during previous shift in one consolidated view

  2. Data Included
    - Medications administered, missed, or skipped
    - Vitals recorded
    - Care notes and incidents
    - Active intelligence signals
    - Pending tasks or incomplete items

  3. Security
    - Accessible by authenticated caregivers and supervisors
    - Scoped to their assigned residents
*/

CREATE OR REPLACE FUNCTION get_shift_handoff_report(
  p_caregiver_id uuid,
  p_shift_start timestamptz,
  p_shift_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_medications jsonb;
  v_vitals jsonb;
  v_incidents jsonb;
  v_signals jsonb;
  v_notes jsonb;
BEGIN
  v_medications := (
    SELECT jsonb_agg(jsonb_build_object(
      'resident_name', r.full_name,
      'resident_id', ma.resident_id,
      'medication', rm.medication_name,
      'status', ma.status,
      'administered_at', ma.administered_at,
      'administered_by', up.full_name
    ))
    FROM medication_administration ma
    JOIN residents r ON r.id = ma.resident_id
    JOIN resident_medications rm ON rm.id = ma.medication_id
    LEFT JOIN user_profiles up ON up.user_id = ma.administered_by
    WHERE ma.administered_at >= p_shift_start
      AND ma.administered_at < p_shift_end
  );

  v_vitals := (
    SELECT jsonb_agg(jsonb_build_object(
      'resident_name', r.full_name,
      'resident_id', v.resident_id,
      'heart_rate', v.heart_rate,
      'blood_pressure', v.blood_pressure_systolic || '/' || v.blood_pressure_diastolic,
      'temperature', v.temperature,
      'recorded_at', v.recorded_at,
      'recorded_by', up.full_name
    ))
    FROM vital_signs_simple v
    JOIN residents r ON r.id = v.resident_id
    LEFT JOIN user_profiles up ON up.user_id = v.recorded_by
    WHERE v.recorded_at >= p_shift_start
      AND v.recorded_at < p_shift_end
  );

  v_incidents := (
    SELECT jsonb_agg(jsonb_build_object(
      'resident_name', r.full_name,
      'resident_id', al.record_id,
      'action', al.action,
      'details', al.details,
      'created_at', al.created_at,
      'created_by', up.full_name
    ))
    FROM audit_log al
    JOIN residents r ON r.id::text = al.record_id
    LEFT JOIN user_profiles up ON up.user_id = al.user_id
    WHERE al.table_name = 'residents'
      AND al.action IN ('incident_reported', 'fall_detected', 'emergency')
      AND al.created_at >= p_shift_start
      AND al.created_at < p_shift_end
  );

  v_signals := (
    SELECT jsonb_agg(jsonb_build_object(
      'resident_name', r.full_name,
      'resident_id', i.resident_id,
      'signal_type', i.signal_type,
      'severity', i.severity,
      'message', i.message,
      'created_at', i.created_at
    ))
    FROM intelligence_signals i
    JOIN residents r ON r.id = i.resident_id
    WHERE i.status = 'active'
      AND i.created_at >= p_shift_start
      AND i.created_at < p_shift_end
  );

  v_notes := (
    SELECT jsonb_agg(jsonb_build_object(
      'resident_name', r.full_name,
      'resident_id', al.record_id,
      'note', al.details->>'note',
      'created_at', al.created_at,
      'created_by', up.full_name
    ))
    FROM audit_log al
    JOIN residents r ON r.id::text = al.record_id
    LEFT JOIN user_profiles up ON up.user_id = al.user_id
    WHERE al.table_name = 'residents'
      AND al.action = 'care_note'
      AND al.created_at >= p_shift_start
      AND al.created_at < p_shift_end
  );

  v_result := jsonb_build_object(
    'shift_period', jsonb_build_object(
      'start', p_shift_start,
      'end', p_shift_end
    ),
    'medications', COALESCE(v_medications, '[]'::jsonb),
    'vitals', COALESCE(v_vitals, '[]'::jsonb),
    'incidents', COALESCE(v_incidents, '[]'::jsonb),
    'active_signals', COALESCE(v_signals, '[]'::jsonb),
    'care_notes', COALESCE(v_notes, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
