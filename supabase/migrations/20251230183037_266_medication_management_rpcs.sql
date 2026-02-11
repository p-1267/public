/*
  # Medication Management RPCs (Phase 2)

  1. Core Functions
    - log_medication_administration: Log taken/skipped/late
    - check_medication_interactions: Check drug-drug interactions
    - detect_missed_doses: Auto-detect and create incidents
    - get_resident_medication_schedule: Get today's schedule
*/

CREATE OR REPLACE FUNCTION log_medication_administration(
  p_resident_id uuid,
  p_medication_id uuid,
  p_schedule_id uuid,
  p_status text,
  p_dosage_given text,
  p_route_used text,
  p_reason_for_skip text DEFAULT NULL,
  p_resident_response text DEFAULT NULL,
  p_side_effects_observed text DEFAULT NULL,
  p_verified_by uuid DEFAULT NULL,
  p_language_context text DEFAULT 'en'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_log_id uuid;
  v_is_controlled boolean;
  v_dual_required boolean;
  v_scheduled_time timestamptz;
  v_administered_at timestamptz;
  v_time_diff_minutes integer;
  v_is_late boolean DEFAULT false;
BEGIN
  v_administered_at := now();
  
  SELECT is_controlled INTO v_is_controlled
  FROM resident_medications
  WHERE id = p_medication_id;

  v_dual_required := v_is_controlled;

  IF p_schedule_id IS NOT NULL THEN
    SELECT expected_at INTO v_scheduled_time
    FROM medication_schedules
    WHERE id = p_schedule_id;

    v_time_diff_minutes := EXTRACT(EPOCH FROM (v_administered_at - v_scheduled_time)) / 60;

    IF v_time_diff_minutes > 30 THEN
      v_is_late := true;
    END IF;
  END IF;

  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    scheduled_time,
    administered_at,
    administered_by,
    verified_by,
    status,
    dosage_given,
    route_used,
    reason_for_skip,
    resident_response,
    side_effects_observed,
    is_controlled,
    dual_verification_required,
    dual_verification_completed,
    language_context
  ) VALUES (
    p_resident_id,
    p_medication_id,
    v_scheduled_time,
    v_administered_at,
    auth.uid(),
    p_verified_by,
    CASE 
      WHEN v_is_late THEN 'LATE'
      ELSE p_status
    END,
    p_dosage_given,
    p_route_used,
    p_reason_for_skip,
    p_resident_response,
    p_side_effects_observed,
    v_is_controlled,
    v_dual_required,
    (v_dual_required AND p_verified_by IS NOT NULL),
    p_language_context
  ) RETURNING id INTO v_log_id;

  IF p_schedule_id IS NOT NULL THEN
    UPDATE medication_schedules
    SET status = 'COMPLETED',
        completed_at = v_administered_at,
        administration_log_id = v_log_id,
        updated_at = now()
    WHERE id = p_schedule_id;
  END IF;

  IF v_is_late THEN
    INSERT INTO medication_incidents (
      resident_id,
      medication_id,
      schedule_id,
      administration_log_id,
      incident_type,
      severity,
      description,
      auto_generated,
      reported_by,
      supervisor_notified_at
    ) VALUES (
      p_resident_id,
      p_medication_id,
      p_schedule_id,
      v_log_id,
      'LATE_ADMINISTRATION',
      'MEDIUM',
      format('Medication administered %s minutes late (threshold: 30 minutes)', v_time_diff_minutes),
      true,
      auth.uid(),
      now()
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'is_late', v_is_late,
    'time_diff_minutes', v_time_diff_minutes
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION check_medication_interactions(
  p_resident_id uuid,
  p_medication_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_interactions jsonb[] DEFAULT ARRAY[]::jsonb[];
  v_interaction_record record;
  v_has_blocking_interaction boolean DEFAULT false;
BEGIN
  FOR v_interaction_record IN
    SELECT 
      mi.interaction_type,
      mi.interaction_description,
      mi.recommendation,
      mi.requires_block,
      CASE 
        WHEN mi.medication_a_name = p_medication_name THEN mi.medication_b_name
        ELSE mi.medication_a_name
      END as conflicting_medication
    FROM medication_interactions mi
    WHERE (mi.medication_a_name = p_medication_name OR mi.medication_b_name = p_medication_name)
      AND EXISTS (
        SELECT 1 FROM resident_medications rm
        WHERE rm.resident_id = p_resident_id
          AND rm.is_active = true
          AND (rm.medication_name = mi.medication_a_name OR rm.medication_name = mi.medication_b_name)
          AND rm.medication_name != p_medication_name
      )
  LOOP
    v_interactions := array_append(v_interactions, jsonb_build_object(
      'interaction_type', v_interaction_record.interaction_type,
      'description', v_interaction_record.interaction_description,
      'recommendation', v_interaction_record.recommendation,
      'requires_block', v_interaction_record.requires_block,
      'conflicting_medication', v_interaction_record.conflicting_medication
    ));

    IF v_interaction_record.requires_block THEN
      v_has_blocking_interaction := true;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'has_interactions', (array_length(v_interactions, 1) > 0),
    'has_blocking_interaction', v_has_blocking_interaction,
    'interactions', to_jsonb(v_interactions)
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION detect_missed_doses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missed_record record;
BEGIN
  FOR v_missed_record IN
    SELECT 
      ms.id as schedule_id,
      ms.resident_id,
      ms.medication_id,
      ms.expected_at,
      rm.medication_name
    FROM medication_schedules ms
    JOIN resident_medications rm ON rm.id = ms.medication_id
    WHERE ms.status = 'PENDING'
      AND ms.expected_at + interval '30 minutes' < now()
  LOOP
    UPDATE medication_schedules
    SET status = 'MISSED',
        updated_at = now()
    WHERE id = v_missed_record.schedule_id;

    INSERT INTO medication_incidents (
      resident_id,
      medication_id,
      schedule_id,
      incident_type,
      severity,
      description,
      auto_generated,
      reported_by,
      supervisor_notified_at
    ) VALUES (
      v_missed_record.resident_id,
      v_missed_record.medication_id,
      v_missed_record.schedule_id,
      'MISSED_DOSE',
      'HIGH',
      format('Missed dose: %s was not administered within 30-minute window (expected at %s)', 
             v_missed_record.medication_name, 
             v_missed_record.expected_at),
      true,
      (SELECT id FROM user_profiles WHERE role_name = 'SYSTEM' LIMIT 1),
      now()
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_resident_medication_schedule(
  p_resident_id uuid,
  p_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_schedules jsonb[] DEFAULT ARRAY[]::jsonb[];
  v_schedule_record record;
BEGIN
  FOR v_schedule_record IN
    SELECT 
      ms.id,
      ms.scheduled_time,
      ms.expected_at,
      ms.status,
      ms.completed_at,
      rm.medication_name,
      rm.dosage,
      rm.route,
      rm.is_controlled,
      rm.is_prn,
      rm.special_instructions
    FROM medication_schedules ms
    JOIN resident_medications rm ON rm.id = ms.medication_id
    WHERE ms.resident_id = p_resident_id
      AND ms.scheduled_date = p_date
    ORDER BY ms.expected_at
  LOOP
    v_schedules := array_append(v_schedules, jsonb_build_object(
      'id', v_schedule_record.id,
      'scheduled_time', v_schedule_record.scheduled_time,
      'expected_at', v_schedule_record.expected_at,
      'status', v_schedule_record.status,
      'completed_at', v_schedule_record.completed_at,
      'medication_name', v_schedule_record.medication_name,
      'dosage', v_schedule_record.dosage,
      'route', v_schedule_record.route,
      'is_controlled', v_schedule_record.is_controlled,
      'is_prn', v_schedule_record.is_prn,
      'special_instructions', v_schedule_record.special_instructions
    ));
  END LOOP;

  v_result := jsonb_build_object(
    'date', p_date,
    'schedules', to_jsonb(v_schedules)
  );

  RETURN v_result;
END;
$$;
